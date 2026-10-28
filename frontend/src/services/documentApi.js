const API_BASE = '/api';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const supportedTypes = new Map([
  ['pdf', 'application/pdf'],
  ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['txt', 'text/plain'],
]);

export class ApiError extends Error {
  constructor(message, code = 'API_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export function validateDocumentFile(file) {
  if (!file) return 'Selecione um arquivo.';
  if (file.size > MAX_FILE_SIZE) return 'O arquivo excede o limite de 10 MiB.';

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!supportedTypes.has(extension) || supportedTypes.get(extension) !== file.type) {
    return 'Formato não permitido. Envie PDF, DOCX ou TXT.';
  }

  return '';
}

async function getError(response) {
  const payload = await response.json().catch(() => null);
  return new ApiError(
    payload?.error?.message || 'Não foi possível concluir a solicitação.',
    payload?.error?.code || 'API_ERROR',
  );
}

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor.', 'NETWORK_ERROR');
  }

  if (!response.ok) throw await getError(response);
  return response;
}

export async function listDocuments() {
  const response = await request('/documents', {
    headers: { Accept: 'application/json' },
  });

  const payload = await response.json();
  return Array.isArray(payload.documents) ? payload.documents : [];
}

export async function uploadDocument(file) {
  const validationMessage = validateDocumentFile(file);
  if (validationMessage) throw new ApiError(validationMessage, 'INVALID_FILE');

  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  return payload.document;
}

export async function downloadDocument(id) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`);
  return response.blob();
}