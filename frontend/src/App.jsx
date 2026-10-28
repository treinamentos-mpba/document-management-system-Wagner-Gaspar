import { useEffect, useState } from 'react';
import { DocumentList } from './components/DocumentList.jsx';
import { UploadComponent } from './components/UploadComponent.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;

    listDocuments()
      .then((result) => {
        if (active) setDocuments(result);
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleRefresh() {
    setIsRefreshing(true);
    setLoadError('');

    try {
      setDocuments(await listDocuments());
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleUploaded(document) {
    setDocuments((currentDocuments) => [
      document,
      ...currentDocuments.filter((item) => item.id !== document.id),
    ]);
    setLoadError('');
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">D</div>
          <div>
            <p className="brand-kicker">DOCUMENT MANAGEMENT</p>
            <p className="brand-name">Arquivo</p>
          </div>
        </div>
        <div className="storage-indicator">
          <span className="storage-dot" aria-hidden="true" />
          <span>Armazenamento local</span>
        </div>
      </header>

      <section className="page-heading" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">BIBLIOTECA</p>
          <h1 id="page-title">Documentos</h1>
        </div>
        <div className="document-count" aria-label={`${documents.length} documentos`}>
          <span className="count-number">{documents.length}</span>
          <span className="count-label">itens</span>
        </div>
      </section>

      <UploadComponent onUploaded={handleUploaded} />

      <section className="documents-section" aria-labelledby="documents-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ARQUIVO</p>
            <h2 id="documents-title">Todos os documentos</h2>
          </div>
          <button
            className="button button-secondary refresh-button"
            type="button"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            aria-label="Atualizar lista de documentos"
          >
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        {loadError && (
          <div className="list-error" role="alert">
            <p>{loadError}</p>
            <button className="text-button" type="button" onClick={handleRefresh}>
              Tentar novamente
            </button>
          </div>
        )}
        {(!loadError || documents.length > 0) && (
          <DocumentList documents={documents} isLoading={isLoading} />
        )}
      </section>

      <footer className="page-footer">
        <span>Documentos mantidos nesta sessão</span>
        <span>PDF · DOCX · TXT</span>
      </footer>
    </main>
  );
}