const path = require('node:path');

const backendRoot = path.resolve(__dirname, '..');
const maxFileSize = Number(process.env.MAX_FILE_SIZE ?? 10 * 1024 * 1024);

if (!Number.isSafeInteger(maxFileSize) || maxFileSize <= 0) {
  throw new Error('MAX_FILE_SIZE deve ser um inteiro positivo.');
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  storageDir: process.env.STORAGE_DIR
    ? path.resolve(process.env.STORAGE_DIR)
    : path.join(backendRoot, 'storage'),
  maxFileSize,
  defaultOwnerId: process.env.DEFAULT_OWNER_ID || 'demo-user',
};