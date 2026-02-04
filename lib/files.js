import fs from 'fs';
import path from 'path';
import db from './db.js';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// ==================== UTILIDADES ====================

/**
 * Formatear tamaño de bytes a formato legible
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Obtener todos los archivos en un directorio recursivamente
 */
function getAllFilesRecursive(dir, fileList = []) {
  try {
    if (!fs.existsSync(dir)) {
      return fileList;
    }

    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        getAllFilesRecursive(filePath, fileList);
      } else {
        fileList.push({
          path: filePath,
          relativePath: path.relative(UPLOADS_DIR, filePath),
          name: file,
          size: stat.size,
          created: stat.birthtime,
          modified: stat.mtime,
          extension: path.extname(file).toLowerCase()
        });
      }
    });

    return fileList;
  } catch (error) {
    console.error('Error al obtener archivos:', error);
    return fileList;
  }
}

// ==================== EXPLORACIÓN DE ARCHIVOS ====================

/**
 * Obtener estadísticas de almacenamiento
 */
export function getStorageStats() {
  try {
    const files = getAllFilesRecursive(UPLOADS_DIR);
    
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalFiles = files.length;
    
    // Agrupar por extensión
    const byExtension = files.reduce((acc, file) => {
      const ext = file.extension || 'sin extensión';
      if (!acc[ext]) {
        acc[ext] = { count: 0, size: 0 };
      }
      acc[ext].count++;
      acc[ext].size += file.size;
      return acc;
    }, {});

    // Top 5 extensiones por tamaño
    const topExtensions = Object.entries(byExtension)
      .map(([ext, data]) => ({ extension: ext, ...data }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);

    // Archivos más grandes
    const largestFiles = files
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .map(f => ({
        name: f.name,
        path: f.relativePath,
        size: f.size,
        sizeFormatted: formatBytes(f.size),
        modified: f.modified
      }));

    // Archivos más antiguos
    const oldestFiles = files
      .sort((a, b) => new Date(a.created) - new Date(b.created))
      .slice(0, 10)
      .map(f => ({
        name: f.name,
        path: f.relativePath,
        size: f.size,
        sizeFormatted: formatBytes(f.size),
        created: f.created
      }));

    return {
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      totalFiles,
      averageFileSize: totalFiles > 0 ? Math.round(totalSize / totalFiles) : 0,
      averageFileSizeFormatted: totalFiles > 0 ? formatBytes(Math.round(totalSize / totalFiles)) : '0 Bytes',
      byExtension,
      topExtensions,
      largestFiles,
      oldestFiles
    };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return {
      totalSize: 0,
      totalSizeFormatted: '0 Bytes',
      totalFiles: 0,
      averageFileSize: 0,
      averageFileSizeFormatted: '0 Bytes',
      byExtension: {},
      topExtensions: [],
      largestFiles: [],
      oldestFiles: []
    };
  }
}

/**
 * Listar todos los archivos en uploads
 */
export function listAllFiles(sortBy = 'name', order = 'asc') {
  try {
    let files = getAllFilesRecursive(UPLOADS_DIR);

    // Ordenar
    files.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'created':
          comparison = new Date(a.created) - new Date(b.created);
          break;
        case 'modified':
          comparison = new Date(a.modified) - new Date(b.modified);
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }

      return order === 'desc' ? -comparison : comparison;
    });

    return files.map(f => ({
      ...f,
      sizeFormatted: formatBytes(f.size)
    }));
  } catch (error) {
    console.error('Error al listar archivos:', error);
    return [];
  }
}

// ==================== DETECCIÓN DE ARCHIVOS HUÉRFANOS ====================

/**
 * Obtener archivos referenciados en la base de datos
 */
function getReferencedFiles() {
  const referenced = new Set();

  try {
    // Archivos de facturas_compras
    const facturasCompras = db.prepare('SELECT archivo_path FROM facturas_compras WHERE archivo_path IS NOT NULL').all();
    facturasCompras.forEach(f => {
      if (f.archivo_path) {
        referenced.add(path.normalize(f.archivo_path));
      }
    });

    // Archivos de solicitud_items (imágenes)
    const itemsImages = db.prepare('SELECT ruta_imagen FROM solicitud_items WHERE ruta_imagen IS NOT NULL').all();
    itemsImages.forEach(item => {
      if (item.ruta_imagen) {
        referenced.add(path.normalize(item.ruta_imagen));
      }
    });

    // Archivos de facturas
    const facturas = db.prepare('SELECT path_archivo FROM facturas WHERE path_archivo IS NOT NULL').all();
    facturas.forEach(f => {
      if (f.path_archivo) {
        referenced.add(path.normalize(f.path_archivo));
      }
    });

  } catch (error) {
    console.error('Error al obtener archivos referenciados:', error);
  }

  return referenced;
}

