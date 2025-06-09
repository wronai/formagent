import BaseFormFiller from './baseFormFiller.js';

export class BewerbungJobsFiller extends BaseFormFiller {
  constructor(page, dataLoader) {
    super(page, dataLoader);
    this.fieldMappings = new Map([
      ['first_name', 'input[name="firstname"]'],
      ['last_name', 'input[name="lastname"]'],
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
    for (const [field, selector] of this.fieldMappings.entries()) {
      if (field === 'cv') {
        const files = this.data.documents || [];
        const cv = files.find(f => f.filename.toLowerCase().includes('cv') || f.filename.toLowerCase().includes('resume'));
        if (cv) {
          await this.processField(selector, { type: 'file', path: cv.filename });
          result.submission.cv = cv.filename;
        }
      } else {
        const personalData = this.data.personal?.[0]?.content;
        if (personalData) {
          const value = this.extractFieldValue(personalData, field);
          if (value) {
            await this.processField(selector, value);
            result.personal[field] = value;
          }
        }
      }
    }

    // Handle any additional fields using LLM if needed
    await this.handleDynamicFields();
    
    return result;
  }

  extractFieldValue(data, field) {
    try {
      const jsonData = JSON.parse(data);
      return jsonData[field];
    } catch (e) {
      // If not JSON, try simple text parsing
      const lines = data.split('\n');
      for (const line of lines) {
        if (line.toLowerCase().includes(field)) {
          return line.split(':').slice(1).join(':').trim();
        }
      }
    }
    return null;
  }

  async handleDynamicFields() {
    // Implement dynamic field handling using LLM if needed
    // This can be expanded to handle more complex form interactions
  }
}

export default BewerbungJobsFiller;
