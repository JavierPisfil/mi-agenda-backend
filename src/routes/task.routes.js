const express = require('express');
const router = express.Router();

// Importamos el "cerebro" (las funciones que corregimos en el controlador)
const { getTasks, createTask, updateTask, deleteTask } = require('../controllers/task.controller');

// 1. OBTENER TODAS LAS TAREAS
router.get('/tasks', getTasks);

// 2. CREAR UNA NUEVA TAREA
router.post('/tasks', createTask);

// 3. EDITAR UNA TAREA EXISTENTE
router.put('/tasks/:id', updateTask);

// 4. ELIMINAR UNA TAREA
router.delete('/tasks/:id', deleteTask);

module.exports = router;