const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Handles file uploads and downloads
 */
class FileHandler {
  /**
   * @param {import('./BrowserManager')} browserManager - Instance of BrowserManager
   * @param {string} [downloadsDir='./downloads'] - Directory to save downloaded files
   */
  constructor(browserManager, downloadsDir = './downloads') {
    this.browserManager = browserManager;
    this.downloadsDir = downloadsDir;
  }

  /**
   * Upload a file to a file input
   * @param {string} selector - CSS selector for the file input
   * @param {string|string[]} filePaths - Path(s) to the file(s) to upload
   * @param {Object} [options] - Upload options
   * @param {number} [options.timeout=5000] - Timeout in milliseconds
   * @returns {Promise<void>}
   */
  async uploadFile(selector, filePaths, { timeout = 5000 } = {}) {
    const page = this.browserManager.getPage();
    const files = Array.isArray(filePaths) ? filePaths : [filePaths];
    
    logger.debug(`Uploading ${files.length} file(s) to: ${selector}`);
    
    try {
      // Ensure all files exist
      for (const filePath of files) {
        try {
          await fs.access(filePath);
        } catch (error) {
          throw new Error(`File not found: ${filePath}`);
        }
      }
      
      await page.waitForSelector(selector, { state: 'visible', timeout });
      
      // Handle single or multiple file uploads
      const fileInput = await page.$(selector);
      if (!fileInput) {
        throw new Error(`File input not found: ${selector}`);
      }
      
      await fileInput.setInputFiles(files);
      logger.debug(`Successfully uploaded ${files.length} file(s) to: ${selector}`);
    } catch (error) {
      logger.error(`Error uploading file(s) to ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Wait for a file to be downloaded
   * @param {Object} [options] - Download options
   * @param {number} [options.timeout=30000] - Timeout in milliseconds
   * @returns {Promise<string>} Path to the downloaded file
   */
  async waitForDownload({ timeout = 30000 } = {}) {
    const page = this.browserManager.getPage();
    let download;
    
    try {
      // Ensure downloads directory exists
      await fs.mkdir(this.downloadsDir, { recursive: true });
      
      // Wait for download to start
      const [downloadPromise] = await Promise.all([
        page.waitForEvent('download', { timeout }),
        // Trigger download if needed (e.g., by clicking a download button)
        // page.click(selector, { timeout: 10000 })
      ]);
      
      // Wait for the download to complete
      download = downloadPromise;
      const suggestedFilename = download.suggestedFilename();
      const filePath = path.join(this.downloadsDir, suggestedFilename);
      
      await download.saveAs(filePath);
      logger.info(`File downloaded: ${filePath}`);
      
      return filePath;
    } catch (error) {
      logger.error('Error downloading file:', error);
      
      // Clean up partial download if it exists
      if (download) {
        try {
          await download.cancel();
        } catch (e) {
          logger.warn('Error cancelling download:', e);
        }
      }
      
      throw error;
    }
  }

  /**
   * Take a screenshot
   * @param {Object} [options] - Screenshot options
   * @param {string} [options.path] - Path to save the screenshot
   * @param {boolean} [options.fullPage=false] - Whether to capture the full page
   * @param {string} [options.type='png'] - Image type (png, jpeg)
   * @returns {Promise<Buffer>} Screenshot buffer
   */
  async takeScreenshot({ 
    path: filePath,
    fullPage = false,
    type = 'png' 
  } = {}) {
    const page = this.browserManager.getPage();
    
    try {
      const screenshot = await page.screenshot({
        path: filePath,
        fullPage,
        type,
      });
      
      if (filePath) {
        logger.info(`Screenshot saved to: ${filePath}`);
      }
      
      return screenshot;
    } catch (error) {
      logger.error('Error taking screenshot:', error);
      throw error;
    }
  }
}

module.exports = FileHandler;
