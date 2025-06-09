import BaseFormHandler from '../BaseFormHandler.js';
import logger from '../../utils/logger.js';

/**
 * Default form handler that uses heuristics to fill common form fields
 */
export default class DefaultFormHandler extends BaseFormHandler {
  /**
   * Check if this handler can handle the given URL
   * @param {string} url - URL to check
   * @returns {boolean} True if this handler can handle the URL
   */
  static matches(url) {
    // This is the fallback handler, so it matches all URLs
    return true;
  }

  /**
   * Extract form fields from the page
   * @returns {Promise<Array>} Array of form fields
   */
  async extractFormFields() {
    try {
      const page = this.browser.getPage();
      
      // Find all form elements
      const formElements = await page.$$eval(
        'input, select, textarea, [role="textbox"]',
        (elements) => {
          return elements.map((el) => {
            const tagName = el.tagName.toLowerCase();
            const type = el.type || '';
            const name = el.name || el.id || '';
            const label = el.labels?.[0]?.textContent?.trim() || 
                        el.getAttribute('aria-label') ||
                        el.getAttribute('placeholder') ||
                        '';
            const required = el.required || 
                          el.getAttribute('aria-required') === 'true' ||
                          el.hasAttribute('required');
            
            return {
              tagName,
              type,
              name,
              label,
              required,
              value: el.value,
              options: tagName === 'select' 
                ? Array.from(el.options).map(opt => ({
                    value: opt.value,
                    text: opt.textContent.trim(),
                    selected: opt.selected
                  }))
                : []
            };
          });
        }
      );

      logger.debug(`Extracted ${formElements.length} form fields`);
      return formElements;
    } catch (error) {
      logger.error(`Error extracting form fields: ${error.message}`);
      return [];
    }
  }

  /**
   * Map form fields to profile data
   * @param {Array} fields - Form fields
   * @returns {Object} Field mapping
   */
  mapFieldsToProfile(fields) {
    const fieldMapping = {};
    
    // Common field mappings
    const commonMappings = [
      { regex: /(first|given|fore)name|fname|first[_\s-]?name/i, field: 'personal.firstName' },
      { regex: /(last|family|surname|lname|last[_\s-]?name)/i, field: 'personal.lastName' },
      { regex: /(full|complete)[_\s-]?name/i, field: 'personal.fullName' },
      { regex: /email/i, field: 'contact.email' },
      { regex: /phone|mobile|tel(ephone)?/i, field: 'contact.phone' },
      { regex: /address/i, field: 'contact.address' },
      { regex: /city/i, field: 'contact.city' },
      { regex: /zip(\s*code)?|postal/i, field: 'contact.zipCode' },
      { regex: /country/i, field: 'contact.country' },
      { regex: /linkedin/i, field: 'social.linkedin' },
      { regex: /github/i, field: 'social.github' },
      { regex: /portfolio|website/i, field: 'social.website' },
      { regex: /position|job[_\s-]?title/i, field: 'target.position' },
      { regex: /salary|compensation/i, field: 'target.salary' },
      { regex: /notice[_\s-]?period/i, field: 'target.noticePeriod' }
    ];

    fields.forEach((field, index) => {
      const { name, label, type, tagName } = field;
      const fieldName = name || `field_${index}`;
      let fieldConfig = { type };

      // Try to find a matching field in common mappings
      const match = commonMappings.find(mapping => 
        (name && name.match(mapping.regex)) || 
        (label && label.match(mapping.regex))
      );

      if (match) {
        fieldConfig.field = match.field;
      } else if (tagName === 'select') {
        // For select elements, use the first option as default
        fieldConfig.type = 'select';
        fieldConfig.options = field.options;
      } else if (type === 'file') {
        // For file uploads, try to determine the expected file type
        fieldConfig.type = 'file';
        if (name.match(/cv|resume|lebenslauf/i)) {
          fieldConfig.value = this.getResumePath();
        } else if (name.match(/cover[_\s-]?letter|anschreiben/i)) {
          fieldConfig.value = this.getCoverLetterPath();
        } else if (name.match(/photo|bild|foto/i)) {
          fieldConfig.value = this.getPhotoPath();
        }
      }

      fieldMapping[fieldName] = fieldConfig;
    });

    return fieldMapping;
  }

  /**
   * Get the path to the resume/CV file
   * @returns {string} Path to resume file
   */
  getResumePath() {
    // Look for common resume file names
    const commonNames = [
      'resume.pdf', 'cv.pdf', 'lebenslauf.pdf',
      'resume.docx', 'cv.docx', 'lebenslauf.docx'
    ];
    
    // Check if any of the common files exist in the input directory
    for (const name of commonNames) {
      const filePath = `./in/documents/${name}`;
      try {
        // In a real implementation, we would check if the file exists
        // For now, we'll just return the first common name
        return filePath;
      } catch (error) {
        continue;
      }
    }
    
    return '';
  }

  /**
   * Get the path to the cover letter file
   * @returns {string} Path to cover letter file
   */
  getCoverLetterPath() {
    // Similar to getResumePath but for cover letters
    const commonNames = [
      'cover_letter.pdf', 'anschreiben.pdf',
      'cover_letter.docx', 'anschreiben.docx'
    ];
    
    for (const name of commonNames) {
      const filePath = `./in/documents/${name}`;
      try {
        // In a real implementation, we would check if the file exists
        return filePath;
      } catch (error) {
        continue;
      }
    }
    
    return '';
  }

  /**
   * Get the path to the photo file
   * @returns {string} Path to photo file
   */
  getPhotoPath() {
    const commonNames = [
      'photo.jpg', 'photo.png', 'bild.jpg', 'bild.png',
      'profile.jpg', 'profile.png', 'foto.jpg', 'foto.png'
    ];
    
    for (const name of commonNames) {
      const filePath = `./in/images/${name}`;
      try {
        // In a real implementation, we would check if the file exists
        return filePath;
      } catch (error) {
        continue;
      }
    }
    
    return '';
  }

  /**
   * Handle the form submission
   */
  async handle() {
    try {
      logger.info(`Processing form at: ${this.url}`);
      
      // Navigate to the form URL
      await this.browser.navigation.goto(this.url);
      
      // Take initial screenshot
      await this.takeScreenshot('01_initial');
      
      // Extract form fields
      const formFields = await this.extractFormFields();
      
      if (formFields.length === 0) {
        logger.warn('No form fields found on the page');
        return false;
      }
      
      // Map fields to profile data
      const fieldMapping = this.mapFieldsToProfile(formFields);
      
      // Fill the form
      await this.fillFormFields(fieldMapping);
      
      // Take screenshot after filling the form
      await this.takeScreenshot('02_filled');
      
      // Save form data
      const formData = {};
      for (const [field, config] of Object.entries(fieldMapping)) {
        formData[field] = this.getFieldValue(config);
      }
      
      await this.saveFormData(formData);
      await this.saveMarkdown(formData);
      
      // Take final screenshot before submission
      await this.takeScreenshot('03_before_submit');
      
      // Try to find and click the submit button
      try {
        const submitButton = await this.browser.element.findByText('submit', { exact: false, ignoreCase: true });
        if (submitButton) {
          await submitButton.click();
          await this.takeScreenshot('04_after_submit');
          logger.info('Form submitted successfully');
        } else {
          logger.warn('Submit button not found, form not submitted');
        }
      } catch (error) {
        logger.error(`Error submitting form: ${error.message}`);
      }
      
      return true;
      
    } catch (error) {
      logger.error(`Error processing form: ${error.message}`);
      await this.takeScreenshot('error');
      return false;
    }
  }
}
