// components/PrintableReportHeader.js
'use client';

import { useAppSettings } from '@/app/context/SettingsContext';
import Image from 'next/image';

export default function PrintableReportHeader({ title }) {
  const { appSettings, loadingAppSettings } = useAppSettings();

  if (loadingAppSettings || !appSettings) {
    return null; // Don't render anything while loading settings
  }

  return (
    <div className="printable-only">
      <div className="printable-header-content">
        <div className="logo-container">
          {appSettings.company_logo_path && (
            <Image
              src={appSettings.company_logo_path}
              alt="Logo de la empresa"
              width={80}
              height={80}
              style={{ objectFit: 'contain' }}
            />
          )}
          <div>
            <div className="company-name">{appSettings.company_name || 'Nombre de la Empresa'}</div>
            {appSettings.company_nit && <div>NIT: {appSettings.company_nit}</div>}
            <div>{appSettings.company_address || 'Dirección'}</div>
            <div>{appSettings.company_phone || 'Teléfono'} | {appSettings.company_email || 'Email'}</div>
          </div>
        </div>
        <div className="report-title">{title}</div>
        <div className="report-date">Generado el: {new Date().toLocaleDateString('es-CO')}</div>
      </div>
    </div>
  );
}
