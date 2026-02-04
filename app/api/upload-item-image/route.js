// app/api/upload-item-image/route.js
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getSession } from '@/lib/auth';

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('itemImage');

    if (!file) {
      return NextResponse.json({ message: 'No se ha proporcionado ningún archivo.' }, { status: 400 });
    }

    // Validar que es una imagen
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ message: 'Tipo de archivo no permitido. Solo se aceptan imágenes (jpeg, png, gif, webp).' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const originalFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, ''); // Sanitize filename
    const fileExtension = path.extname(originalFilename);
    const newFilename = `${path.basename(originalFilename, fileExtension)}-${uniqueSuffix}${fileExtension}`;

    // Directorio específico para imágenes de ítems
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'items');
    const filePath = path.join(uploadDir, newFilename);

    // La ruta que se devolverá al cliente para ser usada en tags <img>
    const publicPath = path.join('/uploads', 'items', newFilename).replace(/\\/g, '/');

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, buffer);

    return NextResponse.json({
      message: 'Imagen subida correctamente.',
      filePath: publicPath
    }, { status: 201 });

  } catch (error) {
    console.error('Error en /api/upload-item-image POST:', error);
    return NextResponse.json({ message: 'Error interno del servidor al subir la imagen.' }, { status: 500 });
  }
}
