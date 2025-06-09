import logger from '../utils/logger.js';

/**
 * Handles element interactions and assertions
 */
class ElementInteractor {
  /**
   * @param {import('./BrowserManager')} browserManager - Instance of BrowserManager
   */
  constructor(browserManager) {
    this.browserManager = browserManager;
  }

  /**
   * Click an element
   * @param {string} selector - CSS selector for the element
   * @param {Object} [options] - Click options
   * @param {number} [options.timeout=5000] - Timeout in milliseconds
   * @param {boolean} [options.waitForNavigation=false] - Wait for navigation after click
   * @param {number} [options.navigationTimeout=30000] - Navigation timeout in milliseconds
   * @returns {Promise<void>}
   */
  async click(selector, { 
    timeout = 5000, 
    waitForNavigation = false,
    navigationTimeout = 30000 
  } = {}) {
    const page = this.browserManager.getPage();
    logger.debug(`Clicking element: ${selector}`);
    
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      
      if (waitForNavigation) {
        await Promise.all([
          page.waitForNavigation({ timeout: navigationTimeout }),
          page.click(selector, { timeout })
        ]);
      } else {
        await page.click(selector, { timeout });
      }
      
      logger.debug(`Successfully clicked element: ${selector}`);
    } catch (error) {
      logger.error(`Error clicking element ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Double click an element
   * @param {string} selector - CSS selector for the element
   * @param {Object} [options] - Click options
   * @param {number} [options.timeout=5000] - Timeout in milliseconds
   * @returns {Promise<void>}
   */
  async dblclick(selector, { timeout = 5000 } = {}) {
    const page = this.browserManager.getPage();
    logger.debug(`Double clicking element: ${selector}`);
    
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      await page.dblclick(selector, { timeout });
      logger.debug(`Successfully double clicked element: ${selector}`);
    } catch (error) {
      logger.error(`Error double clicking element ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Hover over an element
   * @param {string} selector - CSS selector for the element
   * @param {Object} [options] - Hover options
   * @param {number} [options.timeout=5000] - Timeout in milliseconds
   * @returns {Promise<void>}
   */
  async hover(selector, { timeout = 5000 } = {}) {
    const page = this.browserManager.getPage();
    logger.debug(`Hovering over element: ${selector}`);
    
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      await page.hover(selector, { timeout });
      logger.debug(`Successfully hovered over element: ${selector}`);
    } catch (error) {
      logger.error(`Error hovering over element ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Get text content of an element
   * @param {string} selector - CSS selector for the element
   * @param {Object} [options] - Options
   * @param {number} [options.timeout=5000] - Timeout in milliseconds
   * @returns {Promise<string>} The text content
   */
  async getText(selector, { timeout = 5000 } = {}) {
    const page = this.browserManager.getPage();
    
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      const text = await page.textContent(selector);
      return text.trim();
    } catch (error) {
      logger.error(`Error getting text from ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Check if an element is visible
   * @param {string} selector - CSS selector for the element
   * @param {Object} [options] - Options
   * @param {number} [options.timeout=5000] - Timeout in milliseconds
   * @returns {Promise<boolean>} True if element is visible
   */
  async isVisible(selector, { timeout = 5000 } = {}) {
    const page = this.browserManager.getPage();
    
    try {
      await page.waitForSelector(selector, { 
        state: 'visible', 
        timeout 
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default ElementInteractor;
