import db from './lib/db.js';

function addFirmaPathColumn() {
  try {
    db.exec("ALTER TABLE usuarios ADD COLUMN firma_path TEXT");
    console.log("Columna 'firma_path' agregada a la tabla 'usuarios'.");
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log("La columna 'firma_path' ya existe en la tabla 'usuarios'. No se realizaron cambios.");
    } else {
      console.error("Error al agregar la columna 'firma_path':", error);
    }
  }
}

addFirmaPathColumn();
