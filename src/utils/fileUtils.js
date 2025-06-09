const fs = require('fs').promises;
const path = require('path');
const { createReadStream } = require('fs');
const mime = require('mime-types');

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Save file to disk
 * @param {string} filePath - Path to save the file
 * @param {Buffer|string} content - File content
 * @returns {Promise<string>} - Path to the saved file
 */
async function saveFile(filePath, content) {
  const dirPath = path.dirname(filePath);
  await ensureDirectoryExists(dirPath);
  await fs.writeFile(filePath, content);
  return filePath;
}

/**
 * Read file as string
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - File content
 */
async function readFile(filePath) {
  return await fs.readFile(filePath, 'utf8');
}

/**
 * Get file info (size, mime type, extension)
 * @param {string} filePath - Path to the file
 * @returns {Promise<Object>} - File info
 */
async function getFileInfo(filePath) {
  const stats = await fs.stat(filePath);
  const ext = path.extname(filePath).toLowerCase();
  
  return {
    path: filePath,
    name: path.basename(filePath),
    size: stats.size,
    mime: mime.lookup(ext) || 'application/octet-stream',
    ext: ext.replace('.', '')
  };
}

/**
 * Create a read stream with proper error handling
 * @param {string} filePath - Path to the file
 * @returns {ReadStream} - File read stream
 */
function createFileStream(filePath) {
  return createReadStream(filePath);
}

module.exports = {
  ensureDirectoryExists,
  saveFile,
  readFile,
  getFileInfo,
  createFileStream
};
