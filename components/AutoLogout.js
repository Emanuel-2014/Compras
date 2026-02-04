"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AutoLogout({ timeout = 15 * 60 * 1000 }) {
  // 15 minutos por defecto
  const router = useRouter();

  useEffect(() => {
    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // Limpiar cualquier dato de sesión local si aplica
        // localStorage.removeItem('token');
        // Redirigir a login
        router.replace('/login');
      }, timeout);
    };

    // Eventos de actividad
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [router, timeout]);

  return null;
}
