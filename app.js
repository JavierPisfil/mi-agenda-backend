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
app.use('/api', taskRoutes);

// RUTA PARA ACTUALIZAR EL ESTADO (CALIFICAR TAREA)
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

// ==========================================
// RUTA DE SEGURIDAD: SISTEMA DE LOGIN
// ==========================================
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const pool = await getConnection(); 
    
    // Buscamos si existe un registro que coincida exactamente con el email y el password
    const result = await pool.query(
      'SELECT id, email FROM Usuarios WHERE email = $1 AND password = $2', 
      [email, password]
    );
      
    // Si la consulta encontró a alguien, el login es exitoso
    if (result.rows.length > 0) {
      res.json({ success: true, message: '¡Bienvenido!', user: result.rows[0] });
    } else {
      // Si no encontró a nadie, devolvemos un error 401 (No autorizado)
      res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos' });
    }
  } catch (err) {
    console.error("Error en el login:", err);
    res.status(500).send("Hubo un error en el servidor al intentar iniciar sesión.");
  }
});


// 4. Inicialización del Servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor en línea en el puerto ${PORT}`);
  
  // ¡Aquí encendemos el motor de notificaciones!
  startNotificationEngine(); 
});