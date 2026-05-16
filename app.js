const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 1. Importaciones de nuestros módulos (Base de datos y Servicios)
const { getConnection } = require('./src/config/db');
const { startNotificationEngine } = require('./src/services/notification.service');

const app = express();
const PORT = process.env.PORT || 3000;

// 2. Middlewares
app.use(cors());
app.use(express.json());

// 3. Rutas
const taskRoutes = require('./src/routes/task.routes');
const authRoutes = require('./src/routes/auth.routes'); 

// Usamos las rutas
app.use('/api', taskRoutes);         // Para las tareas: /api/tasks
app.use('/api/auth', authRoutes);    // Para el login/registro: /api/auth/login y /api/auth/register

// RUTA PARA ACTUALIZAR EL ESTADO (CALIFICAR TAREA)
// Nota: Más adelante podemos mover esto a task.routes para mantener este archivo súper limpio
app.put('/api/tasks/:id/status', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  
  try {
    const pool = await getConnection(); 
    
    // En Postgres pasamos la consulta y un arreglo con los valores en orden ($1 es estado, $2 es id)
    await pool.query('UPDATE Tasks SET estado = $1 WHERE id = $2', [estado, id]);
      
    res.json({ message: 'Estado de la tarea actualizado correctamente' });
  } catch (err) {
    console.error("Error al actualizar el estado:", err);
    res.status(500).send("Hubo un error en el servidor al calificar la tarea.");
  }
});

// 4. Inicialización del Servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor en línea en el puerto ${PORT}`);
  
  // ¡Aquí encendemos el motor de notificaciones!
  startNotificationEngine(); 
});