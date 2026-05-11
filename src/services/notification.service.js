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
    console.log('⏰ Motor de notificaciones (PostgreSQL + Expo) inicializado.');

    // REQUERIMIENTO 1: Un día antes, cada 4 horas (Expresión Cron: 0 */4 * * *)
    cron.schedule('0 */4 * * *', async () => {
        try {
            const pool = await getConnection();
            // POSTGRESQL: Buscamos tareas donde due_date sea MAÑANA y el estado esté vacío
            const result = await pool.query(`
                SELECT id, title FROM Tasks 
                WHERE estado IS NULL 
                AND DATE(due_date) = CURRENT_DATE + INTERVAL '1 day'
            `);

            for (let task of result.rows) {
                await enviarNotificacionExpo("¡Tarea vence mañana! ⏰", `Recuerda: ${task.title}`);
            }
        } catch (error) {
            console.error('Error en Cron de 4 horas:', error);
        }
    });

    // REQUERIMIENTO 2: El mismo día, cada 1 hora (Expresión Cron: 0 * * * *)
    cron.schedule('0 * * * *', async () => {
        try {
            const pool = await getConnection();
            // POSTGRESQL: Buscamos tareas donde due_date sea HOY
            const result = await pool.query(`
                SELECT id, title FROM Tasks 
                WHERE estado IS NULL 
                AND DATE(due_date) = CURRENT_DATE
            `);

            for (let task of result.rows) {
                await enviarNotificacionExpo("¡URGENTE: Vence HOY! 🚨", `Completar: ${task.title}`);
            }
        } catch (error) {
            console.error('Error en Cron de 1 hora:', error);
        }
    });

    // CRON DE PRUEBA: Se ejecuta CADA MINUTO (* * * * *)
    cron.schedule('* * * * *', async () => {
        console.log('🔍 [TEST] El motor revisando tareas pendientes...');
        try {
            const pool = await getConnection();
            // POSTGRESQL: LIMIT 1 para traer solo una tarea de muestra
            const result = await pool.query(`
                SELECT title FROM Tasks WHERE estado IS NULL LIMIT 1
            `);
            
            if (result.rows.length > 0) {
                await enviarNotificacionExpo("🔍 Prueba de Motor", `Pendiente: "${result.rows[0].title}"`);
            }
        } catch (error) {
            console.error(error);
        }
    });
};

module.exports = { startNotificationEngine };