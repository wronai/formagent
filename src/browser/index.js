import BrowserManager from './BrowserManager.js';
import PageNavigation from './PageNavigation.js';
import FormFiller from './FormFiller.js';
import ElementInteractor from './ElementInteractor.js';
import FileHandler from './FileHandler.js';

/**
 * Main browser automation class that provides a unified interface
 * for all browser interactions.
 */
class BrowserAutomation {
  /**
   * Create a new BrowserAutomation instance
   * @param {Object} [options] - Browser options
   * @param {boolean} [options.headless=true] - Run in headless mode
   * @param {string} [options.downloadsDir='./downloads'] - Directory for downloads
   */
  constructor({ headless = true, downloadsDir = './downloads' } = {}) {
    this.browserManager = new BrowserManager();
    this.navigation = null;
    this.form = null;
    this.element = null;
    this.file = null;
    this.options = { headless, downloadsDir };
  }

  /**
   * Initialize the browser and all components
   * @param {Object} [options] - Browser initialization options
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    const mergedOptions = { ...this.options, ...options };
    
    // Initialize the browser
    await this.browserManager.initialize(mergedOptions);
    
    // Initialize components
    this.navigation = new PageNavigation(this.browserManager);
    this.form = new FormFiller(this.browserManager);
    this.element = new ElementInteractor(this.browserManager);
    this.file = new FileHandler(this.browserManager, mergedOptions.downloadsDir);
    
    return this;
  }

  /**
   * Close the browser and clean up resources
   * @returns {Promise<void>}
   */
  async close() {
    await this.browserManager.close();
  }

  /**
   * Get the current page
   * @returns {import('playwright').Page}
   */
  getPage() {
    return this.browserManager.getPage();
  }

  /**
   * Create a new browser context
   * @param {Object} [options] - Context options
   * @returns {Promise<import('playwright').BrowserContext>}
   */
  async newContext(options = {}) {
    return this.browserManager.newContext(options);
  }

  /**
   * Create a new page in the current context
   * @returns {Promise<import('playwright').Page>}
   */
  async newPage() {
    return this.browserManager.newPage();
  }
}

export { default as BrowserAutomation };
