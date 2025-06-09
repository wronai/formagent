import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import logger from '../utils/logger.js';

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
   * Fill form fields based on field mapping
   * @param {Object} fieldMapping - Field mapping configuration
   */
  async fillFormFields(fieldMapping) {
    for (const [selector, fieldConfig] of Object.entries(fieldMapping)) {
      try {
        const { type = 'text', value, options } = fieldConfig;
        const fieldValue = value || this.getFieldValue(fieldConfig);
        
        if (!fieldValue) {
          logger.warn(`No value found for field: ${selector}`);
          continue;
        }

        switch (type.toLowerCase()) {
          case 'text':
          case 'email':
          case 'tel':
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
            
          default:
            logger.warn(`Unsupported field type: ${type} for selector: ${selector}`);
        }
        
        // Add small delay between fields
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        logger.error(`Error filling field ${selector}: ${error.message}`);
      }
    }
  }

  /**
   * Get field value from profile data
   * @param {Object} fieldConfig - Field configuration
   * @returns {string|number|boolean|Array} Field value
   */
  getFieldValue(fieldConfig) {
    if (!fieldConfig.field) {
      return fieldConfig.value || '';
    }

    // Support nested fields (e.g., 'personal.name')
    const fieldPath = fieldConfig.field.split('.');
    let value = this.profileData;
    
    for (const key of fieldPath) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return fieldConfig.default || '';
      }
    }
    
    return value || fieldConfig.default || '';
  }

  /**
   * Main method to handle form submission
   * Must be implemented by child classes
   */
  async handle() {
    throw new Error('Method not implemented');
  }
}
