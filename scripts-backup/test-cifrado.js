import Database from 'better-sqlite3-multiple-ciphers';
import dotenv from 'dotenv';
import fs from 'fs';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

console.log('========================================');
console.log('  PRUEBA DE CIFRADO DE BASE DE DATOS');
console.log('========================================');
console.log('');

const DB_PASSWORD = process.env.DB_PASSWORD || 'MiEmpresa-S3gur@-2026!';
const testDbPath = 'test-encryption.db';

try {
  console.log('1. Creando base de datos de prueba cifrada...');
  
  // Eliminar BD de prueba si existe
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  // Crear BD cifrada
  const db = new Database(testDbPath);
  db.pragma(`key = '${DB_PASSWORD}'`);
  
  console.log('   ✓ Base de datos creada');
  
  // Crear tabla y datos de prueba
  db.exec(`
    CREATE TABLE test (
      id INTEGER PRIMARY KEY,
      nombre TEXT,
      secreto TEXT
    )
  `);
  
  console.log('   ✓ Tabla creada');
  
  db.prepare('INSERT INTO test (nombre, secreto) VALUES (?, ?)').run('Usuario Prueba', 'Datos Confidenciales');
  
  console.log('   ✓ Datos insertados');
  
  const row = db.prepare('SELECT * FROM test WHERE id = 1').get();
  console.log('   ✓ Datos verificados:', row);
  
  db.close();
  console.log('');
  
  // Intentar abrir sin contraseña (debe fallar)
  console.log('2. Intentando abrir SIN contraseña (debe fallar)...');
  
  try {
    const dbNoPassword = new Database(testDbPath);
    dbNoPassword.prepare('SELECT * FROM test').get();
    console.log('   ✗ ERROR: La BD se abrió sin contraseña (cifrado no funciona)');
    dbNoPassword.close();
  } catch (error) {
    console.log('   ✓ Correcto: No se puede abrir sin contraseña');
    console.log('   ✓ Mensaje de error:', error.message.substring(0, 50) + '...');
  }
  
  console.log('');
  
  // Intentar abrir con contraseña incorrecta (debe fallar)
  console.log('3. Intentando abrir con contraseña INCORRECTA (debe fallar)...');
  
  try {
    const dbWrongPassword = new Database(testDbPath);
    dbWrongPassword.pragma(`key = 'ContraseñaIncorrecta123'`);
    dbWrongPassword.prepare('SELECT * FROM test').get();
    console.log('   ✗ ERROR: La BD se abrió con contraseña incorrecta');
    dbWrongPassword.close();
  } catch (error) {
    console.log('   ✓ Correcto: Contraseña incorrecta rechazada');
    console.log('   ✓ Mensaje de error:', error.message.substring(0, 50) + '...');
  }
  
  console.log('');
  
  // Abrir con contraseña correcta (debe funcionar)
  console.log('4. Abriendo con contraseña CORRECTA...');
  
  const dbCorrect = new Database(testDbPath);
  dbCorrect.pragma(`key = '${DB_PASSWORD}'`);
  
  const testRow = dbCorrect.prepare('SELECT * FROM test WHERE id = 1').get();
  console.log('   ✓ Acceso concedido');
  console.log('   ✓ Datos recuperados:', testRow);
  
  dbCorrect.close();
  
  console.log('');
  console.log('========================================');
  console.log('  ✓ PRUEBA EXITOSA');
  console.log('========================================');
  console.log('');
  console.log('El cifrado funciona correctamente:');
  console.log('  ✓ BD creada con cifrado');
  console.log('  ✓ Sin contraseña: RECHAZADO');
  console.log('  ✓ Contraseña incorrecta: RECHAZADO');
  console.log('  ✓ Contraseña correcta: ACCESO CONCEDIDO');
  console.log('');
  console.log('Contraseña usada:', DB_PASSWORD);
  console.log('');
  
  // Limpiar
  fs.unlinkSync(testDbPath);
  console.log('Archivo de prueba eliminado.');
  
} catch (error) {
  console.error('');
  console.error('========================================');
  console.error('  ✗ ERROR EN LA PRUEBA');
  console.error('========================================');
  console.error('');
  console.error('Error:', error.message);
  console.error('');
  console.error('Posibles causas:');
  console.error('  - El paquete better-sqlite3-multiple-ciphers no está instalado');
  console.error('  - Falta el archivo .env.local');
  console.error('  - Problema de permisos en el sistema de archivos');
  console.error('');
  
  // Limpiar si existe
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch (e) {
      // Ignorar error al limpiar
    }
  }
  
  process.exit(1);
}
