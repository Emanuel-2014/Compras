'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './files.module.css';
import { FaFolder, FaFile, FaTrash, FaSearch, FaDownload, FaBroom, FaCalendarAlt, FaChartPie, FaSort } from 'react-icons/fa';

export default function FilesManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [files, setFiles] = useState([]);
  const [orphans, setOrphans] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIn, setSearchIn] = useState('name');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [activeTab, setActiveTab] = useState('stats');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [deleteOldDays, setDeleteOldDays] = useState(365);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar estadísticas
      const statsRes = await fetch('/api/super-admin/files?action=stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Cargar archivos huérfanos
      const orphansRes = await fetch('/api/super-admin/files?action=orphans');
      if (orphansRes.ok) {
        const orphansData = await orphansRes.json();
        setOrphans(orphansData.orphans || []);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('Error al cargar datos de archivos');
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async () => {
    try {
      const res = await fetch(`/api/super-admin/files?action=list&sortBy=${sortBy}&order=${sortOrder}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Error al cargar archivos:', error);
      alert('Error al cargar archivos');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    try {
      const res = await fetch(`/api/super-admin/files?action=search&query=${encodeURIComponent(searchQuery)}&searchIn=${searchIn}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Error al buscar:', error);
      alert('Error al buscar archivos');
    }
  };

  const handleCleanOrphans = async () => {
    if (!confirm(`¿Eliminar ${orphans.length} archivo(s) huérfano(s)?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await fetch('/api/super-admin/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clean-orphans' })
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        loadData();
      } else {
        alert('Error al limpiar archivos huérfanos');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al limpiar archivos huérfanos');
    }
  };

  const handleDeleteOldFiles = async () => {
    if (!confirm(`¿Eliminar archivos con más de ${deleteOldDays} días?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await fetch('/api/super-admin/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-old', days: deleteOldDays })
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        loadData();
        if (activeTab === 'explorer') loadFiles();
      } else {
        alert('Error al eliminar archivos antiguos');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar archivos antiguos');
    }
  };

  const handleCleanEmptyDirs = async () => {
    if (!confirm('¿Eliminar directorios vacíos?\n\nEsta acción no se puede deshacer.')) {
      return;
    }

    try {
      const res = await fetch('/api/super-admin/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clean-empty-dirs' })
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
      } else {
        alert('Error al limpiar directorios');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al limpiar directorios');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) {
      alert('Seleccione al menos un archivo');
      return;
    }

    if (!confirm(`¿Eliminar ${selectedFiles.length} archivo(s) seleccionado(s)?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await fetch('/api/super-admin/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-files', files: selectedFiles })
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        setSelectedFiles([]);
        loadFiles();
        loadData();
      } else {
        alert('Error al eliminar archivos');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar archivos');
    }
  };

  const toggleFileSelection = (filePath) => {
    setSelectedFiles(prev => 
      prev.includes(filePath)
        ? prev.filter(f => f !== filePath)
        : [...prev, filePath]
    );
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (activeTab === 'explorer') {
      loadFiles();
    }
  }, [activeTab, sortBy, sortOrder]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Cargando...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <FaFolder className={styles.titleIcon} />
          <h1>Gestión de Archivos</h1>
        </div>
        <button onClick={() => router.push('/super-admin')} className={styles.backButton}>
          Volver al Dashboard
        </button>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'stats' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <FaChartPie /> Estadísticas
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'explorer' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('explorer')}
        >
          <FaFile /> Explorador
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'orphans' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('orphans')}
        >
          <FaTrash /> Huérfanos ({orphans.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'cleanup' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('cleanup')}
        >
          <FaBroom /> Limpieza
        </button>
      </div>

      <div className={styles.content}>
        {/* Tab: Estadísticas */}
        {activeTab === 'stats' && stats && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3>Almacenamiento Total</h3>
              <div className={styles.statValue}>{formatBytes(stats.totalSize)}</div>
              <div className={styles.statLabel}>en {stats.totalFiles} archivos</div>
            </div>

            <div className={styles.statCard}>
              <h3>Por Tipo de Archivo</h3>
              <div className={styles.extensionList}>
                {stats.byExtension && Object.entries(stats.byExtension).map(([ext, data]) => (
                  <div key={ext} className={styles.extensionItem}>
                    <span className={styles.extName}>{ext || 'Sin extensión'}</span>
                    <span className={styles.extCount}>{data.count} archivos</span>
                    <span className={styles.extSize}>{formatBytes(data.size)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.statCard}>
              <h3>Top 5 Extensiones</h3>
              <div className={styles.topList}>
                {stats.topExtensions && stats.topExtensions.map((ext, index) => (
                  <div key={index} className={styles.topItem}>
                    <span className={styles.topRank}>#{index + 1}</span>
                    <span className={styles.topName}>{ext.extension || 'Sin ext'}</span>
                    <span className={styles.topValue}>{ext.count} ({formatBytes(ext.size)})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.statCard}>
              <h3>Archivos Más Grandes</h3>
              <div className={styles.fileList}>
                {stats.largestFiles && stats.largestFiles.slice(0, 5).map((file, index) => (
                  <div key={index} className={styles.fileItem}>
                    <FaFile className={styles.fileIcon} />
                    <div className={styles.fileInfo}>
                      <div className={styles.fileName}>{file.name}</div>
                      <div className={styles.fileSize}>{formatBytes(file.size)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.statCard}>
              <h3>Archivos Más Antiguos</h3>
              <div className={styles.fileList}>
                {stats.oldestFiles && stats.oldestFiles.slice(0, 5).map((file, index) => (
                  <div key={index} className={styles.fileItem}>
                    <FaCalendarAlt className={styles.fileIcon} />
                    <div className={styles.fileInfo}>
                      <div className={styles.fileName}>{file.name}</div>
                      <div className={styles.fileDate}>{formatDate(file.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Explorador de Archivos */}
        {activeTab === 'explorer' && (
          <div className={styles.explorerSection}>
            <div className={styles.explorerControls}>
              <div className={styles.searchBox}>
                <select
                  value={searchIn}
                  onChange={(e) => setSearchIn(e.target.value)}
                  className={styles.searchSelect}
                >
                  <option value="name">Nombre</option>
                  <option value="extension">Extensión</option>
                  <option value="path">Ruta</option>
                </select>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Buscar archivos..."
                  className={styles.searchInput}
                />
                <button onClick={handleSearch} className={styles.searchButton}>
                  <FaSearch /> Buscar
                </button>
              </div>

              <div className={styles.sortBox}>
                <FaSort />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.sortSelect}>
                  <option value="name">Nombre</option>
                  <option value="size">Tamaño</option>
                  <option value="created">Fecha creación</option>
                  <option value="modified">Fecha modificación</option>
                </select>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={styles.sortSelect}>
                  <option value="asc">Ascendente</option>
                  <option value="desc">Descendente</option>
                </select>
              </div>

              {selectedFiles.length > 0 && (
                <button onClick={handleDeleteSelected} className={styles.deleteButton}>
                  <FaTrash /> Eliminar {selectedFiles.length} seleccionado(s)
                </button>
              )}
            </div>

            <div className={styles.fileTable}>
              <table>
                <thead>
                  <tr>
                    <th style={{width: '40px'}}>
                      <input
                        type="checkbox"
                        checked={files.length > 0 && selectedFiles.length === files.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFiles(files.map(f => f.relativePath));
                          } else {
                            setSelectedFiles([]);
                          }
                        }}
                      />
                    </th>
                    <th>Nombre</th>
                    <th>Tamaño</th>
                    <th>Extensión</th>
                    <th>Fecha Creación</th>
                    <th>Fecha Modificación</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.relativePath)}
                          onChange={() => toggleFileSelection(file.relativePath)}
                        />
                      </td>
                      <td>
                        <div className={styles.fileNameCell}>
                          <FaFile className={styles.fileIcon} />
                          {file.name}
                        </div>
                      </td>
                      <td>{formatBytes(file.size)}</td>
                      <td>{file.extension || '-'}</td>
                      <td>{formatDate(file.createdAt)}</td>
                      <td>{formatDate(file.modifiedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {files.length === 0 && (
                <div className={styles.noResults}>No se encontraron archivos</div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Archivos Huérfanos */}
        {activeTab === 'orphans' && (
          <div className={styles.orphansSection}>
            <div className={styles.orphansHeader}>
              <h3>Archivos Huérfanos</h3>
              <p>Archivos que existen en el sistema pero no están referenciados en la base de datos</p>
              {orphans.length > 0 && (
                <button onClick={handleCleanOrphans} className={styles.cleanButton}>
                  <FaTrash /> Limpiar todos ({orphans.length})
                </button>
              )}
            </div>

            {orphans.length === 0 ? (
              <div className={styles.noOrphans}>
                ✓ No hay archivos huérfanos
              </div>
            ) : (
              <div className={styles.orphansList}>
                {orphans.map((file, index) => (
                  <div key={index} className={styles.orphanItem}>
                    <FaFile className={styles.orphanIcon} />
                    <div className={styles.orphanInfo}>
                      <div className={styles.orphanName}>{file.name}</div>
                      <div className={styles.orphanPath}>{file.relativePath}</div>
                      <div className={styles.orphanMeta}>
                        {formatBytes(file.size)} • {formatDate(file.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Limpieza */}
        {activeTab === 'cleanup' && (
          <div className={styles.cleanupSection}>
            <div className={styles.cleanupCard}>
              <h3><FaTrash /> Eliminar Archivos Antiguos</h3>
              <p>Elimina archivos con más de X días de antigüedad</p>
              <div className={styles.cleanupControls}>
                <input
                  type="number"
                  value={deleteOldDays}
                  onChange={(e) => setDeleteOldDays(parseInt(e.target.value))}
                  min="1"
                  className={styles.daysInput}
                />
                <span>días</span>
                <button onClick={handleDeleteOldFiles} className={styles.actionButton}>
                  Eliminar Antiguos
                </button>
              </div>
            </div>

            <div className={styles.cleanupCard}>
              <h3><FaBroom /> Limpiar Directorios Vacíos</h3>
              <p>Elimina carpetas que no contengan archivos</p>
              <button onClick={handleCleanEmptyDirs} className={styles.actionButton}>
                Limpiar Directorios
              </button>
            </div>

            <div className={styles.cleanupCard}>
              <h3><FaTrash /> Limpiar Archivos Huérfanos</h3>
              <p>Elimina archivos sin referencias en la base de datos</p>
              <div className={styles.orphanCount}>
                {orphans.length} archivo(s) huérfano(s)
              </div>
              <button
                onClick={handleCleanOrphans}
                disabled={orphans.length === 0}
                className={styles.actionButton}
              >
                Limpiar Huérfanos
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
