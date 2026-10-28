const fs = require('node:fs/promises');
const path = require('node:path');
const { storageDir } = require('../config');

const documents = new Map();

function add(document) {
  documents.set(document.id, { ...document });
}

function findById(id) {
  const document = documents.get(id);
  return document ? { ...document } : null;
}

function findByOwner(owner) {
  return [...documents.values()]
    .filter((document) => document.owner === owner)
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
    .map((document) => ({ ...document }));
}

function getFilePath(document) {
  return path.join(storageDir, document.storageKey);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function removeStoredFile(storageKey) {
  if (path.basename(storageKey) !== storageKey) return;

  try {
    await fs.unlink(path.join(storageDir, storageKey));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

module.exports = {
  add,
  findById,
  findByOwner,
  getFilePath,
  fileExists,
  removeStoredFile,
};