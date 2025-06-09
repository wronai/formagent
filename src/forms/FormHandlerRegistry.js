import logger from '../utils/logger.js';

/**
 * Registry for form handlers
 */
class FormHandlerRegistry {
  constructor() {
    this.handlers = new Map();
  }

  /**
   * Register a new form handler
   * @param {string} name - Handler name
   * @param {Function} handler - Handler class
   */
  register(name, handler) {
    if (this.handlers.has(name)) {
      logger.warn(`Handler with name '${name}' already exists, overwriting`);
    }
    this.handlers.set(name, handler);
    logger.debug(`Registered form handler: ${name}`);
  }

  /**
   * Get a form handler by name
   * @param {string} name - Handler name
   * @returns {Function} Handler class or undefined if not found
   */
  getHandler(name) {
    return this.handlers.get(name);
  }

  /**
   * Get all registered handlers
   * @returns {Map} Map of all registered handlers
   */
  getHandlers() {
    return new Map(this.handlers);
  }

  /**
   * Find a matching handler for a URL
   * @param {string} url - URL to match against
   * @returns {Function|null} Matching handler class or null if none found
   */
  findMatchingHandler(url) {
    for (const [name, handler] of this.handlers.entries()) {
      if (handler.matches && handler.matches(url)) {
        return handler;
      }
      
      // Check if URL contains handler name as fallback
      if (url.toLowerCase().includes(name.toLowerCase())) {
        return handler;
      }
    }
    return null;
  }
}

// Create and export a singleton instance
export const formHandlerRegistry = new FormHandlerRegistry();

// Auto-import and register all handlers in the handlers directory
const importHandlers = async () => {
  try {
    const { globby } = await import('globby');
    const handlerFiles = await globby(['src/forms/handlers/**/*.js']);
    
    for (const file of handlerFiles) {
      try {
        const module = await import(`../../${file}`);
        for (const [name, handler] of Object.entries(module)) {
          if (name.endsWith('Handler') && handler !== FormHandlerRegistry) {
            const handlerName = name.replace(/Handler$/, '').toLowerCase();
            formHandlerRegistry.register(handlerName, handler);
          }
        }
      } catch (error) {
        logger.error(`Error importing handler from ${file}:`, error);
      }
    }
  } catch (error) {
    logger.error('Error loading form handlers:', error);
  }
};

// Initialize the registry
importHandlers().catch(error => {
  logger.error('Failed to initialize form handlers:', error);
});

export default formHandlerRegistry;
