const cron = require('node-cron');
const { getConnection } = require('../config/db');
const { Expo } = require('expo-server-sdk');

// 1. Inicializamos el cliente de Expo
let expo = new Expo();

// ⚠️ AQUÍ PEGAREMOS TU TOKEN EXCLUSIVO
const MI_EXPO_TOKEN = "ExponentPushToken[6zXJEqGrHAF5arny-MhLmS3]";

// 2. Función maestra para disparar notificaciones al celular
const enviarNotificacionExpo = async (titulo, mensaje) => {
    if (!Expo.isExpoPushToken(MI_EXPO_TOKEN)) {
        console.error(`El token ${MI_EXPO_TOKEN} no es válido.`);
        return;
    }

    const mensajes = [{
        to: MI_EXPO_TOKEN,
        sound: 'default',
        title: titulo,
        body: mensaje,
        data: { ruta: 'calendario' }, // Datos extra ocultos
    }];

    try {
        let tickets = await expo.sendPushNotificationsAsync(mensajes);
        console.log("✅ [PUSH] Notificación enviada al celular!");
    } catch (error) {
        console.error("❌ Error enviando notificación:", error);
    }
};

const startNotificationEngine = () => {
    console.log('⏰ Motor de notificaciones Inteligente inicializado.');

    // Un solo Cron que se ejecuta cada minuto. La inteligencia está en la base de datos.
    cron.schedule('* * * * *', async () => {
        try {
            const pool = await getConnection();
            
            const result = await pool.query(`
                SELECT id, title, due_date,
                CASE
                    WHEN DATE(due_date AT TIME ZONE 'America/Lima') = DATE((NOW() AT TIME ZONE 'America/Lima') + INTERVAL '1 day') THEN '1_dia'
                    WHEN date_trunc('minute', due_date) = date_trunc('minute', NOW() + INTERVAL '4 hours') THEN '4_horas'
                    WHEN date_trunc('minute', due_date) = date_trunc('minute', NOW() + INTERVAL '3 hours') THEN '3_horas'
                    WHEN date_trunc('minute', due_date) = date_trunc('minute', NOW() + INTERVAL '2 hours') THEN '2_horas'
                    WHEN date_trunc('minute', due_date) = date_trunc('minute', NOW() + INTERVAL '1 hour') THEN '1_hora'
                END as tipo_alerta
                FROM Tasks 
                WHERE estado IS NULL 
                AND (
                    -- REGLA 1: Un día antes exactamente a las 8:00 AM (Hora de Lima/Perú)
                    (
                        DATE(due_date AT TIME ZONE 'America/Lima') = DATE((NOW() AT TIME ZONE 'America/Lima') + INTERVAL '1 day')
                        AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'America/Lima')) = 8
                        AND EXTRACT(MINUTE FROM (NOW() AT TIME ZONE 'America/Lima')) = 0
                    )
                    OR 
                    -- REGLA 2: Exactamente a las 4, 3, 2, o 1 horas antes
                    date_trunc('minute', due_date) = date_trunc('minute', NOW() + INTERVAL '4 hours') OR
                    date_trunc('minute', due_date) = date_trunc('minute', NOW() + INTERVAL '3 hours') OR
                    date_trunc('minute', due_date) = date_trunc('minute', NOW() + INTERVAL '2 hours') OR
                    date_trunc('minute', due_date) = date_trunc('minute', NOW() + INTERVAL '1 hour')
                )
            `);

            // Si encontró tareas que cumplen las reglas de tiempo exacto, las notifica
            for (let task of result.rows) {
                let titulo_alerta = "";
                
                if (task.tipo_alerta === '1_dia') titulo_alerta = "¡Mañana vence tu tarea! 📅";
                else if (task.tipo_alerta === '4_horas') titulo_alerta = "¡Faltan 4 horas! ⏳";
                else if (task.tipo_alerta === '3_horas') titulo_alerta = "¡Faltan 3 horas! ⏳";
                else if (task.tipo_alerta === '2_horas') titulo_alerta = "¡Faltan 2 horas! 🚨";
                else if (task.tipo_alerta === '1_hora') titulo_alerta = "¡Vence en 1 HORA! 🔥";

                await enviarNotificacionExpo(titulo_alerta, `Pendiente: ${task.title}`);
                console.log(`✅ Alerta de '${task.tipo_alerta}' enviada para la tarea: ${task.title}`);
            }
        } catch (error) {
            console.error('❌ Error en el Cron Inteligente:', error);
        }
    });
};

module.exports = { startNotificationEngine };