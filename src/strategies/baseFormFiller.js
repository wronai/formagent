import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import path from 'path';

export class BaseFormFiller {
  constructor(page, dataLoader) {
    if (new.target === BaseFormFiller) {
      throw new Error('Cannot instantiate abstract class');
    }
    this.page = page;
    this.dataLoader = dataLoader;
    this.fieldMappings = new Map();
    this.pageHtmlSnapshots = [];
    this.actionLogs = [];
  }

  logAction(action, details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, action, ...details };
    this.actionLogs.push(logEntry);
    console.log(`[${timestamp}] ${action}`, details);
  }

  async takeHtmlSnapshot(page, name) {
    const html = await page.content();
    const hash = createHash('md5').update(html).digest('hex');
    const snapshot = { name, html, hash, timestamp: new Date().toISOString() };
    this.pageHtmlSnapshots.push(snapshot);
    return snapshot;
  }

  async detectForms(page) {
    this.logAction('Detecting forms on page');
    const forms = await page.$$eval('form', forms => 
      forms.map((form, index) => ({
        index,
        id: form.id || `form-${index}`,
        action: form.action,
        method: form.method,
        fields: Array.from(form.elements).map(el => ({
          name: el.name,
          type: el.type,
          id: el.id,
          tagName: el.tagName
        }))
      }))
    );
    
    this.logAction(`Found ${forms.length} forms`, { forms });
    return forms;
  }

  async selectMainForm(page, forms) {
    this.logAction('Selecting main form');
    // Simple heuristic: prioritize forms with more fields
    const mainForm = forms.reduce((main, current) => 
      current.fields.length > main.fields.length ? current : main, forms[0]);
    
    this.logAction('Selected main form', { 
      formId: mainForm.id,
      fieldCount: mainForm.fields.length 
    });
    
    return mainForm;
  }

  async verifyFormSubmission(page, originalHtml) {
    this.logAction('Verifying form submission');
    const newHtml = await page.content();
    const originalHash = createHash('md5').update(originalHtml).digest('hex');
    const newHash = createHash('md5').update(newHtml).digest('hex');
    
    if (originalHash === newHash) {
      this.logAction('Form submission may have failed - page did not change');
      return false;
    }
    
    // Check for common success indicators
    const success = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return {
        hasThankYou: text.includes('thank you') || text.includes('dziękujemy'),
        hasSuccessMessage: text.includes('success') || text.includes('sukces'),
        hasError: text.includes('error') || text.includes('błąd')
      };
    });
    
    this.logAction('Form submission verification', { success });
    return !success.hasError && (success.hasThankYou || success.hasSuccessMessage);
  }


  async init() {
    this.data = await this.dataLoader.getAllData();
  }

  async fill() {
    throw new Error('Method fill() must be implemented');
  }

  async saveLogs(outputDir) {
    try {
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(
        path.join(outputDir, 'execution_log.json'),
        JSON.stringify(this.actionLogs, null, 2),
        'utf-8'
      );
      
      await fs.writeFile(
        path.join(outputDir, 'html_snapshots.json'),
        JSON.stringify(this.pageHtmlSnapshots.map(s => ({
          name: s.name,
          hash: s.hash,
          timestamp: s.timestamp
        })), null, 2),
        'utf-8'
      );
      
      // Save HTML diffs
      for (let i = 1; i < this.pageHtmlSnapshots.length; i++) {
        const prev = this.pageHtmlSnapshots[i-1];
        const curr = this.pageHtmlSnapshots[i];
        
        if (prev.hash !== curr.hash) {
          await fs.writeFile(
            path.join(outputDir, `diff_${i-1}_${i}.html`),
            this.generateHtmlDiff(prev.html, curr.html),
            'utf-8'
          );
        }
      }
    } catch (error) {
      console.error('Error saving logs:', error);
    }
  }

  generateHtmlDiff(html1, html2) {
    // Simple diff implementation - in a real app, use a proper diffing library
    const lines1 = html1.split('\n');
    const lines2 = html2.split('\n');
    const diff = [];
    
    const maxLines = Math.max(lines1.length, lines2.length);
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      
      if (line1 !== line2) {
        diff.push(`<div style="background:#ffebee">- ${this.escapeHtml(line1)}</div>`);
        diff.push(`<div style="background:#e8f5e9">+ ${this.escapeHtml(line2)}</div>`);
      } else {
        diff.push(`<div>  ${this.escapeHtml(line1)}</div>`);
      }
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HTML Diff</title>
        <style>
          body { font-family: monospace; white-space: pre; }
          .removed { background-color: #ffebee; }
          .added { background-color: #e8f5e9; }
        </style>
      </head>
      <body>${diff.join('\n')}</body>
      </html>
    `;
  }
  
  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async takeScreenshot(savePath) {
    await this.page.screenshot({ path: savePath, fullPage: true });
  }

  async saveFormData(data, savePath) {

    await fs.writeFile(
      `${savePath}.json`,
      JSON.stringify(data, null, 2),
      'utf-8'
    );
  }

  async saveMarkdown(data, savePath) {

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

export default BaseFormFiller;
