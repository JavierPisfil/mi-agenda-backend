const express = require('express');
const router = express.Router();
const { registrarUsuario, loginUsuario } = require('../controllers/auth.controller');

// Ruta para crear una cuenta nueva
router.post('/register', registrarUsuario);

// Ruta para iniciar sesión
router.post('/login', loginUsuario);

module.exports = router;