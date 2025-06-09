import path from 'path';
import { fileURLToPath } from 'url';
import BaseFormFiller from './baseFormFiller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MockFormFiller extends BaseFormFiller {
  constructor(page, dataLoader) {
    super(page, dataLoader);
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
    const result = {
      personal: {},
      submission: {}
    };

    // Fill personal information
    const personalData = this.data.personal?.[0]?.content;
    if (personalData) {
      const personalInfo = this.parsePersonalData(personalData);
      
      for (const [field, selector] of this.fieldMappings.entries()) {
        if (field === 'cv') {
          const files = this.data.documents || [];
          const cv = files.find(f => 
            f.filename.toLowerCase().includes('cv') || 
            f.filename.toLowerCase().includes('resume')
          );
          
          if (cv) {
            await this.processField(selector, { 
              type: 'file', 
              path: path.join('in/documents', cv.filename) 
            });
            result.submission.cv = cv.filename;
          }
        } else if (field in personalInfo) {
          await this.processField(selector, personalInfo[field]);
          result.personal[field] = personalInfo[field];
        }
      }
    }
    
    // Submit the form
    await this.page.click('button[type="submit"]');
    
    return result;
  }

  parsePersonalData(data) {
    try {
      // Try to parse as JSON first
      return JSON.parse(data);
    } catch (e) {
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
      return {
        firstname: result.firstname || result.first_name,
        lastname: result.lastname || result.last_name,
        email: result.email,
        phone: result.phone || result.telephone || result.mobile,
        message: result.message || result.coverletter || ''
      };
    }
  }
}

export default MockFormFiller;
