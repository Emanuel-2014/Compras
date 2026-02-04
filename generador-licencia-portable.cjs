/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 GENERADOR DE LICENCIAS PORTABLE - POLLOS AL DÍA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Este archivo es PORTABLE y puede ejecutarse desde cualquier ubicación.
 * Perfecto para llevar en una memoria USB.
 * 
 * REQUISITOS:
 * - Node.js instalado en la computadora donde se ejecute
 * - La clave secreta JWT_SECRET (se solicita al ejecutar)
 * 
 * USO:
 * 1. Copia este archivo a tu memoria USB
 * 2. Ejecuta: node generador-licencia-portable.js
 * 3. Sigue las instrucciones en pantalla
 * 
 * NO REQUIERE:
 * - Instalación de dependencias externas
 * - Acceso al código fuente de la aplicación
 * - Archivo .env.local
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const crypto = require('crypto');
const readline = require('readline');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
  appName: 'PollosAlDiaApp',
  algoritmo: 'HS256', // Algoritmo JWT
  defaultSecret: 'P0ll0s@lD14-JWT-S3cr3t-2026!', // Clave por defecto
};

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Codifica en Base64 URL-safe
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Genera un JWT manualmente sin dependencias externas
 */
function generateJWT(payload, secret) {
  // Header
  const header = {
    alg: CONFIG.algoritmo,
    typ: 'JWT'
  };

  // Codificar header y payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  // Crear signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Construir JWT completo
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Valida el formato de fecha YYYY-MM-DD
 */
function validarFecha(fecha) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(fecha)) return false;
  
  const date = new Date(fecha);
  return date instanceof Date && !isNaN(date);
}

/**
 * Calcula fecha futura basada en días/meses/años
 */
function calcularFechaFutura(dias = 0, meses = 0, años = 0) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  fecha.setMonth(fecha.getMonth() + meses);
  fecha.setFullYear(fecha.getFullYear() + años);
  return fecha.toISOString().split('T')[0];
}

// ============================================================================
// INTERFAZ PRINCIPAL
// ============================================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n'.repeat(2));
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🔐 GENERADOR DE LICENCIAS PORTABLE - POLLOS AL DÍA');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// Paso 1: Obtener clave secreta
rl.question('🔑 Introduce la clave secreta JWT_SECRET (Enter para usar la predeterminada): ', (secret) => {
  const jwtSecret = secret.trim() || CONFIG.defaultSecret;
  
  console.log('\n📅 OPCIONES DE FECHA DE EXPIRACIÓN:');
  console.log('   1 - Ingresar fecha específica (YYYY-MM-DD)');
  console.log('   2 - Generar para 30 días');
  console.log('   3 - Generar para 90 días');
  console.log('   4 - Generar para 6 meses');
  console.log('   5 - Generar para 1 año');
  console.log('   6 - Generar para 2 años');
  console.log('');
  
  rl.question('Selecciona una opción (1-6): ', (opcion) => {
    let fechaExpiracion;
    
    switch(opcion.trim()) {
      case '1':
        // Solicitar fecha específica
        rl.question('\n📆 Introduce la fecha de expiración (YYYY-MM-DD): ', (fecha) => {
          if (!validarFecha(fecha)) {
            console.error('\n❌ Error: Formato de fecha inválido. Debe ser YYYY-MM-DD');
            rl.close();
            return;
          }
          generarLicencia(fecha, jwtSecret);
          rl.close();
        });
        return;
      
      case '2':
        fechaExpiracion = calcularFechaFutura(30, 0, 0);
        break;
      
      case '3':
        fechaExpiracion = calcularFechaFutura(90, 0, 0);
        break;
      
      case '4':
        fechaExpiracion = calcularFechaFutura(0, 6, 0);
        break;
      
      case '5':
        fechaExpiracion = calcularFechaFutura(0, 0, 1);
        break;
      
      case '6':
        fechaExpiracion = calcularFechaFutura(0, 0, 2);
        break;
      
      default:
        console.error('\n❌ Error: Opción inválida');
        rl.close();
        return;
    }
    
    generarLicencia(fechaExpiracion, jwtSecret);
    rl.close();
  });
});

/**
 * Genera y muestra la licencia
 */
function generarLicencia(fechaExpiracion, secret) {
  try {
    const payload = {
      expiresOn: fechaExpiracion,
      appName: CONFIG.appName,
      generatedAt: new Date().toISOString()
    };
    
    const licencia = generateJWT(payload, secret);
    
    // Calcular días hasta expiración
    const hoy = new Date();
    const fechaExp = new Date(fechaExpiracion);
    const diasRestantes = Math.ceil((fechaExp - hoy) / (1000 * 60 * 60 * 24));
    
    console.log('\n'.repeat(2));
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ ¡LICENCIA GENERADA CON ÉXITO!');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`📆 Fecha de expiración: ${fechaExpiracion}`);
    console.log(`⏱️  Días de validez: ${diasRestantes} días`);
    console.log('');
    console.log('───────────────────────────────────────────────────────────────────────────');
    console.log('📋 INSTRUCCIONES:');
    console.log('───────────────────────────────────────────────────────────────────────────');
    console.log('');
    console.log('1. Copia la siguiente línea COMPLETA:');
    console.log('');
    console.log('───────────────────────────────────────────────────────────────────────────');
    console.log(`LICENSE_KEY=${licencia}`);
    console.log('───────────────────────────────────────────────────────────────────────────');
    console.log('');
    console.log('2. Pégala en el archivo .env.local de la aplicación');
    console.log('   (Reemplaza la línea LICENSE_KEY existente)');
    console.log('');
    console.log('3. Reinicia la aplicación para aplicar la nueva licencia');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error al generar la licencia:', error.message);
  }
}
