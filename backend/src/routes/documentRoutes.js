const { Router } = require('express');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs/promises');
const multer = require('multer');
const { storageDir, maxFileSize } = require('../config');
const DocumentError = require('../services/documentError');
const documentController = require('../controllers/documentController');

const allowedTypes = new Map([
  ['.pdf', 'application/pdf'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['.txt', 'text/plain'],
]);

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(storageDir, { recursive: true })
      .then(() => callback(null, storageDir), () => callback(new DocumentError(
        'STORAGE_ERROR',
        'Não foi possível acessar o armazenamento local.',
      )));
  },
  filename(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    req.documentId = randomUUID();
    callback(null, `${req.documentId}${extension}`);
  },
});

const uploadFile = multer({
  storage,
  limits: { fileSize: maxFileSize, files: 1, fields: 0 },
  fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.get(extension) !== file.mimetype) {
      callback(new DocumentError(
        'UNSUPPORTED_FILE_TYPE',
        'Formato de arquivo não permitido. Envie PDF, DOCX ou TXT.',
      ));
      return;
    }

    callback(null, true);
  },
}).single('file');

const router = Router();

router.post('/upload', uploadFile, documentController.upload);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', documentController.download);

module.exports = router;