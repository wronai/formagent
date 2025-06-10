import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import logger from '../utils/logger.js';
import { fieldMapper } from '../services/FieldMapper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Base class for form handlers
 */
export default class BaseFormHandler {
  /**
   * Create a new form handler
   * @param {Object} browser - BrowserAutomation instance
   * @param {string} url - Form URL
   * @param {Object} profileData - User profile data
   * @param {string} outputDir - Output directory for screenshots and data
   */
  constructor(browser, url, profileData, outputDir = './out') {
    this.browser = browser;
    this.url = url;
    this.profileData = profileData;
    this.outputDir = outputDir;
    this.outputPath = '';
    this.screenshots = [];
  }

  /**
   * Initialize the form handler
   */
  async init() {
    // Create output directory
    this.outputPath = path.join(
      process.cwd(),
      this.outputDir,
      String(this.url.lineNumber || '0')
    );
    
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
      logger.info(`Created output directory: ${this.outputPath}`);
    } catch (error) {
      logger.error(`Error creating output directory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Take a screenshot and save it
   * @param {string} name - Screenshot name (without extension)
   */
  async takeScreenshot(name) {
    try {
      const screenshotPath = path.join(this.outputPath, `${name}.png`);
      await this.browser.file.takeScreenshot({
        path: screenshotPath,
        fullPage: true
      });
      this.screenshots.push(screenshotPath);
      return screenshotPath;
    } catch (error) {
      logger.error(`Error taking screenshot: ${error.message}`);
      return null;
    }
  }

  /**
   * Save form data to JSON file
   * @param {Object} data - Data to save
   */
  async saveFormData(data) {
    try {
      const dataPath = path.join(this.outputPath, 'data.json');
      await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
      return dataPath;
    } catch (error) {
      logger.error(`Error saving form data: ${error.message}`);
      return null;
    }
  }

  /**
   * Save form data to Markdown file
   * @param {Object} data - Data to save
   */
  async saveMarkdown(data) {
    try {
      const mdPath = path.join(this.outputPath, 'data.md');
      let content = `# Form Submission Data\n\n`;
      
      // Add timestamp
      content += `## Submission Details\n`;
      content += `- **Timestamp**: ${new Date().toISOString()}\n`;
      content += `- **URL**: ${this.url}\n\n`;
      
      // Add form data
      content += `## Form Data\n\n`;
      for (const [key, value] of Object.entries(data)) {
        content += `### ${key}\n${value}\n\n`;
      }
      
      // Add screenshots list
      if (this.screenshots.length > 0) {
        content += `## Screenshots\n\n`;
        this.screenshots.forEach((screenshot, index) => {
          const relPath = path.relative(process.cwd(), screenshot);
          content += `${index + 1}. ![Screenshot ${index + 1}](${relPath})\n`;
        });
      }
      
      await fs.writeFile(mdPath, content);
      return mdPath;
    } catch (error) {
      logger.error(`Error saving markdown: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all form fields with their properties
   * @returns {Promise<Array>} Array of form field objects
   */
  async getFormFields() {
    try {
      return await this.browser.page.evaluate(() => {
        const fields = [];
        const formElements = document.forms.flatMap(form => Array.from(form.elements));
        
        for (const element of formElements) {
          if (!element.name && !element.id) continue;
          
          const field = {
            selector: element.name ? `[name="${element.name}"]` : `#${element.id}`,
            name: element.name || '',
            id: element.id || '',
            type: element.type || 'text',
            tagName: element.tagName,
            label: element.labels?.[0]?.textContent.trim() || '',
            placeholder: element.placeholder || '',
            value: element.value || '',
            options: element.tagName === 'SELECT' ? 
              Array.from(element.options).map(opt => ({
                value: opt.value,
                text: opt.textContent.trim()
              })) : []
          };
          
          fields.push(field);
        }
        
        return fields;
      });
    } catch (error) {
      logger.error(`Error getting form fields: ${error.message}`);
      return [];
    }
  }

  /**
   * Map form fields to profile data using LLM
   * @param {Array} fields - Form fields to map
   * @returns {Promise<Object>} Field mappings
   */
  async mapFieldsToProfile(fields) {
    const mappings = {};
    const website = new URL(this.url).hostname;
    
    for (const field of fields) {
      try {
        const mapping = await fieldMapper.getMapping(
          website,
          field.name || field.id,
          field.type,
          field.label
        );
        
        if (mapping?.fieldPath) {
          mappings[field.selector] = {
            type: field.type,
            field: mapping.fieldPath,
            confidence: mapping.confidence,
            source: 'llm',
            notes: mapping.notes
          };
        }
      } catch (error) {
        logger.warn(`Error mapping field ${field.name || field.id}: ${error.message}`);
      }
    }
    
    return mappings;
  }

  /**
   * Fill form fields based on field mapping
   * @param {Object} fieldMapping - Field mapping configuration
   * @param {boolean} autoMap - Whether to auto-map unmapped fields
   */
  async fillFormFields(fieldMapping = {}, autoMap = true) {
    try {
      // Get all form fields
      const formFields = await this.getFormFields();
      
      // Auto-map fields if enabled
      let autoMappings = {};
      if (autoMap) {
        const unmappedFields = formFields.filter(field => !Object.values(fieldMapping).some(m => m.selector === field.selector));
        autoMappings = await this.mapFieldsToProfile(unmappedFields);
      }
      
      // Combine manual and auto mappings
      const allMappings = { ...autoMappings, ...fieldMapping };
      
      // Fill each field
      for (const [selector, fieldConfig] of Object.entries(allMappings)) {
        try {
          const { type = 'text', value, field, options } = fieldConfig;
          const fieldValue = value || (field ? this.getFieldValue(fieldConfig) : '');
          
          if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
            logger.warn(`No value found for field: ${selector}`);
            continue;
          }

          logger.debug(`Filling field: ${selector} (${type}) with value: ${fieldValue}`);
          
          switch (type.toLowerCase()) {
            case 'text':
            case 'email':
            case 'tel':
            case 'url':
              await this.browser.form.fill(selector, String(fieldValue));
              break;
              
            case 'select':
              await this.browser.form.select(selector, fieldValue, { exact: true });
              break;
              
            case 'checkbox':
            case 'radio':
              await this.browser.form.setChecked(selector, Boolean(fieldValue));
              break;
              
            case 'file':
              await this.browser.file.uploadFile(selector, fieldValue);
              break;
              
            case 'date':
              await this.browser.form.fill(selector, new Date(fieldValue).toISOString().split('T')[0]);
              break;
              
            default:
              logger.warn(`Unsupported field type: ${type} for selector: ${selector}`);
          }
          
          // Add small delay between fields
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          logger.error(`Error filling field ${selector}: ${error.message}`);
        }
      }
      
      return { mappings: allMappings, autoMapped: Object.keys(autoMappings).length };
      
    } catch (error) {
      logger.error(`Error in fillFormFields: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get field value from profile data using dot notation path
   * @param {string|Object} fieldPath - Dot notation path to the field or field config object
   * @param {*} defaultValue - Default value if field not found
   * @returns {string|number|boolean|Array|Object} Field value
   */
  getFieldValue(fieldPath, defaultValue = '') {
    // Handle both string path and config object
    const path = typeof fieldPath === 'string' ? fieldPath : fieldPath?.field;
    const defaultVal = typeof fieldPath === 'object' ? fieldPath.default : defaultValue;
    
    if (!path) {
      return defaultVal;
    }

    // Support nested fields (e.g., 'personal.name')
    const keys = path.split('.');
    let value = this.profileData;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultVal;
      }
    }
    
    // Handle special cases
    if (value === undefined || value === null) {
      return defaultVal;
    }
    
    // Format dates
    if (path.endsWith('Date') || path.endsWith('date') || 
        (Array.isArray(value) && value[0]?.date)) {
      if (Array.isArray(value)) {
        return value.map(item => ({
          ...item,
          startDate: item.startDate ? new Date(item.startDate).toLocaleDateString() : '',
          endDate: item.endDate ? new Date(item.endDate).toLocaleDateString() : ''
        }));
      }
      return new Date(value).toLocaleDateString();
    }
    
    return value || defaultVal;
  }
  
  /**
   * Format a value based on its type and context
   * @param {*} value - Value to format
   * @param {string} type - Value type (date, array, etc.)
   * @returns {string} Formatted value
   */
  formatValue(value, type) {
    if (value === undefined || value === null) return '';
    
    switch (type) {
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'array':
        return Array.isArray(value) ? value.join(', ') : String(value);
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return String(value);
    }
  }

  /**
   * Main method to handle form submission
   * Must be implemented by child classes
   */
  async handle() {
    throw new Error('Method not implemented');
  }
}
