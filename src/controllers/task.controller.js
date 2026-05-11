const { sql, getConnection } = require('../config/db');

const getTasks = async (req, res) => {
    try {
        const pool = await getConnection();
        // Hacemos una consulta a la tabla Tasks que creaste en SQL Server
        const result = await pool.request().query('SELECT * FROM Tasks WHERE is_deleted = 0 ORDER BY due_date ASC');
        
        res.json(result.recordset); // Devolvemos los datos en formato JSON
    } catch (error) {
        console.error('Error obteniendo tareas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// NUEVA FUNCIÓN: Crear una tarea
const createTask = async (req, res) => {
    const { title, description, due_date } = req.body;

    // 1. Validación básica
    if (!title || !due_date) {
        return res.status(400).json({ error: 'El título y la fecha (due_date) son obligatorios' });
    }

    try {
        const pool = await getConnection();
        
        // 2. Insertar en la base de datos de forma segura
        const result = await pool.request()
            .input('title', sql.NVarChar, title)
            .input('description', sql.NVarChar, description || '')
            .input('due_date', sql.DateTime, due_date)
            .query(`
                INSERT INTO Tasks (title, description, due_date)
                VALUES (@title, @description, @due_date);
                
                -- Devolvemos el ID de la tarea recién creada
                SELECT SCOPE_IDENTITY() AS id;
            `);

        // 3. Responder al cliente (el celular) que todo salió bien
        res.status(201).json({ 
            message: 'Tarea creada con éxito',
            id: result.recordset[0].id 
        });
    } catch (error) {
        console.error('Error creando tarea:', error);
        res.status(500).json({ error: 'Error interno del servidor al crear la tarea' });
    }
};

// Asegúrate de exportar ambas funciones al final del archivo
module.exports = {
    getTasks,
    createTask
};


// NUEVA FUNCIÓN: Editar una tarea existente
const updateTask = async (req, res) => {
    const { id } = req.params; // Obtenemos el ID de la URL
    const { title, description, due_date, status } = req.body;

    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('title', sql.NVarChar, title)
            .input('description', sql.NVarChar, description || '')
            .input('due_date', sql.DateTime, due_date)
            .input('status', sql.NVarChar, status || 'PENDING') // PENDING, COMPLETED o CANCELLED
            .query(`
                UPDATE Tasks 
                SET title = @title, description = @description, due_date = @due_date, status = @status
                WHERE id = @id AND is_deleted = 0;
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada o ya fue eliminada' });
        }

        res.json({ message: 'Tarea actualizada correctamente' });
    } catch (error) {
        console.error('Error actualizando tarea:', error);
        res.status(500).json({ error: 'Error interno al actualizar la tarea' });
    }
};

// NUEVA FUNCIÓN: Eliminar una tarea (Soft Delete)
const deleteTask = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                UPDATE Tasks 
                SET is_deleted = 1 
                WHERE id = @id;
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        res.json({ message: 'Tarea eliminada correctamente' });
    } catch (error) {
        console.error('Error eliminando tarea:', error);
        res.status(500).json({ error: 'Error interno al eliminar la tarea' });
    }
};

// IMPORTANTE: Asegúrate de actualizar tus exportaciones al final del archivo
module.exports = {
    getTasks,
    createTask,
    updateTask,  // <-- Agregado
    deleteTask   // <-- Agregado
};