class BaseFormFiller {
  constructor(page, dataLoader) {
    if (new.target === BaseFormFiller) {
      throw new Error('Cannot instantiate abstract class');
    }
    this.page = page;
    this.dataLoader = dataLoader;
    this.fieldMappings = new Map();
  }

  async init() {
    this.data = await this.dataLoader.getAllData();
  }

  async fill() {
    throw new Error('Method fill() must be implemented');
  }

  async takeScreenshot(savePath) {
    await this.page.screenshot({ path: savePath, fullPage: true });
  }

  async saveFormData(data, savePath) {
    const fs = require('fs').promises;
    await fs.writeFile(
      `${savePath}.json`,
      JSON.stringify(data, null, 2),
      'utf-8'
    );
  }

  async saveMarkdown(data, savePath) {
    const fs = require('fs').promises;
    let markdown = '# Form Submission Data\n\n';
    
    for (const [section, values] of Object.entries(data)) {
      markdown += `## ${section.charAt(0).toUpperCase() + section.slice(1)}\n`;
      
      if (Array.isArray(values)) {
        values.forEach((item, index) => {
          markdown += `### Item ${index + 1}\n`;
          for (const [key, value] of Object.entries(item)) {
            markdown += `- **${key}**: ${value}\n`;
          }
          markdown += '\n';
        });
      } else if (typeof values === 'object') {
        for (const [key, value] of Object.entries(values)) {
          markdown += `- **${key}**: ${value}\n`;
        }
      } else {
        markdown += `- ${values}\n`;
      }
      
      markdown += '\n';
    }
    
    await fs.writeFile(`${savePath}.md`, markdown, 'utf-8');
  }

  async processField(selector, value) {
    try {
      if (typeof value === 'string' || typeof value === 'number') {
        await this.page.fill(selector, String(value));
      } else if (value && value.type === 'file' && value.path) {
        await this.page.setInputFiles(selector, value.path);
      }
      return true;
    } catch (error) {
      console.warn(`Failed to fill field ${selector}:`, error.message);
      return false;
    }
  }
}

module.exports = BaseFormFiller;
