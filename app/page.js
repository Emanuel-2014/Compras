'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, []);

  // Redirige a la página de login, que es el comportamiento esperado para la ruta raíz.
  return null;
}