import { useRef, useState } from 'react';
import { uploadDocument, validateDocumentFile } from '../services/documentApi.js';

export function UploadComponent({ onUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef(null);

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setError(file ? validateDocumentFile(file) : '');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationMessage = validateDocumentFile(selectedFile);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const document = await uploadDocument(selectedFile);
      onUploaded(document);
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = '';
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="upload-panel" onSubmit={handleSubmit}>
      <div className="upload-copy">
        <p className="eyebrow">NOVO DOCUMENTO</p>
        <h2>Adicionar arquivo</h2>
      </div>
      <div className="upload-controls">
        <label className="file-field">
          <span className="field-label">Arquivo</span>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            aria-describedby="upload-formats"
          />
        </label>
        <button
          className="button button-primary"
          type="submit"
          disabled={!selectedFile || Boolean(error) || isUploading}
        >
          {isUploading ? 'Enviando...' : 'Enviar documento'}
        </button>
      </div>
      <div className="upload-meta">
        <p id="upload-formats" className="field-hint">PDF, DOCX ou TXT · até 10 MiB</p>
        {selectedFile && !error && (
          <p className="selected-file" title={selectedFile.name}>
            Selecionado: {selectedFile.name}
          </p>
        )}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}