/**
 * Encontrar archivos huérfanos (sin referencia en BD)
 */
export function findOrphanFiles() {
  try {
    const allFiles = getAllFilesRecursive(UPLOADS_DIR);
    const referencedFiles = getReferencedFiles();
    
    const orphans = allFiles.filter(file => {
      // Normalizar rutas para comparación
      const normalizedPath = path.normalize(file.relativePath);
      const uploadsRelative = 'uploads/' + normalizedPath.replace(/\\/g, '/');
      const publicRelative = '/uploads/' + normalizedPath.replace(/\\/g, '/');
      
      return !referencedFiles.has(normalizedPath) && 
             !referencedFiles.has(uploadsRelative) &&
             !referencedFiles.has(publicRelative);
    });

    const totalOrphanSize = orphans.reduce((sum, f) => sum + f.size, 0);

    return {
      orphans: orphans.map(f => ({
        ...f,
        sizeFormatted: formatBytes(f.size)
      })),
      count: orphans.length,
      totalSize: totalOrphanSize,
      totalSizeFormatted: formatBytes(totalOrphanSize)
    };
  } catch (error) {
    console.error('Error al buscar archivos huérfanos:', error);
    return {
      orphans: [],
      count: 0,
      totalSize: 0,
      totalSizeFormatted: '0 Bytes'
    };
  }
}

// ==================== LIMPIEZA DE ARCHIVOS ====================

/**
 * Eliminar un archivo específico
 */
export function deleteFile(relativePath) {
  try {
    const fullPath = path.join(UPLOADS_DIR, relativePath);
    
    // Verificar que el archivo existe y está dentro de uploads
    if (!fullPath.startsWith(UPLOADS_DIR)) {
      return { success: false, message: 'Ruta inválida' };
    }

    if (!fs.existsSync(fullPath)) {
      return { success: false, message: 'Archivo no encontrado' };
    }

    fs.unlinkSync(fullPath);
    return { success: true, message: 'Archivo eliminado correctamente' };
  } catch (error) {
    console.error('Error al eliminar archivo:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Eliminar múltiples archivos
 */
export function deleteMultipleFiles(relativePaths) {
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  relativePaths.forEach(relativePath => {
    const result = deleteFile(relativePath);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({ path: relativePath, error: result.message });
    }
  });

  return results;
}

/**
 * Eliminar todos los archivos huérfanos
 */
export function cleanOrphanFiles() {
  try {
    const { orphans } = findOrphanFiles();
    const relativePaths = orphans.map(f => f.relativePath);
    return deleteMultipleFiles(relativePaths);
  } catch (error) {
    console.error('Error al limpiar archivos huérfanos:', error);
    return { success: 0, failed: 0, errors: [{ error: error.message }] };
  }
}

/**
 * Eliminar archivos más antiguos que X días
 */
export function deleteOldFiles(days = 365) {
  try {
    const allFiles = getAllFilesRecursive(UPLOADS_DIR);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const oldFiles = allFiles.filter(f => new Date(f.modified) < cutoffDate);
    const relativePaths = oldFiles.map(f => f.relativePath);
    
    return deleteMultipleFiles(relativePaths);
  } catch (error) {
    console.error('Error al eliminar archivos antiguos:', error);
    return { success: 0, failed: 0, errors: [{ error: error.message }] };
  }
}

/**
 * Limpiar directorios vacíos
 */
export function cleanEmptyDirectories(dir = UPLOADS_DIR) {
  try {
    if (!fs.existsSync(dir)) {
      return 0;
    }

    let cleaned = 0;
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        cleaned += cleanEmptyDirectories(fullPath);
        
        // Verificar si el directorio está vacío ahora
        if (fs.readdirSync(fullPath).length === 0) {
          fs.rmdirSync(fullPath);
          cleaned++;
        }
      }
    });

    return cleaned;
  } catch (error) {
    console.error('Error al limpiar directorios vacíos:', error);
    return 0;
  }
}

// ==================== BÚSQUEDA ====================

/**
 * Buscar archivos por nombre o extensión
 */
export function searchFiles(query, searchIn = 'name') {
  try {
    const allFiles = getAllFilesRecursive(UPLOADS_DIR);
    const searchQuery = query.toLowerCase();

    const results = allFiles.filter(file => {
      switch (searchIn) {
        case 'name':
          return file.name.toLowerCase().includes(searchQuery);
        case 'extension':
          return file.extension.toLowerCase().includes(searchQuery);
        case 'path':
          return file.relativePath.toLowerCase().includes(searchQuery);
        default:
          return file.name.toLowerCase().includes(searchQuery);
      }
    });

    return results.map(f => ({
      ...f,
      sizeFormatted: formatBytes(f.size)
    }));
  } catch (error) {
    console.error('Error al buscar archivos:', error);
    return [];
  }
}
