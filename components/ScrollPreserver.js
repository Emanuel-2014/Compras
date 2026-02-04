'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ScrollPreserver() {
  const pathname = usePathname();

  useEffect(() => {
    // Restaurar posición de scroll solo en la primera carga de la ruta
    const savedPosition = sessionStorage.getItem(`scroll-${pathname}`);
    if (savedPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedPosition, 10));
      }, 0);
    }

    // Guardar posición antes de salir o recargar
    const saveScrollPosition = () => {
      sessionStorage.setItem(`scroll-${pathname}`, window.scrollY.toString());
    };
    window.addEventListener('beforeunload', saveScrollPosition);
    window.addEventListener('pagehide', saveScrollPosition);

    return () => {
      window.removeEventListener('beforeunload', saveScrollPosition);
      window.removeEventListener('pagehide', saveScrollPosition);
    };
  }, [pathname]);

  return null;
}
