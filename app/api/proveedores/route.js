// app/api/proveedores/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getSession(request);
    if (!user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const stmt = db.prepare('SELECT id, nombre, nit, nit_dv, nombre_asesor, contacto FROM proveedores');
    const proveedores = stmt.all();

    return NextResponse.json(proveedores, { status: 200 });
  } catch (error) {
    console.error('Error en /api/proveedores (GET):', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener la lista de proveedores.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getSession(request);
    console.log('User in /api/proveedores:', user);
    if (!user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 }); // 401 Unauthorized
    }

    const { nombre, nit, nombre_asesor, contacto } = await request.json();

    if (!nombre) {
      return NextResponse.json(
        { message: 'El nombre del proveedor es obligatorio.' },
        { status: 400 }
      );
    }

    // Normalizar a mayúsculas
    const nombreUpper = nombre ? nombre.toUpperCase() : nombre;
    const nombreAsesorUpper = nombre_asesor ? nombre_asesor.toUpperCase() : nombre_asesor;
    const contactoUpper = contacto ? contacto.toUpperCase() : contacto;

    // Separar NIT y DV si vienen en formato "NIT-DV"
    let nitClean = nit;
    let nitDv = null;
    if (nit && nit.includes('-')) {
      const parts = nit.split('-');
      nitClean = parts[0].replace(/\./g, ''); // Remover puntos del NIT
      nitDv = parts[1] || null;
    } else if (nit) {
      nitClean = nit.replace(/\./g, ''); // Remover puntos del NIT
    }

    const stmt = db.prepare(
      'INSERT INTO proveedores (nombre, nit, nit_dv, nombre_asesor, contacto) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(nombreUpper, nitClean || null, nitDv, nombreAsesorUpper || null, contactoUpper || null);

    return NextResponse.json(
      { message: 'Proveedor creado exitosamente.', id: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed: proveedores.nombre')) {
      return NextResponse.json(
        { message: 'Ya existe un proveedor con este nombre.' },
        { status: 409 } // 409 Conflict
      );
    }
    console.error('Error en /api/proveedores (POST):', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al crear el proveedor.' },
      { status: 500 }
    );
  }
}