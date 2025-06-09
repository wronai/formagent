import { chromium } from 'playwright';
import logger from '../utils/logger.js';

/**
 * Manages browser lifecycle and provides core browser interactions
 */
class BrowserManager {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  /**
   * Initialize a new browser instance
   * @param {Object} options - Browser options
   * @param {boolean} [options.headless=true] - Run in headless mode
   * @param {Object} [options.viewport] - Viewport configuration
   * @param {string} [options.userAgent] - Custom user agent
   * @param {Object} [options.contextOptions] - Additional context options
   * @returns {Promise<void>}
   */
  async initialize({ 
    headless = true, 
    viewport = { width: 1280, height: 1024 },
    userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    ...contextOptions
  } = {}) {
    try {
      this.browser = await chromium.launch({ headless });
      this.context = await this.browser.newContext({
        viewport,
        userAgent,
        ...contextOptions
      });
      this.page = await this.context.newPage();
      logger.info('Browser initialized');
    } catch (error) {
      logger.error('Error initializing browser:', error);
      await this.close();
      throw error;
    }
  }

  /**
   * Close the browser and all its contexts
   * @returns {Promise<void>}
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      logger.info('Browser closed');
    }
  }

  /**
   * Get the current page
   * @returns {import('playwright').Page} The current page
   * @throws {Error} If browser is not initialized
   */
  getPage() {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }
    return this.page;
  }

  /**
   * Create a new browser context
   * @param {Object} [options] - Context options
   * @returns {Promise<import('playwright').BrowserContext>} The new context
   */
  async newContext(options = {}) {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }
    this.context = await this.browser.newContext(options);
    this.page = await this.context.newPage();
    return this.context;
  }

  /**
   * Create a new page in the current context
   * @returns {Promise<import('playwright').Page>} The new page
   */
  async newPage() {
    if (!this.context) {
      throw new Error('No browser context available');
    }
    this.page = await this.context.newPage();
    return this.page;
  }
}

export default BrowserManager;