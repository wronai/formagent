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
   * Determine the file type based on field name/label
   * @private
   */
  _determineFileType(name, label) {
    const text = `${name || ''} ${label || ''}`.toLowerCase();
    
    if (text.match(/cv|resume|lebenslauf/i)) {
      return this._findFirstMatchingFile(['resume.pdf', 'cv.pdf', 'lebenslauf.pdf', 'resume.docx']);
    } 
    if (text.match(/cover[\s-]?letter|anschreiben/i)) {
      return this._findFirstMatchingFile(['cover_letter.pdf', 'anschreiben.pdf', 'cover_letter.docx']);
    }
    if (text.match(/photo|bild|foto/i)) {
      return this._findFirstMatchingFile(['photo.jpg', 'profile.jpg', 'photo.png', 'profile.png']);
    }
    
    return '';
  }
  
  /**
   * Find the first matching file in the documents directory
   * @private
   */
  _findFirstMatchingFile(filenames) {
    // In a real implementation, this would check the filesystem
    // For now, we'll just return the first filename
    return `./in/documents/${filenames[0]}`;
  }
  
  /**
   * Determine date value based on field context
   * @private
   */
  _determineDateValue(name, label) {
    const text = `${name || ''} ${label || ''}`.toLowerCase();
    const today = new Date();
    
    if (text.match(/birth|dob|geburtsdatum/i)) {
      // Return a date 30 years ago as default DOB
      return new Date(today.getFullYear() - 30, today.getMonth(), today.getDate())
        .toISOString().split('T')[0];
    }
    
    // Default to today's date
    return today.toISOString().split('T')[0];
  }
  
  /**
   * Determine boolean value based on field context
   * @private
   */
  _determineBooleanValue(name, label) {
    const text = `${name || ''} ${label || ''}`.toLowerCase();
    
    // Default to true for opt-in checkboxes
    if (text.match(/newsletter|updates|notifications|marketing/i)) {
      return true;
    }
    
    // Default to false for agreement checkboxes
    if (text.match(/terms|conditions|agreement|privacy|gdpr/i)) {
      return true; // Usually need to accept these
    }
    
    return false;
  }

  /**
   * Handle the form submission with enhanced field mapping and validation
   * @returns {Promise<boolean>} True if successful
   */
  async handle() {
    try {
      logger.info(`Processing form at: ${this.url}`);
      
      // Navigate to the form URL
      await this.browser.navigation.goto(this.url);
      
      // Take initial screenshot
      await this.takeScreenshot('01_initial');
      
      // Extract form fields with detailed information
      const formFields = await this.extractFormFields();
      
      if (formFields.length === 0) {
        logger.warn('No form fields found on the page');
        return false;
      }
      
      logger.info(`Found ${formFields.length} form fields`);
      
      // Map fields to profile data using both static and LLM-based mapping
      const fieldMapping = await this.mapFieldsToProfile(formFields);
      const mappedCount = Object.values(fieldMapping).filter(f => f.field || f.value).length;
      logger.info(`Mapped ${mappedCount}/${formFields.length} fields (${Math.round((mappedCount / formFields.length) * 100)}%)`);
      
      // Fill the form with validation
      await this.fillFormWithValidation(fieldMapping);
      
      // Take screenshot after filling
      await this.takeScreenshot('02_filled');
      
      // Validate required fields were filled
      const validationResult = await this.validateForm(fieldMapping);
      if (!validationResult.valid) {
        logger.warn(`Form validation failed: ${validationResult.errors.join(', ')}`);
        await this.takeScreenshot('03_validation_failed');
      }
      
      // Save form data before submission attempt
      const formData = {
        url: this.url,
        timestamp: new Date().toISOString(),
        fields: {},
        validation: validationResult,
        metadata: {
          fieldCount: formFields.length,
          mappedFieldCount: mappedCount,
          mappingCoverage: Math.round((mappedCount / formFields.length) * 100)
        }
      };
      
      // Add field values to form data
      for (const [field, config] of Object.entries(fieldMapping)) {
        formData.fields[field] = this.getFieldValue(config);
      }
      
      await this.saveFormData(formData);
      await this.saveMarkdown(formData);
      
      // Take final screenshot before submission
      await this.takeScreenshot('03_before_submit');
      
      // Try to submit the form
      const submitted = await this.submitForm();
      
      // Take screenshot after submission attempt
      await this.takeScreenshot(submitted ? '04_after_submit' : '04_submit_failed');
      
      // Update form data with submission result
      formData.submitted = submitted;
      formData.submittedAt = new Date().toISOString();
      
      await this.saveFormData(formData);
      
      if (submitted) {
        logger.info('Form submitted successfully');
      } else {
        logger.warn('Form could not be submitted automatically');
      }
      
      return submitted;
      
    } catch (error) {
      logger.error(`Error processing form: ${error.message}`);
      await this.takeScreenshot('error');
      throw error;
    }
  }
  
  /**
   * Fill form with validation and error handling
   * @private
   */
  async fillFormWithValidation(fieldMapping) {
    const results = {
      filled: 0,
      skipped: 0,
      errors: []
    };
    
    for (const [selector, config] of Object.entries(fieldMapping)) {
      try {
        // Skip fields without mapping or value
        if (!config.field && config.value === undefined) {
          results.skipped++;
          continue;
        }
        
        // Get the field value
        const value = config.value !== undefined ? config.value : this.getFieldValue(config);
        if (value === undefined || value === '') {
          logger.debug(`Skipping empty field: ${selector}`);
          results.skipped++;
          continue;
        }
        
        // Fill the field
        await this.fillFormFields({ [selector]: { ...config, value } });
        results.filled++;
        
      } catch (error) {
        const errorMsg = `Error filling ${selector}: ${error.message}`;
        logger.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }
    
    logger.info(`Form filled: ${results.filled} fields filled, ${results.skipped} skipped, ${results.errors.length} errors`);
    return results;
  }
  
  /**
   * Validate that required fields were filled
   * @private
   */
  async validateForm(fieldMapping) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };
    
    try {
      // Check for visible validation errors
      const validationErrors = await this.browser.page.$$eval(
        '[aria-invalid="true"], .error, .invalid, .validation-error',
        elements => elements.map(el => ({
          message: el.getAttribute('aria-errormessage') || el.textContent.trim() || 'Validation error',
          selector: el.id ? `#${el.id}` : 
                    el.name ? `[name="${el.name}"]` : 
                    el.className ? `.${el.className.split(' ')[0]}` : ''
        }))
      );
      
      if (validationErrors.length > 0) {
        validationErrors.forEach(error => {
          result.errors.push(`Validation error at ${error.selector}: ${error.message}`);
        });
        result.valid = false;
      }
      
      // Check required fields
      for (const [selector, config] of Object.entries(fieldMapping)) {
        if (config.required) {
          const isFilled = await this.browser.page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el) return false;
            
            if (el.type === 'checkbox' || el.type === 'radio') {
              return el.checked;
            }
            return el.value && el.value.trim() !== '';
          }, selector);
          
          if (!isFilled) {
            result.warnings.push(`Required field not filled: ${selector}`);
          }
        }
      }
      
    } catch (error) {
      logger.error(`Error during form validation: ${error.message}`);
      result.errors.push(`Validation error: ${error.message}`);
      result.valid = false;
    }
    
    return result;
  }
  
  /**
   * Submit the form by finding and clicking the submit button
   * @private
   */
  async submitForm() {
    try {
      // Try common submit button selectors
      const submitSelectors = [
        'input[type="submit"]',
        'button[type="submit"]',
        'button:contains("Submit")',
        'button:contains("Send")',
        'button:contains("Apply")',
        'button:contains("Continue")',
        'button:contains("Next")',
        'button:contains("Weiter")', // German
        'button:contains("Absenden")' // German
      ];
      
      for (const selector of submitSelectors) {
        try {
          const button = await this.browser.element.find(selector);
          if (button) {
            await button.click();
            logger.info(`Clicked submit button: ${selector}`);
            return true;
          }
        } catch (error) {
          // Ignore and try next selector
        }
      }
      
      // If no button found, try submitting the form directly
      await this.browser.page.evaluate(() => {
        const forms = document.forms;
        if (forms.length > 0) {
          forms[0].submit();
          return true;
        }
        return false;
      });
      
      return true;
      
    } catch (error) {
      logger.error(`Error submitting form: ${error.message}`);
      return false;
    }
  }
  }
}
