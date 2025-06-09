const logger = require('../utils/logger');

/**
 * Handles page navigation and basic interactions
 */
class PageNavigation {
  /**
   * @param {import('./BrowserManager')} browserManager - Instance of BrowserManager
   */
  constructor(browserManager) {
    this.browserManager = browserManager;
  }

  /**
   * Navigate to a URL
   * @param {string} url - The URL to navigate to
   * @param {Object} [options] - Navigation options
   * @param {number} [options.timeout=30000] - Navigation timeout in milliseconds
   * @param {'load'|'domcontentloaded'|'networkidle'} [options.waitUntil='load'] - When to consider navigation succeeded
   * @returns {Promise<import('playwright').Response>}
   */
  async goto(url, { 
    timeout = 30000, 
    waitUntil = 'load' 
  } = {}) {
    const page = this.browserManager.getPage();
    logger.info(`Navigating to: ${url}`);
    
    try {
      const response = await page.goto(url, { 
        waitUntil, 
        timeout 
      });
      logger.info(`Navigation successful: ${url}`);
      return response;
    } catch (error) {
      logger.error(`Failed to navigate to ${url}:`, error);
      throw error;
    }
  }

  /**
   * Reload the current page
   * @param {Object} [options] - Reload options
   * @param {number} [options.timeout=30000] - Navigation timeout in milliseconds
   * @param {'load'|'domcontentloaded'|'networkidle'} [options.waitUntil='load'] - When to consider navigation succeeded
   * @returns {Promise<import('playwright').Response>}
   */
  async reload(options = {}) {
    const page = this.browserManager.getPage();
    logger.info('Reloading page');
    return page.reload(options);
  }

  /**
   * Go back to the previous page
   * @param {Object} [options] - Navigation options
   * @param {number} [options.timeout=30000] - Navigation timeout in milliseconds
   * @param {'load'|'domcontentloaded'|'networkidle'} [options.waitUntil='load'] - When to consider navigation succeeded
   * @returns {Promise<import('playwright').Response>}
   */
  async goBack(options = {}) {
    const page = this.browserManager.getPage();
    logger.info('Navigating back');
    return page.goBack(options);
  }

  /**
   * Get the current page URL
   * @returns {string} The current URL
   */
  getCurrentUrl() {
    const page = this.browserManager.getPage();
    return page.url();
  }

  /**
   * Get the current page title
   * @returns {Promise<string>} The page title
   */
  async getTitle() {
    const page = this.browserManager.getPage();
    return page.title();
  }
}

module.exports = PageNavigation;
