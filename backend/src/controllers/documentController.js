const fs = require('node:fs');
const documentService = require('../services/documentService');
const DocumentError = require('../services/documentError');

async function upload(req, res) {
  const document = await documentService.createDocument(req.file, req.documentId);
  res.status(201).json({ document });
}

function list(req, res) {
  res.status(200).json({ documents: documentService.listDocuments() });
}

async function download(req, res, next) {
  const { document, filePath } = await documentService.getDocumentForDownload(req.params.id);
  const stream = fs.createReadStream(filePath);

  stream.on('error', (error) => {
    if (res.headersSent) {
      res.destroy(error);
      return;
    }

    if (error.code === 'ENOENT') {
      next(new DocumentError('FILE_NOT_FOUND', 'Arquivo do documento não encontrado.'));
      return;
    }

    next(new DocumentError('STORAGE_ERROR', 'Não foi possível ler o documento.'));
  });

  res.attachment(document.originalName);
  res.type(document.contentType);
  res.setHeader('Content-Length', document.size);
  stream.pipe(res);
}

module.exports = { upload, list, download };