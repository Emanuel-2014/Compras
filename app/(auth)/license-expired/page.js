import styles from './LicenseExpired.module.css';
export default function LicenseExpiredPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Licencia Expirada o Inválida</h1>
        <p className={styles.message}>
          El acceso a la aplicación ha sido restringido.
        </p>
        <p className={styles.instructions}>
          Por favor, contacte al administrador del sistema para renovar la licencia de uso.
        </p>
        <div className={styles.footer}>
          Pollos Al Día App
        </div>
      </div>
    </div>
  );
}