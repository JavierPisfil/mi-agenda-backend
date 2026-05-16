const cron = require('node-cron');
const { getConnection } = require('../config/db');
const { Expo } = require('expo-server-sdk');

let expo = new Expo();
const MI_EXPO_TOKEN = "ExponentPushToken[O2vKcqF1cEQyLToVjn-2b3]"; 
// (Nota: Revisa bien si es un 0 (cero) o una O (letra) en tu pantalla, ¡la exactitud aquí es vital!)

const enviarNotificacionExpo = async (titulo, mensaje) => {
    if (!Expo.isExpoPushToken(MI_EXPO_TOKEN)) {
        console.error("❌ El formato del token es inválido.");
        return;
    }

    const mensajes = [{
        to: MI_EXPO_TOKEN,
        sound: 'default',
        title: titulo,
        body: mensaje,
        channelId: 'canal-urgente', 
        data: { ruta: 'calendario' },
    }];

    try {
        // Expo devuelve un "arreglo de recibos" (tickets)
        let tickets = await expo.sendPushNotificationsAsync(mensajes);
        
        // Vamos a leer el recibo para ver si hubo un error silencioso
        for (let ticket of tickets) {
            if (ticket.status === 'error') {
                console.error("❌ EXPO RECHAZÓ EL MENSAJE. Motivo:", ticket.message);
                if (ticket.details && ticket.details.error) {
                    console.error("Detalle del error:", ticket.details.error);
                }
            } else {
                console.log("✅ [PUSH] ¡Notificación entregada con éxito a los servidores de Expo!");
            }
        }
    } catch (error) {
        console.error("❌ Error de conexión con Expo:", error);
    }
};

const startNotificationEngine = () => {
    console.log('⏰ Motor de notificaciones Inteligente inicializado.');

    cron.schedule('* * * * *', async () => {
        // 🫀 LATIDO: Esto imprimirá la hora de Perú cada minuto para que sepas que está vivo
        const horaPeru = new Date().toLocaleString("es-PE", { timeZone: "America/Lima" });
        console.log(`⏱️ [${horaPeru}] Buscando tareas pendientes...`);

        try {
            const pool = await getConnection();
            
            // 🧠 LÓGICA FORZADA A HORA PERUANA (America/Lima)
            const result = await pool.query(`
                SELECT id, title, due_date,
                CASE
                    WHEN date_trunc('minute', due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', NOW() AT TIME ZONE 'America/Lima') THEN 'vence_ahora'
                    WHEN date_trunc('minute', due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', (NOW() AT TIME ZONE 'America/Lima') + INTERVAL '1 hour') THEN '1_hora'
                    WHEN date_trunc('minute', due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', (NOW() AT TIME ZONE 'America/Lima') + INTERVAL '2 hours') THEN '2_horas'
                    WHEN date_trunc('minute', due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', (NOW() AT TIME ZONE 'America/Lima') + INTERVAL '3 hours') THEN '3_horas'
                    WHEN date_trunc('minute', due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', (NOW() AT TIME ZONE 'America/Lima') + INTERVAL '4 hours') THEN '4_horas'
                    WHEN DATE(due_date AT TIME ZONE 'America/Lima') = DATE((NOW() AT TIME ZONE 'America/Lima') + INTERVAL '1 day') THEN '1_dia'
                END as tipo_alerta
                FROM Tasks 
                WHERE estado IS NULL 
                AND (
                    date_trunc('minute', due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', NOW() AT TIME ZONE 'America/Lima') OR
                    date_trunc('minute', due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', (NOW() AT TIME ZONE 'America/Lima') + INTERVAL '1 hour') OR
                    date_trunc('minute', due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', (NOW() AT TIME ZONE 'America/Lima') + INTERVAL '2 hours') OR
                    date_trunc('minute', due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', (NOW() AT TIME ZONE 'America/Lima') + INTERVAL '3 hours') OR
                    date_trunc('minute', due_date AT TIME ZONE 'America/Lima') = date_trunc('minute', (NOW() AT TIME ZONE 'America/Lima') + INTERVAL '4 hours') OR
                    (DATE(due_date AT TIME ZONE 'America/Lima') = DATE((NOW() AT TIME ZONE 'America/Lima') + INTERVAL '1 day') AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'America/Lima')) = 8 AND EXTRACT(MINUTE FROM (NOW() AT TIME ZONE 'America/Lima')) = 0)
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

                await enviarNotificacionExpo(titulo_alerta, `Pendiente: ${task.title}`);
            }
        } catch (error) {
            console.error('❌ Error en el Cron:', error);
        }
    });
};

module.exports = { startNotificationEngine };