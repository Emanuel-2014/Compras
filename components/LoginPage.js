// components/LoginPage.js
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import EyeIcon from './EyeIcon';
import styles from './LoginPage.module.css'; // Estilos específicos para la página de login

export default function LoginPage() {
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [companySettings, setCompanySettings] = useState({
    company_name: 'POLLOS AL DÍA',
    company_logo_path: '/logo.png'
  });
  const router = useRouter();

  useEffect(() => {
    // Cargar la configuración pública de la empresa
    fetch('/api/public-settings')
      .then(res => res.json())
      .then(data => setCompanySettings(data))
      .catch(err => console.error('Error loading company settings:', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ codigo, password }),
      });

      if (response.ok) {
        // Login exitoso, redirigir al dashboard
        router.push('/dashboard');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'CREDENCIALES INCORRECTAS.');
      }
    } catch (err) {
      console.error('Error de red durante el login:', err);
      setError('ERROR DE CONEXIÓN. INTENTE DE NUEVO MÁS TARDE.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        {companySettings.company_logo_path && (
          <Image
            src={companySettings.company_logo_path}
            alt="Logo Empresa"
            width={150}
            height={50}
            className={styles.logo}
            priority
          />
        )}
        <h1 className={styles.title}>{companySettings.company_name}</h1>
        <h2 className={styles.subtitle}>SOLICITUD DE COMPRAS</h2>
        <h3 className={styles.formTitle}>CÓDIGO DE USUARIO</h3>
        <h2 className={styles.subtitle}>SOLICITUD DE COMPRAS</h2>
        <h3 className={styles.formTitle}>CÓDIGO DE USUARIO</h3>
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.formGroup}>
            <label htmlFor="codigo">INGRESA TU CÓDIGO</label>
            <input
              type="text"
              id="codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password">CONTRASEÑA</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="INGRESA TU CONTRASEÑA"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={styles.input}
              />
              <button
                type="button"
                onMouseDown={() => setShowPassword(true)}
                onMouseUp={() => setShowPassword(false)}
                onMouseLeave={() => setShowPassword(false)}
                className={styles.showPasswordButton}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'INICIANDO...' : 'ENTRAR'}
          </button>
        </form>

      </div>
    </div>
  );
}