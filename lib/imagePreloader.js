/**
 * Utility para precargar imágenes antes de imprimir
 */

export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    if (!src) {
      resolve(); // No hay imagen que cargar
      return;
    }

    const img = new Image();

    img.onload = () => {
      console.log(`✅ Imagen precargada: ${src}`);
      resolve(img);
    };

    img.onerror = () => {
      console.warn(`⚠️ Error cargando imagen: ${src}`);
      reject(new Error(`Failed to load image: ${src}`));
    };

    // Si la imagen ya está en caché, se dispara inmediatamente
    if (img.complete) {
      console.log(`📦 Imagen ya en caché: ${src}`);
      resolve(img);
    } else {
      img.src = src;
    }
  });
};

export const preloadImagesForPrint = async (imagePaths = []) => {
  console.log('🖼️ Precargando imágenes para impresión...', imagePaths);

  const promises = imagePaths.filter(Boolean).map(path =>
    preloadImage(path).catch(error => {
      console.warn(`⚠️ Falló precarga de ${path}:`, error);
      return null; // No fallar toda la operación por una imagen
    })
  );

  try {
    await Promise.all(promises);
    console.log('✅ Todas las imágenes precargadas exitosamente');
    return true;
  } catch (error) {
    console.warn('⚠️ Algunas imágenes fallaron al precargar:', error);
    return false;
  }
};