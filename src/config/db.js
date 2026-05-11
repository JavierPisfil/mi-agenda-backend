const { Pool } = require('pg');
require('dotenv').config();

// Creamos un Pool de conexiones hacia la nube
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Requerido por servicios en la nube como Neon
  }
});

// Probamos que la conexión funcione al arrancar
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error adquiriendo conexión de Postgres', err.stack);
  }
  console.log('☁️ Conectado exitosamente a PostgreSQL en la nube');
  release();
});

const getConnection = () => {
  return pool;
};

module.exports = { getConnection };