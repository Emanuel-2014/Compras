// app/api/public-settings/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db';

// Este endpoint es público (no requiere autenticación)

export async function GET() {
  try {
    const stmt = db.prepare(`
      SELECT key, value
      FROM app_settings
      WHERE key IN (
        'company_name',
        'company_logo_path',
        'company_address',
        'company_phone',
        'company_email'
      )
    `);
    const settings = stmt.all();

    const config = {
      company_name: 'POLLOS AL DÍA',
      company_logo_path: '/logo.png',
      company_address: '',
      company_phone: '',
      company_email: ''
    };

    settings.forEach(setting => {
      config[setting.key] = setting.value;
    });

    return NextResponse.json(config, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      }
    });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    // Devolver valores por defecto en caso de error
    return NextResponse.json({
      company_name: 'POLLOS AL DÍA',
      company_logo_path: '/logo.png',
      company_address: '',
      company_phone: '',
      company_email: ''
    }, { status: 200 });
  }
}
