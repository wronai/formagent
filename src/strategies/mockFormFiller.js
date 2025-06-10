import path from 'path';
import { fileURLToPath } from 'url';
import BaseFormFiller from './baseFormFiller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MockFormFiller extends BaseFormFiller {
  constructor(page, dataLoader) {
    super(page, dataLoader);
    this.page = page;
    this.dataLoader = dataLoader;
    this.fieldMappings = new Map([
      ['firstname', 'input[name="firstname"]'],
      ['lastname', 'input[name="lastname"]'],
      ['email', 'input[type="email"]'],
      ['phone', 'input[type="tel"]'],
      ['message', 'textarea'],
      ['cv', 'input[type="file"]']
    ]);
  }

  async fill() {
    this.logAction('Starting form fill process');
    const result = {
      personal: {},
      submission: {},
      success: false
    };

    try {
      // Take initial snapshot
      await this.takeHtmlSnapshot(this.page, 'initial_page');
      
      // Detect all forms on the page
      const forms = await this.detectForms(this.page);
      if (forms.length === 0) {
        this.logAction('No forms found on the page');
        return result;
      }

      // Select the main form to fill
      const mainForm = await this.selectMainForm(this.page, forms);
      await this.takeHtmlSnapshot(this.page, 'before_form_fill');
      
      // Fill the form with personal information
      const personalData = this.data.personal?.[0]?.content;
      if (personalData) {
        const personalInfo = this.parsePersonalData(personalData);
        
        for (const [field, selector] of this.fieldMappings.entries()) {
          try {
            if (field === 'cv') {
              const files = this.data.documents || [];
              const cv = files.find(f => 
                f.filename.toLowerCase().includes('cv') || 
                f.filename.toLowerCase().includes('resume')
              );
              
              if (cv) {
                this.logAction('Uploading CV', { filename: cv.filename });
                await this.processField(selector, { 
                  type: 'file', 
                  path: path.join('in/documents', cv.filename) 
                });
                result.submission.cv = cv.filename;
              }
            } else if (field in personalInfo) {
              this.logAction(`Filling field: ${field}`, { value: personalInfo[field] });
              await this.processField(selector, personalInfo[field]);
              result.personal[field] = personalInfo[field];
            }
          } catch (error) {
            this.logAction(`Error filling field ${field}`, { error: error.message });
          }
        }
      }
      
      await this.takeHtmlSnapshot(this.page, 'after_form_fill');
      
      // Submit the form
      this.logAction('Submitting form');
      const submitButton = await this.page.$('button[type="submit"], input[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        
        // Wait for navigation or form submission
        try {
          await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });
        } catch (e) {
          this.logAction('No navigation after form submission, continuing...');
        }
        
        // Verify submission was successful
        await this.takeHtmlSnapshot(this.page, 'after_submit');
        const submissionSuccess = await this.verifyFormSubmission(
          this.page, 
          this.pageHtmlSnapshots[this.pageHtmlSnapshots.length - 2].html
        );
        
        result.success = submissionSuccess;
        this.logAction('Form submission result', { success: submissionSuccess });
        
        if (!submissionSuccess) {
          this.logAction('Form submission may have failed, analyzing page...');
          // Additional verification logic can go here
        }
      } else {
        this.logAction('No submit button found');
      }
      
      return result;
      
    } catch (error) {
      this.logAction('Error in fill() method', { error: error.message, stack: error.stack });
      result.error = error.message;
      result.success = false;
      return result;
    }
  }

  parsePersonalData(data) {
    try {
      this.logAction('Parsing personal data');
      // Try to parse as JSON first
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      this.logAction('Successfully parsed personal data as JSON');
      return result;
    } catch (e) {
      this.logAction('Falling back to simple key-value parsing');
      // Fallback to simple key-value parsing
      const result = {};
      const lines = data.split('\n');
      
      for (const line of lines) {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex > 0) {
          const key = line.substring(0, separatorIndex).trim().toLowerCase();
          const value = line.substring(separatorIndex + 1).trim();
          result[key] = value;
        }
      }
      
      // Map common field names
      const mappedResult = {
        firstname: result.firstname || result.first_name || '',
        lastname: result.lastname || result.last_name || '',
        email: result.email || '',
        phone: result.phone || result.telephone || result.mobile || '',
        message: result.message || result.coverletter || result.cover_letter || ''
      };
      
      this.logAction('Mapped personal data fields', { mappedResult });
      return mappedResult;
    }
  }
  
  async processField(selector, value) {
    try {
      this.logAction(`Processing field: ${selector}`, { value });
      
      if (value === undefined || value === null) {
        this.logAction(`Skipping empty value for ${selector}`);
        return false;
      }
      
      if (typeof value === 'object' && value.type === 'file') {
        const input = await this.page.$(selector);
        if (!input) {
          this.logAction(`File input not found: ${selector}`, { level: 'warn' });
          return false;
        }
        
        await input.setInputFiles(value.path);
        this.logAction(`Uploaded file: ${value.path} to ${selector}`);
        return true;
      }
      
      // For text inputs
      await this.page.fill(selector, String(value));
      this.logAction(`Filled field: ${selector} with value: ${String(value).substring(0, 50)}${String(value).length > 50 ? '...' : ''}`);
      return true;
      
    } catch (error) {
      this.logAction(`Error processing field ${selector}`, { 
        error: error.message,
        value: typeof value === 'object' ? '[object]' : String(value).substring(0, 100) 
      });
      return false;
    }
  }
}

export default MockFormFiller;
