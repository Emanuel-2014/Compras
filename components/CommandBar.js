
import { useState } from 'react';
import { Form, Button, InputGroup } from 'react-bootstrap';

export default function CommandBar({ onExecute }) {
  const [command, setCommand] = useState('');

  const handleExecute = () => {
    onExecute(command);
    setCommand('');
  };

  return (
    <InputGroup className="mb-3">
      <Form.Control
        placeholder="Escribe un comando..."
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleExecute()}
      />
      <Button variant="outline-secondary" onClick={handleExecute}>
        Ejecutar
      </Button>
    </InputGroup>
  );
}
