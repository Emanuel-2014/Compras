import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const stmt = db.prepare('SELECT key, value FROM app_settings');
    const settings = stmt.all();

    const config = {};
    settings.forEach(setting => {
      config[setting.key] = setting.value;
    });

    return NextResponse.json(config, { status: 200 });
  } catch (error) {
    console.error('Error fetching app settings:', error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener la configuración.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('company_logo');
    const settingsToUpdate = {};

    // Collect all other form data
    for (const [key, value] of formData.entries()) {
      if (key !== 'company_logo') {
        settingsToUpdate[key] = value;
      }
    }

    // Handle logo upload if a file is provided
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = path.join(process.cwd(), 'public'); // Store in public for direct access
      await mkdir(uploadDir, { recursive: true });

      // Delete old logo if it exists
      const oldLogoPathStmt = db.prepare("SELECT value FROM app_settings WHERE key = 'company_logo_path'");
      const oldLogoPathResult = oldLogoPathStmt.get();
      if (oldLogoPathResult && oldLogoPathResult.value && oldLogoPathResult.value !== '/logo.png') {
        const oldLogoFullPath = path.join(process.cwd(), 'public', path.basename(oldLogoPathResult.value));
        try {
          await unlink(oldLogoFullPath);
          console.log(`Old logo deleted: ${oldLogoFullPath}`);
        } catch (unlinkError) {
          console.warn(`Could not delete old logo ${oldLogoFullPath}:`, unlinkError.message);
        }
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExtension = path.extname(file.name);
      const newFilename = `company_logo-${uniqueSuffix}${fileExtension}`;
      const filePath = path.join(uploadDir, newFilename);
      const publicPath = `/${newFilename}`; // Path accessible from frontend

      await writeFile(filePath, buffer);
      settingsToUpdate.company_logo_path = publicPath;
      console.log(`New logo saved to: ${filePath}`);
    }

    // Update other settings in the database
    const updateStmt = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
    db.transaction(() => {
      for (const key in settingsToUpdate) {
        updateStmt.run(key, settingsToUpdate[key]);
      }
    })();

    return NextResponse.json({ message: 'Configuración actualizada correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('Error updating app settings:', error);
    return NextResponse.json({ message: 'Error interno del servidor al actualizar la configuración.' }, { status: 500 });
  }
}
