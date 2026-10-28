import { DownloadButton } from './DownloadButton.jsx';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getExtension(fileName) {
  return fileName.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE';
}

export function DocumentList({ documents, isLoading }) {
  if (isLoading) {
    return <div className="list-state" role="status">Carregando documentos...</div>;
  }

  if (documents.length === 0) {
    return <div className="list-state empty-state">Nenhum documento encontrado.</div>;
  }

  return (
    <div className="document-table-wrap">
      <table className="document-table">
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Tamanho</th>
            <th scope="col">Enviado em</th>
            <th scope="col"><span className="visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td>
                <div className="document-name-cell">
                  <span className="file-type" aria-hidden="true">
                    {getExtension(document.originalName)}
                  </span>
                  <span className="document-name" title={document.originalName}>
                    {document.originalName}
                  </span>
                </div>
              </td>
              <td className="document-secondary">{formatSize(document.size)}</td>
              <td className="document-secondary">{formatDate(document.uploadedAt)}</td>
              <td className="document-action"><DownloadButton document={document} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}