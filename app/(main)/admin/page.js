'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Spinner } from 'react-bootstrap';

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir automáticamente al dashboard de admin
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
      <div className="text-center">
        <Spinner animation="border" role="status" className="mb-3">
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
        <p>Redirigiendo al panel de administración...</p>
      </div>
    </Container>
  );
}