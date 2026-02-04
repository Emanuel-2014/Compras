// Importamos la librería SQLite estándar (sin cifrado).
import Database from 'better-sqlite3';
import path from 'path'; // Importamos el módulo 'path'
import fs from 'fs';

// Definimos la ruta a nuestro archivo de base de datos.
const dbPath = path.join(process.cwd(), 'database.db'); // Usamos una ruta absoluta

let db;

try {
  // Verificamos si la base de datos ya existe
  const dbExists = fs.existsSync(dbPath);

  // Creamos una única instancia de la conexión a la base de datos.
  db = new Database(dbPath);

  if (!dbExists) {
    console.log('Base de datos nueva creada.');
  } else {
    console.log('Base de datos existente conectada.');
  }

  db.pragma('journal_mode = WAL');
  console.log('Conexión a la base de datos establecida correctamente.');
} catch (error) {
  console.error("FATAL ERROR: No se pudo conectar con la base de datos en", dbPath, ":", error);
  // Si no nos podemos conectar, lanzamos un error para detener la aplicación.
  throw new Error("No se pudo establecer conexión con la base de datos.");
}

export default db;
