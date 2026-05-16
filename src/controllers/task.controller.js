const { getConnection } = require('../config/db');

// 1. Obtener todas las tareas
const getTasks = async (req, res) => {
    try {
        const pool = await getConnection();
        // Sintaxis PostgreSQL: result.rows en lugar de recordset
        const result = await pool.query('SELECT * FROM Tasks ORDER BY due_date ASC');
        
        res.json(result.rows); 
    } catch (error) {
        console.error('Error obteniendo tareas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// 2. Crear una tarea
const createTask = async (req, res) => {
    const { title, description, due_date } = req.body;

    if (!title || !due_date) {
        return res.status(400).json({ error: 'El título y la fecha (due_date) son obligatorios' });
    }

    try {
        const pool = await getConnection();
        
        // Sintaxis PostgreSQL: Usamos $1, $2, $3 y pasamos los valores en un arreglo
        const result = await pool.query(
            'INSERT INTO Tasks (title, description, due_date) VALUES ($1, $2, $3) RETURNING id',
            [title, description || '', due_date]
        );

        res.status(201).json({ 
            message: 'Tarea creada con éxito',
            id: result.rows[0].id 
        });
    } catch (error) {
        console.error('Error creando tarea:', error);
        res.status(500).json({ error: 'Error interno del servidor al crear la tarea' });
    }
};

// 3. Editar una tarea existente
const updateTask = async (req, res) => {
    const { id } = req.params;
    const { title, description, due_date } = req.body;

    try {
        const pool = await getConnection();
        const result = await pool.query(
            'UPDATE Tasks SET title = $1, description = $2, due_date = $3 WHERE id = $4',
            [title, description || '', due_date, id]
        );

        // En Postgres usamos rowCount para saber si se afectaron filas
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        res.json({ message: 'Tarea actualizada correctamente' });
    } catch (error) {
        console.error('Error actualizando tarea:', error);
        res.status(500).json({ error: 'Error interno al actualizar la tarea' });
    }
};

// 4. Eliminar una tarea
const deleteTask = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await getConnection();
        
        // Hacemos un borrado real para mantener tu base de datos limpia
        const result = await pool.query('DELETE FROM Tasks WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        res.json({ message: 'Tarea eliminada correctamente' });
    } catch (error) {
        console.error('Error eliminando tarea:', error);
        res.status(500).json({ error: 'Error interno al eliminar la tarea' });
    }
};

// Un solo bloque de exportación al final
module.exports = {
    getTasks,
    createTask,
    updateTask,
    deleteTask
};