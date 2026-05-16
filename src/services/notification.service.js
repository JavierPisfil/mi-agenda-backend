const cron = require('node-cron');
const { getConnection } = require('../config/db');
const { Expo } = require('expo-server-sdk');

let expo = new Expo();

// 🚀 Ya no hay token duro (hardcodeado). Ahora lo recibimos como parámetro.
const enviarNotificacionExpo = async (tokenDestino, titulo, mensaje) => {
    if (!Expo.isExpoPushToken(tokenDestino)) {
        console.error(`❌ El formato del token ${tokenDestino} es inválido.`);
        return;
    }

    const mensajes = [{
        to: tokenDestino,
        sound: 'default',
        title: titulo,
        body: mensaje,
        channelId: 'canal-urgente', 
        data: { ruta: 'calendario' },
    }];

    try {
        let tickets = await expo.sendPushNotificationsAsync(mensajes);
        
        for (let ticket of tickets) {
            if (ticket.status === 'error') {
                console.error("❌ EXPO RECHAZÓ EL MENSAJE. Motivo:", ticket.message);
                if (ticket.details && ticket.details.error) {
                    console.error("Detalle del error:", ticket.details.error);
                }
            } else {
                console.log(`✅ [PUSH] ¡Notificación entregada al token ${tokenDestino.substring(0,10)}...!`);
            }
        }
    } catch (error) {
        console.error("❌ Error de conexión con Expo:", error);
    }
};

const startNotificationEngine = () => {
    console.log('⏰ Motor de notificaciones Inteligente inicializado (Modo Multiusuario).');

    cron.schedule('* * * * *', async () => {
        const horaPeru = new Date().toLocaleString("es-PE", { timeZone: "America/Lima" });
        console.log(`⏱️ [${horaPeru}] Buscando tareas pendientes de todos los usuarios...`);

        try {
            const pool = await getConnection();
            
            // 🧠 LÓGICA DINÁMICA: Unimos Tasks (t) con Usuarios (u)
            const result = await pool.query(`
                SELECT t.id, t.title, t.due_date, u.expo_token,
                CASE
                    WHEN date_trunc('minute', t.due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', NOW() AT TIME ZONE 'America/Lima') THEN 'vence_ahora'
                    WHEN date_trunc('minute', t.due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', (NOW() AT TIME ZONE 'America/Lima') + INTERVAL '1 hour') THEN '1_hora'
                    WHEN date_trunc('minute', t.due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', (NOW() AT TIME ZONE 'America/Lima') + INTERVAL '2 hours') THEN '2_horas'
                    WHEN date_trunc('minute', t.due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', (NOW() AT TIME ZONE 'America/Lima') + INTERVAL '3 hours') THEN '3_horas'
                    WHEN date_trunc('minute', t.due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', (NOW() AT TIME ZONE 'America/Lima') + INTERVAL '4 hours') THEN '4_horas'
                    WHEN DATE(t.due_date AT TIME ZONE 'America/Lima') = DATE((NOW() AT TIME ZONE 'America/Lima') + INTERVAL '1 day') THEN '1_dia'
                END as tipo_alerta
                FROM Tasks t
                JOIN Usuarios u ON t.usuario_id = u.id
                WHERE t.estado IS NULL 
                AND u.expo_token IS NOT NULL
                AND (
                    date_trunc('minute', t.due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', NOW() AT TIME ZONE 'America/Lima') OR
                    date_trunc('minute', t.due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', (NOW() AT TIME ZONE 'America/Lima') + INTERVAL '1 hour') OR
                    date_trunc('minute', t.due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', (NOW() AT TIME ZONE 'America/Lima') + INTERVAL '2 hours') OR
                    date_trunc('minute', t.due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', (NOW() AT TIME ZONE 'America/Lima') + INTERVAL '3 hours') OR
                    date_trunc('minute', t.due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', (NOW() AT TIME ZONE 'America/Lima') + INTERVAL '4 hours') OR
                    (DATE(t.due_date AT TIME ZONE 'America/Lima') = DATE((NOW() AT TIME ZONE 'America/Lima') + INTERVAL '1 day') AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'America/Lima')) = 8 AND EXTRACT(MINUTE FROM (NOW() AT TIME ZONE 'America/Lima')) = 0)
                )
            `);

            for (let task of result.rows) {
                let titulo_alerta = "Recordatorio de Tarea";
                if (task.tipo_alerta === 'vence_ahora') titulo_alerta = "¡LA TAREA VENCE AHORA! 🚨";
                else if (task.tipo_alerta === '1_hora') titulo_alerta = "¡Vence en 1 HORA! 🔥";
                else if (task.tipo_alerta === '2_horas') titulo_alerta = "¡Faltan 2 horas! 🚨";
                else if (task.tipo_alerta === '3_horas') titulo_alerta = "¡Faltan 3 horas! ⏳";
                else if (task.tipo_alerta === '4_horas') titulo_alerta = "¡Faltan 4 horas! ⏳";
                else if (task.tipo_alerta === '1_dia') titulo_alerta = "¡Mañana vence tu tarea! 📅";

                // 🚀 Enviamos la notificación usando el token extraído de la base de datos
                await enviarNotificacionExpo(task.expo_token, titulo_alerta, `Pendiente: ${task.title}`);
            }
        } catch (error) {
            console.error('❌ Error en el Cron:', error);
        }
    });
};

module.exports = { startNotificationEngine };