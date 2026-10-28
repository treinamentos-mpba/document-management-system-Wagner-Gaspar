const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-backend-test-'));
process.env.STORAGE_DIR = storageDir;
process.env.DEFAULT_OWNER_ID = 'test-user';
process.env.MAX_FILE_SIZE = '32';
const app = require('../src/app');

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('upload, listagem e download de documentos', async (t) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    fs.rmSync(storageDir, { recursive: true, force: true });
  });

  const emptyListResponse = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(emptyListResponse.status, 200);
  assert.deepStrictEqual(await emptyListResponse.json(), { documents: [] });

  const missingFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: new FormData(),
  });
  assert.strictEqual(missingFileResponse.status, 400);
  assert.strictEqual((await missingFileResponse.json()).error.code, 'FILE_REQUIRED');

  const invalidFileForm = new FormData();
  invalidFileForm.append('file', new Blob(['bad type'], { type: 'text/plain' }), 'bad.pdf');
  const invalidFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: invalidFileForm,
  });
  assert.strictEqual(invalidFileResponse.status, 400);
  assert.strictEqual((await invalidFileResponse.json()).error.code, 'UNSUPPORTED_FILE_TYPE');

  const oversizedForm = new FormData();
  oversizedForm.append('file', new Blob(['x'.repeat(33)], { type: 'text/plain' }), 'large.txt');
  const oversizedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: oversizedForm,
  });
  assert.strictEqual(oversizedResponse.status, 413);
  assert.strictEqual((await oversizedResponse.json()).error.code, 'FILE_TOO_LARGE');

  const content = 'document content';
  const uploadForm = new FormData();
  uploadForm.append('file', new Blob([content], { type: 'application/pdf' }), 'report.pdf');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: uploadForm,
  });
  assert.strictEqual(uploadResponse.status, 201);
  const { document } = await uploadResponse.json();
  assert.strictEqual(document.originalName, 'report.pdf');
  assert.strictEqual(document.owner, 'test-user');
  assert.strictEqual(document.size, Buffer.byteLength(content));
  assert.match(document.id, /^[0-9a-f-]{36}$/i);

  const storedFiles = fs.readdirSync(storageDir);
  assert.strictEqual(storedFiles.length, 1);
  assert.notStrictEqual(storedFiles[0], 'report.pdf');

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.deepStrictEqual(await listResponse.json(), { documents: [document] });

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.strictEqual(downloadResponse.status, 200);
  assert.strictEqual(downloadResponse.headers.get('content-type'), 'application/pdf');
  assert.match(downloadResponse.headers.get('content-disposition'), /filename="report.pdf"/);
  assert.strictEqual(await downloadResponse.text(), content);

  const notFoundResponse = await fetch(`${baseUrl}/documents/not-a-document/download`);
  assert.strictEqual(notFoundResponse.status, 404);
  assert.strictEqual((await notFoundResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');
});
