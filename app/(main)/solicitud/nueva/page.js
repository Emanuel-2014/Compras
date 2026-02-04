// app/solicitud/nueva/page.js
import { Suspense } from 'react';
import NuevaSolicitudForm from './NuevaSolicitudForm';

export default function NuevaSolicitudPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <NuevaSolicitudForm />
    </Suspense>
  );
}
