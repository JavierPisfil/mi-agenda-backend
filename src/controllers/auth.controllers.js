const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/db'); 

const registrarUsuario = async (req, res) => {
    const { nombre, apellido, edad, sexo, usuario, password } = req.body;
    
    try {
        const pool = await getConnection();
        
        // 1. Verificar si el nombre de usuario ya existe
        const userExist = await pool.query('SELECT * FROM Usuarios WHERE usuario = $1', [usuario]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ mensaje: 'Este usuario ya está en uso. Elige otro.' });
        }

        // 2. Encriptar la contraseña (nadie podrá verla, ni en la base de datos)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Guardar al nuevo usuario en la base de datos
        const result = await pool.query(
            'INSERT INTO Usuarios (nombre, apellido, edad, sexo, usuario, password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nombre, apellido',
            [nombre, apellido, edad, sexo, usuario, hashedPassword]
        );

        res.status(201).json({ 
            mensaje: 'Usuario registrado exitosamente', 
            usuario: result.rows[0] 
        });
    } catch (error) {
        console.error('Error al registrar:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al registrar' });
    }
};

const loginUsuario = async (req, res) => {
    const { usuario, password } = req.body;
    
    try {
        const pool = await getConnection();
        
        // 1. Buscar si el usuario existe
        const result = await pool.query('SELECT * FROM Usuarios WHERE usuario = $1', [usuario]);
        if (result.rows.length === 0) {
            return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
        }

        const user = result.rows[0];
        
        // 2. Comparar la contraseña escrita con la encriptada en la base de datos
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
        }

        // 3. Generar el Token JWT (el "carnet" que usará el celular para entrar a la agenda)
        // Nota: En producción, este secreto debe ir en tus variables de entorno (.env)
        const token = jwt.sign(
            { id: user.id, nombre: user.nombre, usuario: user.usuario },
            process.env.JWT_SECRET || 'secreto_super_seguro_agenda_2026', 
            { expiresIn: '30d' } // El usuario no tendrá que loguearse de nuevo por 30 días
        );

        res.status(200).json({ 
            mensaje: 'Login exitoso', 
            token: token, 
            usuario: { 
                id: user.id, 
                nombre: user.nombre, 
                apellido: user.apellido,
                sexo: user.sexo
            }
        });

    } catch (error) {
        console.error('Error al hacer login:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al iniciar sesión' });
    }
};

module.exports = { registrarUsuario, loginUsuario };