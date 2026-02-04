'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SessionExpiredHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleSessionExpired = () => {
      alert('Su sesión ha expirado. Por favor, inicie sesión de nuevo.');
      router.push('/login');
    };

    window.addEventListener('session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, [router]);

  return null;
}
