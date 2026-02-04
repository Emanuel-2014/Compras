import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'pollos.db');
const db = new Database(dbPath, { verbose: console.log });

console.log('Iniciando corrección de IDs de solicitudes con ceros extras...\n');

try {
  // Obtener todas las solicitudes
  const solicitudes = db.prepare('SELECT id, solicitud_id FROM solicitudes').all();
  
  console.log(`Encontradas ${solicitudes.length} solicitudes.\n`);
  
  let corregidas = 0;
  
  for (const solicitud of solicitudes) {
    const oldId = solicitud.solicitud_id;
    
    if (!oldId || !oldId.includes('-')) {
      console.log(`⚠️  Solicitud ID ${solicitud.id}: formato inválido "${oldId}"`);
      continue;
    }
    
    const parts = oldId.split('-');
    if (parts.length !== 2) {
      console.log(`⚠️  Solicitud ID ${solicitud.id}: formato inválido "${oldId}"`);
      continue;
    }
    
    const prefix = parts[0];
    let numPart = parts[1];
    
    // Verificar si el número termina con cero extra (ej: "0000010" debe ser "000001")
    if (numPart.length === 7 && numPart.endsWith('0')) {
      numPart = numPart.slice(0, -1); // Eliminar el último cero
      const newId = `${prefix}-${numPart}`;
      
      console.log(`🔧 Corrigiendo: ${oldId} → ${newId}`);
      
      // Actualizar en la base de datos
      db.prepare('UPDATE solicitudes SET solicitud_id = ? WHERE id = ?').run(newId, solicitud.id);
      
      // También actualizar en solicitud_aprobaciones si existe
      db.prepare('UPDATE solicitud_aprobaciones SET solicitud_id = ? WHERE solicitud_id = ?').run(newId, oldId);
      
      corregidas++;
    }
  }
  
  console.log(`\n✅ Corrección completada. ${corregidas} solicitudes corregidas.`);
  
} catch (error) {
  console.error('❌ Error durante la corrección:', error);
  process.exit(1);
} finally {
  db.close();
}
