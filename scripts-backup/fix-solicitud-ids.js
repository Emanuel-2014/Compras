// fix-solicitud-ids.js
// Este script corrige los IDs de solicitud malformados directamente en la base de datos.

// Cargar la configuración de la base de datos
const db = require('./lib/db.js').default;

/**
 * Sanea un ID de solicitud que tiene un cero extra al final.
 * Ejemplo: Convierte 'JZ-0000010' en 'JZ-000001'.
 * @param {string} id El ID de la solicitud a sanear.
 * @returns {string} El ID saneado o el original si no necesita cambios.
 */
function sanitizeId(id) {
    if (!id || typeof id !== 'string') {
        return id;
    }
    const parts = id.trim().split('-');
    if (parts.length === 2 && parts[0].match(/^[A-Z]{1,2}$/)) {
        let numPartString = parts[1];
        // La condición clave: la parte numérica tiene más de 6 dígitos y termina en '0'.
        if (numPartString.length > 6 && numPartString.endsWith('0')) {
            // Elimina el último caracter (el cero extra).
            numPartString = numPartString.slice(0, -1);
            const numPart = parseInt(numPartString, 10);
            if (!isNaN(numPart)) {
                // Reconstruye el ID con el formato correcto de 6 dígitos.
                return `${parts[0]}-${String(numPart).padStart(6, '0')}`;
            }
        }
    }
    // Si no cumple las condiciones, devuelve el ID original.
    return id;
}

try {
    console.log('Iniciando la corrección de IDs de solicitudes en la base de datos...');
    
    // 1. Obtener todas las solicitudes
    const stmtSelect = db.prepare('SELECT id, solicitud_id FROM solicitudes');
    const solicitudes = stmtSelect.all();

    console.log(`Se encontraron ${solicitudes.length} solicitudes para revisar.`);

    // 2. Preparar la sentencia de actualización
    const stmtUpdate = db.prepare('UPDATE solicitudes SET solicitud_id = ? WHERE id = ?');
    
    let updatedCount = 0;

    // 3. Usar una transacción para actualizar los IDs incorrectos
    const transaction = db.transaction(() => {
        for (const sol of solicitudes) {
            const originalId = sol.solicitud_id;
            const correctedId = sanitizeId(originalId);

            // Si el ID corregido es diferente al original, actualízalo.
            if (originalId !== correctedId) {
                console.log(`Corrigiendo ID: ${originalId} -> ${correctedId}`);
                stmtUpdate.run(correctedId, sol.id);
                updatedCount++;
            }
        }
    });

    // Ejecutar la transacción
    transaction();

    if (updatedCount > 0) {
        console.log(`
¡Éxito! Se corrigieron ${updatedCount} IDs de solicitudes en la base de datos.`);
    } else {
        console.log('\nNo se encontraron IDs malformados. La base de datos parece estar correcta.');
    }

} catch (error) {
    console.error('\nOcurrió un error al intentar corregir los IDs de las solicitudes:', error);
}

console.log('Proceso de corrección finalizado.');
