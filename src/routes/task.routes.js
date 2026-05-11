const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');

// 1. OBTENER TODAS LAS TAREAS
router.get('/tasks', async (req, res) => {
  try {
    const pool = await getConnection();
    // En Postgres, los resultados vienen dentro de una propiedad llamada 'rows'
    const result = await pool.query('SELECT * FROM Tasks ORDER BY due_date ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener las tareas');
  }
});

// 2. CREAR UNA NUEVA TAREA
router.post('/tasks', async (req, res) => {
  const { title, description, due_date } = req.body;
  try {
    const pool = await getConnection();
    await pool.query(
      'INSERT INTO Tasks (title, description, due_date) VALUES ($1, $2, $3)', 
      [title, description, due_date]
    );
    res.json({ message: 'Tarea creada con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al crear la tarea');
  }
});

// 3. EDITAR UNA TAREA EXISTENTE
router.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, due_date } = req.body;
  try {
    const pool = await getConnection();
    await pool.query(
      'UPDATE Tasks SET title = $1, description = $2, due_date = $3 WHERE id = $4',
      [title, description, due_date, id]
    );
    res.json({ message: 'Tarea actualizada con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al actualizar la tarea');
  }
});

// 4. ELIMINAR UNA TAREA
router.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    await pool.query('DELETE FROM Tasks WHERE id = $1', [id]);
    res.json({ message: 'Tarea eliminada con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al eliminar la tarea');
  }
});

module.exports = router;