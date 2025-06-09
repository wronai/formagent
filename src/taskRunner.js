const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { chromium } = require('playwright');

class TaskRunner {
  constructor() {
    this.browser = null;
    this.page = null;
    this.context = null;
    this.variables = {};
  }

  async loadConfig(configPath) {
    try {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      this.config = yaml.load(fileContents);
      this.variables = this.config.defaults || {};
      return this.config;
    } catch (error) {
      console.error('Error loading config:', error);
      throw error;
    }
  }

  async initialize() {
    const { headless, viewport, userAgent } = this.config.global || {};
    
    this.browser = await chromium.launch({ 
      headless: headless !== false, // Default to true if not specified
      timeout: 30000
    });
    
    this.context = await this.browser.newContext({
      viewport: viewport || { width: 1280, height: 1024 },
      userAgent: userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    });
    
    this.page = await this.context.newPage();
  }

  async navigateTo(url) {
    console.log(`🌐 Navigating to ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  async executeTask(task) {
    console.log(`▶️ Executing task: ${task.name}`);
    
    try {
      switch (task.type) {
        case 'click':
          await this.handleClick(task);
          break;
        case 'fill':
          await this.handleFill(task);
          break;
        case 'upload':
          await this.handleUpload(task);
          break;
        case 'navigate':
          await this.navigateTo(this.resolveVariables(task.url));
          break;
        default:
          console.warn(`Unknown task type: ${task.type}`);
      }
      
      if (task.waitForNavigation) {
        await this.page.waitForNavigation({ waitUntil: 'networkidle' });
      }
      
      if (task.waitForTimeout) {
        await this.page.waitForTimeout(task.waitForTimeout);
      }
      
      console.log(`✅ Task completed: ${task.name}`);
      return true;
    } catch (error) {
      if (task.optional) {
        console.log(`⚠️ Optional task failed (continuing): ${task.name} - ${error.message}`);
        return true;
      }
      console.error(`❌ Task failed: ${task.name}`, error);
      throw error;
    }
  }

  async handleClick(task) {
    const selector = this.resolveVariables(task.selector);
    const timeout = task.timeout || this.config.global?.timeout || 30000;
    
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
    await this.page.click(selector);
  }

  async handleFill(task) {
    for (const field of task.fields) {
      const selector = this.resolveVariables(field.selector);
      const value = this.resolveVariables(field.value);
      
      await this.page.waitForSelector(selector, { state: 'visible' });
      await this.page.fill(selector, value);
    }
  }

  async handleUpload(task) {
    const selector = this.resolveVariables(task.selector);
    const filePath = this.resolveVariables(task.file);
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(process.cwd(), filePath);
    
    await this.page.waitForSelector(selector);
    await this.page.setInputFiles(selector, absolutePath);
  }

  resolveVariables(value) {
    if (typeof value !== 'string') return value;
    
    return value.replace(/\${([^}]+)}/g, (match, path) => {
      const keys = path.split('.');
      let result = this.variables;
      
      for (const key of keys) {
        result = result?.[key];
        if (result === undefined) break;
      }
      
      return result !== undefined ? result : match;
    });
  }

  async run(configPath, overrides = {}) {
    try {
      await this.loadConfig(configPath);
      this.variables = { ...this.variables, ...overrides };
      
      console.log('🚀 Starting task runner');
      console.log(`📝 Task: ${this.config.name}`);
      console.log(`📝 Description: ${this.config.description}`);
      
      await this.initialize();
      
      for (const task of this.config.tasks) {
        await this.executeTask(task);
      }
      
      console.log('🏁 All tasks completed successfully!');
    } catch (error) {
      console.error('❌ Pipeline failed:', error);
      
      // Take a screenshot on error
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = `error-${timestamp}.png`;
      await this.page?.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved to: ${screenshotPath}`);
      
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

module.exports = TaskRunner;
