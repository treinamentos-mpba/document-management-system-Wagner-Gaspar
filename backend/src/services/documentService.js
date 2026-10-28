const path = require('node:path');
const documentRepository = require('../repositories/documentRepository');
const { defaultOwnerId } = require('../config');
const DocumentError = require('./documentError');

function toPublicDocument(document) {
  const { storageKey, ...publicDocument } = document;
  return publicDocument;
}

function sanitizeOriginalName(originalName) {
  const basename = path.basename(originalName.replace(/\\/g, '/'));
  const sanitized = basename.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return sanitized || 'document';
}

async function createDocument(file, id) {
  if (!file) {
    throw new DocumentError('FILE_REQUIRED', 'Envie um arquivo no campo file.');
  }

  const document = {
    id,
    originalName: sanitizeOriginalName(file.originalname),
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner: defaultOwnerId,
    contentType: file.mimetype,
    storageKey: file.filename,
  };

  try {
    documentRepository.add(document);
    return toPublicDocument(document);
  } catch (error) {
    try {
      await documentRepository.removeStoredFile(file.filename);
    } catch {
      // Preserva o erro original; a falha de limpeza não deve mascará-lo.
    }
    throw new DocumentError('STORAGE_ERROR', 'Não foi possível armazenar o documento.');
  }
}

function listDocuments() {
  return documentRepository.findByOwner(defaultOwnerId).map(toPublicDocument);
}

async function getDocumentForDownload(id) {
  const document = documentRepository.findById(id);
  if (!document || document.owner !== defaultOwnerId) {
    throw new DocumentError('DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  const filePath = documentRepository.getFilePath(document);
  try {
    if (!(await documentRepository.fileExists(filePath))) {
      throw new DocumentError('FILE_NOT_FOUND', 'Arquivo do documento não encontrado.');
    }
  } catch (error) {
    if (error instanceof DocumentError) throw error;
    throw new DocumentError('STORAGE_ERROR', 'Não foi possível ler o documento.');
  }

  return { document: toPublicDocument(document), filePath };
}

module.exports = {
  createDocument,
  listDocuments,
  getDocumentForDownload,
};