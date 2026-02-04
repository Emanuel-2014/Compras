'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './import-export.module.css';
import { FaFileExcel, FaUpload, FaDownload, FaFileImport, FaFileExport, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

export default function ImportExportPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('export');
  const [exportType, setExportType] = useState('users');
  const [importType, setImportType] = useState('users');
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = useRef(null);

  // Filtros para exportación de solicitudes
  const [filters, setFilters] = useState({
    estado: '',
    fechaInicio: '',
    fechaFin: '',
    dependenciaId: ''
  });

  const handleExport = async () => {
    try {
      let url = `/api/super-admin/import-export?action=export&type=${exportType}`;
      
      // Agregar filtros si es exportación de solicitudes
      if (exportType === 'requests') {
        if (filters.estado) url += `&estado=${filters.estado}`;
        if (filters.fechaInicio) url += `&fechaInicio=${filters.fechaInicio}`;
        if (filters.fechaFin) url += `&fechaFin=${filters.fechaFin}`;
        if (filters.dependenciaId) url += `&dependenciaId=${filters.dependenciaId}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        alert('Error al exportar datos');
        return;
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${exportType}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      console.error('Error:', error);
      alert('Error al exportar datos');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`/api/super-admin/import-export?action=template&type=${importType}`);
      
      if (!response.ok) {
        alert('Error al descargar plantilla');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plantilla_${importType}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error:', error);
      alert('Error al descargar plantilla');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar que sea un archivo Excel
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!validTypes.includes(file.type)) {
        alert('Por favor seleccione un archivo Excel (.xlsx o .xls)');
        return;
      }
      
      setSelectedFile(file);
      setImportResults(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      alert('Por favor seleccione un archivo');
      return;
    }

    if (!confirm('¿Está seguro de importar estos datos?\n\nLos registros existentes con el mismo código/RUT serán actualizados.')) {
      return;
    }

    setImporting(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', importType);

      const response = await fetch('/api/super-admin/import-export', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setImportResults(data.results);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        alert('Error al importar: ' + data.message);
      }

    } catch (error) {
      console.error('Error:', error);
      alert('Error al importar datos');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <FaFileExcel className={styles.titleIcon} />
          <h1>Importación/Exportación Masiva</h1>
        </div>
        <button onClick={() => router.push('/super-admin')} className={styles.backButton}>
          Volver al Dashboard
        </button>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'export' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('export')}
        >
          <FaFileExport /> Exportar
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'import' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <FaFileImport /> Importar
        </button>
      </div>

      <div className={styles.content}>
        {/* Tab: Exportar */}
        {activeTab === 'export' && (
          <div className={styles.exportSection}>
            <div className={styles.card}>
              <h3><FaFileExport /> Exportar Datos a Excel</h3>
              <p>Seleccione el tipo de datos que desea exportar</p>

              <div className={styles.typeSelector}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="exportType"
                    value="users"
                    checked={exportType === 'users'}
                    onChange={(e) => setExportType(e.target.value)}
                  />
                  <span>👥 Usuarios</span>
                  <small>Exportar todos los usuarios del sistema</small>
                </label>

                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="exportType"
                    value="providers"
                    checked={exportType === 'providers'}
                    onChange={(e) => setExportType(e.target.value)}
                  />
                  <span>🏪 Proveedores</span>
                  <small>Exportar todos los proveedores registrados</small>
                </label>

                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="exportType"
                    value="requests"
                    checked={exportType === 'requests'}
                    onChange={(e) => setExportType(e.target.value)}
                  />
                  <span>📋 Solicitudes</span>
                  <small>Exportar solicitudes de compra con filtros</small>
                </label>
              </div>

              {/* Filtros para solicitudes */}
              {exportType === 'requests' && (
                <div className={styles.filters}>
                  <h4>Filtros de Exportación</h4>
                  <div className={styles.filterGrid}>
                    <div className={styles.filterItem}>
                      <label>Estado</label>
                      <select
                        value={filters.estado}
                        onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                      >
                        <option value="">Todos</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="aprobada">Aprobada</option>
                        <option value="rechazada">Rechazada</option>
                        <option value="en_proceso">En Proceso</option>
                        <option value="completada">Completada</option>
                      </select>
                    </div>

                    <div className={styles.filterItem}>
                      <label>Fecha Inicio</label>
                      <input
                        type="date"
                        value={filters.fechaInicio}
                        onChange={(e) => setFilters({ ...filters, fechaInicio: e.target.value })}
                      />
                    </div>

                    <div className={styles.filterItem}>
                      <label>Fecha Fin</label>
                      <input
                        type="date"
                        value={filters.fechaFin}
                        onChange={(e) => setFilters({ ...filters, fechaFin: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <button onClick={handleExport} className={styles.exportButton}>
                <FaDownload /> Exportar a Excel
              </button>
            </div>

            <div className={styles.infoCard}>
              <h4>ℹ️ Información sobre Exportación</h4>
              <ul>
                <li>Los archivos se descargan en formato Excel (.xlsx)</li>
                <li>Incluyen todos los campos de la base de datos</li>
                <li>Los datos exportados están actualizados en tiempo real</li>
                <li>Puede usar estos archivos para análisis o respaldos</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab: Importar */}
        {activeTab === 'import' && (
          <div className={styles.importSection}>
            <div className={styles.card}>
              <h3><FaFileImport /> Importar Datos desde Excel</h3>
              <p>Seleccione el tipo de datos que desea importar</p>

              <div className={styles.typeSelector}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="importType"
                    value="users"
                    checked={importType === 'users'}
                    onChange={(e) => setImportType(e.target.value)}
                  />
                  <span>👥 Usuarios</span>
                  <small>Importar o actualizar usuarios masivamente</small>
                </label>

                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="importType"
                    value="providers"
                    checked={importType === 'providers'}
                    onChange={(e) => setImportType(e.target.value)}
                  />
                  <span>🏪 Proveedores</span>
                  <small>Importar o actualizar proveedores masivamente</small>
                </label>
              </div>

              <div className={styles.templateSection}>
                <h4>📄 Plantilla de Excel</h4>
                <p>Descargue la plantilla con el formato correcto antes de importar</p>
                <button onClick={handleDownloadTemplate} className={styles.templateButton}>
                  <FaDownload /> Descargar Plantilla
                </button>
              </div>

              <div className={styles.uploadSection}>
                <h4>📤 Cargar Archivo</h4>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className={styles.fileInput}
                />
                {selectedFile && (
                  <div className={styles.selectedFile}>
                    <FaFileExcel className={styles.fileIcon} />
                    <span>{selectedFile.name}</span>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className={styles.removeFile}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleImport}
                disabled={!selectedFile || importing}
                className={styles.importButton}
              >
                {importing ? (
                  <>⏳ Importando...</>
                ) : (
                  <><FaUpload /> Importar Datos</>
                )}
              </button>
            </div>

            {/* Resultados de importación */}
            {importResults && (
              <div className={styles.resultsCard}>
                <h4>📊 Resultados de Importación</h4>
                
                <div className={styles.resultsSummary}>
                  <div className={styles.resultItem}>
                    <FaCheckCircle className={styles.successIcon} />
                    <div>
                      <div className={styles.resultNumber}>{importResults.success}</div>
                      <div className={styles.resultLabel}>Exitosos</div>
                    </div>
                  </div>

                  <div className={styles.resultItem}>
                    <FaTimesCircle className={styles.errorIcon} />
                    <div>
                      <div className={styles.resultNumber}>{importResults.errors.length}</div>
                      <div className={styles.resultLabel}>Errores</div>
                    </div>
                  </div>
                </div>

                {importResults.errors.length > 0 && (
                  <div className={styles.errorList}>
                    <h5>❌ Errores Encontrados:</h5>
                    <div className={styles.errorItems}>
                      {importResults.errors.map((error, index) => (
                        <div key={index} className={styles.errorItem}>
                          <strong>Fila {index + 2}:</strong> {error.error}
                          <details>
                            <summary>Ver datos</summary>
                            <pre>{JSON.stringify(error.row, null, 2)}</pre>
                          </details>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={styles.infoCard}>
              <h4>ℹ️ Información sobre Importación</h4>
              <ul>
                <li>Use la plantilla descargable para el formato correcto</li>
                <li>Los registros existentes se actualizarán (por código/RUT)</li>
                <li>Los nuevos registros se crearán automáticamente</li>
                <li>Para usuarios nuevos, la contraseña por defecto es el código</li>
                <li>Revise los resultados para verificar errores</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
