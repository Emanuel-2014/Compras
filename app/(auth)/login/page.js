'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Form, Button, Alert, InputGroup } from 'react-bootstrap';
import Image from 'next/image';
import Link from 'next/link';
import EyeOpenIcon from '@/components/EyeOpenIcon';
import EyeSlashIcon from '@/components/EyeSlashIcon';
export default function LoginPage() {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [companySettings, setCompanySettings] = useState({
    company_name: 'POLLOS AL DÍA',
    company_logo_path: '/logo.png'
  });

  useEffect(() => {
    // Cargar la configuración pública de la empresa
    fetch('/api/public-settings')
      .then(res => res.json())
      .then(data => setCompanySettings(data))
      .catch(err => console.error('Error loading company settings:', err));
  }, []);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ codigo, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(`¡BIENVENIDO, ${data.user.nombre}! SERÁS REDIRIGIDO...`);
        setError('');
        setTimeout(() => {
          if (data.user.rol?.toLowerCase() === 'aprobador') {
            router.push('/aprobador-dashboard');
          } else {
            router.push('/dashboard');
          }
        }, 1500);
      } else {
        setError(data.message || 'HA OCURRIDO UN ERROR INESPERADO.');
        setSuccess('');
      }
    } catch (err) {
      console.error('Error de red o al hacer fetch:', err);
      setError('NO SE PUDO CONECTAR CON EL SERVIDOR. REVISA TU CONEXIÓN A INTERNET.');
      setSuccess('');
    }
  };
  return (
    <Container fluid className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <Row className="w-100 justify-content-center">
        <Col xs={12} sm={10} md={8} lg={6} xl={4}>
          <Card className="shadow w-100" style={{ maxWidth: '24rem', margin: 'auto' }}>
            <Card.Header className="text-center bg-dark text-white" style={{ padding: '1rem' }}>
              {companySettings.company_logo_path && (
                <div className="mb-2">
                  <Image
                    src={companySettings.company_logo_path}
                    alt="Logo"
                    width={120}
                    height={40}
                    style={{ objectFit: 'contain', height: 'auto' }}
                    priority
                  />
                </div>
              )}
              <h4 className="mb-0">{companySettings.company_name}</h4>
            </Card.Header>
            <Card.Body>
              <Card.Title className="text-center mb-4">SOLICITUD DE COMPRAS</Card.Title>
                        <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="formCodigo">
                  <Form.Label className="fw-bold text-center d-block">CÓDIGO DE USUARIO</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="INGRESA TU CÓDIGO"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="formPassword">
                  <Form.Label className="fw-bold text-center d-block">CONTRASEÑA</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      placeholder="INGRESA TU CONTRASEÑA"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      variant="outline-secondary"
                      onMouseDown={() => setShowPassword(true)}
                      onMouseUp={() => setShowPassword(false)}
                      onMouseLeave={() => setShowPassword(false)}
                    >
                      {showPassword ? <EyeSlashIcon /> : <EyeOpenIcon />}
                    </Button>
                  </InputGroup>
                </Form.Group>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}
                <div className="d-grid">
                  <Button variant="dark" type="submit" disabled={!!success}>
                    {success ? 'REDIRIGIENDO...' : 'ENTRAR'}
                  </Button>
                </div>
                <div className="text-center mt-3">
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}