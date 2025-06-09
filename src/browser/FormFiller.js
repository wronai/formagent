const logger = require('../utils/logger');

/**
 * Handles form filling and submission
 */
class FormFiller {
  /**
   * @param {import('./BrowserManager')} browserManager - Instance of BrowserManager
   */
  constructor(browserManager) {
    this.browserManager = browserManager;
  }

  /**
   * Fill a form field
   * @param {string} selector - CSS selector for the input field
   * @param {string|number} value - Value to fill
   * @param {Object} [options] - Fill options
   * @param {boolean} [options.clear=true] - Whether to clear the field before filling
   * @param {number} [options.timeout=5000] - Timeout in milliseconds
   * @returns {Promise<void>}
   */
  async fill(selector, value, { clear = true, timeout = 5000 } = {}) {
    const page = this.browserManager.getPage();
    logger.debug(`Filling field: ${selector} with value: ${value}`);
    
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      
      if (clear) {
        await page.fill(selector, '');
      }
      
      await page.type(selector, String(value), { delay: 100 });
      logger.debug(`Successfully filled field: ${selector}`);
    } catch (error) {
      logger.error(`Error filling field ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Select an option from a dropdown
   * @param {string} selector - CSS selector for the select element
   * @param {string|number|string[]} values - Value(s) to select
   * @param {Object} [options] - Select options
   * @param {number} [options.timeout=5000] - Timeout in milliseconds
   * @returns {Promise<void>}
   */
  async select(selector, values, { timeout = 5000 } = {}) {
    const page = this.browserManager.getPage();
    logger.debug(`Selecting option(s) from: ${selector}`);
    
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      await page.selectOption(selector, values);
      logger.debug(`Successfully selected option(s) from: ${selector}`);
    } catch (error) {
      logger.error(`Error selecting option from ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Check or uncheck a checkbox or radio button
   * @param {string} selector - CSS selector for the checkbox/radio
   * @param {boolean} [checked=true] - Whether to check or uncheck
   * @param {Object} [options] - Check options
   * @param {number} [options.timeout=5000] - Timeout in milliseconds
   * @returns {Promise<void>}
   */
  async setChecked(selector, checked = true, { timeout = 5000 } = {}) {
    const page = this.browserManager.getPage();
    const action = checked ? 'checking' : 'unchecking';
    logger.debug(`${action} checkbox/radio: ${selector}`);
    
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      
      if (checked) {
        await page.check(selector);
      } else {
        await page.uncheck(selector);
      }
      
      logger.debug(`Successfully ${action} checkbox/radio: ${selector}`);
    } catch (error) {
      logger.error(`Error ${action} ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Submit a form
   * @param {string} [selector] - Optional form selector
   * @param {Object} [options] - Submit options
   * @param {number} [options.timeout=30000] - Navigation timeout in milliseconds
   * @returns {Promise<import('playwright').Response>}
   */
  async submitForm(selector, { timeout = 30000 } = {}) {
    const page = this.browserManager.getPage();
    logger.debug(`Submitting form${selector ? `: ${selector}` : ''}`);
    
    try {
      if (selector) {
        await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
        return Promise.all([
          page.waitForNavigation({ timeout }),
          page.$eval(selector, form => form.submit())
        ]);
      }
      
      // If no selector provided, try to find the first form
      return Promise.all([
        page.waitForNavigation({ timeout }),
        page.$eval('form:first-of-type', form => form.submit())
      ]);
    } catch (error) {
      logger.error('Error submitting form:', error);
      throw error;
    }
  }
}

module.exports = FormFiller;
