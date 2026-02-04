import db from '@/lib/db';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req) {
  try {
    const { codigo } = await req.json();

    const user = db.prepare('SELECT * FROM usuarios WHERE codigo_personal = ?').get(codigo);
    console.log('User found:', user);

    if (!user) {
      console.log('User not found, returning 404');
      return NextResponse.json({ message: 'No existe un usuario con ese código personal.' }, { status: 404 });
    }

    // Generar un token de reseteo
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = Date.now() + 3600000; // 1 hora desde ahora

    // Guardar el token y la fecha de expiración en la base de datos
    db.prepare('UPDATE usuarios SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(resetToken, tokenExpiry, user.id);

    // Simular el envío de correo electrónico
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password/${resetToken}`;
    console.log(`Password reset link for user ${user.codigo_personal}: ${resetUrl}`);

    return NextResponse.json({ message: 'Se ha enviado un enlace para restablecer la contraseña a tu correo electrónico.' });

  } catch (error) {
    console.error('Error en la solicitud de reseteo de contraseña:', error);
    return NextResponse.json({ message: 'Ocurrió un error en el servidor.' }, { status: 500 });
  }
}
