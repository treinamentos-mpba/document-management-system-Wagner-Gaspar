const multer = require('multer');

const errorResponses = {
  FILE_REQUIRED: [400, 'Envie um arquivo no campo file.'],
  UNSUPPORTED_FILE_TYPE: [400, 'Formato de arquivo não permitido. Envie PDF, DOCX ou TXT.'],
  INVALID_MULTIPART: [400, 'Requisição multipart inválida.'],
  FILE_TOO_LARGE: [413, 'O arquivo excede o limite permitido.'],
  DOCUMENT_NOT_FOUND: [404, 'Documento não encontrado.'],
  FILE_NOT_FOUND: [404, 'Arquivo do documento não encontrado.'],
  STORAGE_ERROR: [500, 'Não foi possível acessar o armazenamento local.'],
};

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  let code = error.code;
  if (error instanceof multer.MulterError) {
    code = error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'INVALID_MULTIPART';
  }
  if (!errorResponses[code] && req.method === 'POST' && req.path === '/upload') {
    code = 'STORAGE_ERROR';
  }

  const [status, message] = errorResponses[code] || [500, 'Erro interno do servidor.'];
  if (!errorResponses[code]) code = 'INTERNAL_ERROR';

  res.status(status).json({ error: { code, message } });
}

module.exports = errorHandler;