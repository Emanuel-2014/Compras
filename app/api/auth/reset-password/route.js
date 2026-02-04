import db from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { token, password } = await req.json();

    const user = db.prepare('SELECT * FROM usuarios WHERE reset_token = ?').get(token);

    if (!user) {
      return NextResponse.json({ message: 'Token de restablecimiento inválido.' }, { status: 400 });
    }

    if (Date.now() > user.reset_token_expires) {
      return NextResponse.json({ message: 'El token de restablecimiento ha expirado.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.prepare('UPDATE usuarios SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(hashedPassword, user.id);

    return NextResponse.json({ message: 'Contraseña restablecida con éxito. Serás redirigido a la página de inicio de sesión.' });

  } catch (error) {
    console.error('Error al restablecer la contraseña:', error);
    return NextResponse.json({ message: 'Ocurrió un error en el servidor.' }, { status: 500 });
  }
}
