import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { chromium } from 'playwright';
import { AIFormFiller } from './aiFormFiller.js';
import { TabNavigationMapper } from './tabNavigationMapper.js';

class TaskRunner {
  constructor() {
    this.browser = null;
    this.page = null;
    this.context = null;
    this.variables = {};
    this.aiFormFiller = new AIFormFiller('http://localhost:11434/api/generate');
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
    
    // Create videos directory if it doesn't exist
    const videosDir = path.join(process.cwd(), 'videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }
    
    this.browser = await chromium.launch({ 
      headless: headless !== false, // Default to true if not specified
      timeout: 60000, // Increased timeout to 60 seconds
      args: ['--disable-dev-shm-usage']
    });
    
    try {
      // Enable video recording
      this.context = await this.browser.newContext({
        viewport: viewport || { width: 1280, height: 2000 },
        userAgent: userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        recordVideo: {
          dir: videosDir,
          size: viewport || { width: 1280, height: 2000 }
        },
        acceptDownloads: true,
        ignoreHTTPSErrors: true
      });
      
      this.page = await this.context.newPage();
      
      // Store video path for later use
      this.videoPath = null;
      const videoPromise = this.page.video()?.path() || null;
      
      this.page.on('close', async () => {
        try {
          if (videoPromise) {
            this.videoPath = await videoPromise;
          }
        } catch (error) {
          console.error('Error getting video path:', error);
        }
      });
      
      return this.page;
    } catch (error) {
      console.error('Error initializing browser context:', error);
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      throw error;
    }
  }

  async navigateTo(url, options = {}) {
    const { timeout = 60000, waitUntil = 'domcontentloaded' } = options;
    console.log(`🌐 Navigating to ${url}`);
    
    try {
      const response = await this.page.goto(url, { 
        waitUntil,
        timeout,
        waitFor: 2000 // Wait 2 seconds after loading
      });
      
      // Wait for the page to be interactive
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.log('Continuing without networkidle...');
      });
      
      return response;
    } catch (error) {
      console.error(`❌ Navigation error: ${error.message}`);
      // Take a screenshot on navigation error
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = `nav-error-${timestamp}.png`;
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Navigation error screenshot: ${screenshotPath}`);
      
      // Check if page is still accessible
      try {
        await this.page.waitForSelector('body', { timeout: 5000 });
        console.log('Page is still accessible, continuing...');
      } catch (e) {
        console.error('Page is not accessible after navigation error');
        throw error;
      }
    }
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
          await this.navigateTo(
            this.resolveVariables(task.url),
            {
              waitUntil: task.waitUntil || 'domcontentloaded',
              timeout: task.timeout || 60000
            }
          );
          break;
        default:
          console.warn(`Unknown task type: ${task.type}`);
      }
      
      // Handle navigation if requested
      if (task.waitForNavigation) {
        try {
          await this.page.waitForNavigation({ 
            waitUntil: task.waitUntil || 'domcontentloaded',
            timeout: task.timeout || 30000 
          });
        } catch (error) {
          console.warn(`Navigation wait failed (continuing): ${error.message}`);
        }
      }
      
      // Handle any delay after the task
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

  async tryFillField(selector, value, fieldName, timeout) {
    try {
      console.log(`   Trying selector: ${selector}`);
      
      // Wait for the element to be visible
      await this.page.waitForSelector(selector, { 
        state: 'visible',
        timeout: timeout
      });
      
      // Get the element
      const element = await this.page.$(selector);
      if (!element) return false;
      
      // Scroll into view
      await element.scrollIntoViewIfNeeded();
      
      // Click to focus
      await element.click();
      
      // Clear the field
      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.press('Backspace');
      
      // Type the value
      console.log(`   Filling field with value: ${value.substring(0, 30)}...`);
      await element.type(value, { delay: 50 });
      
      // Verify the value was set
      const currentValue = await this.page.evaluate(el => el.value, element);
      if (currentValue !== value) {
        console.log(`   Warning: Field value verification failed. Expected: ${value}, Got: ${currentValue}`);
      }
      
      return true;
      
    } catch (error) {
      console.log(`   Standard fill failed: ${error.message}`);
      return false;
    }
  }

  async handleFill(task) {
    const { timeout = 30000 } = task;
    
    try {
      // First try tab-based navigation mapping
      const tabMapper = new TabNavigationMapper(this.page);
      await tabMapper.mapFormFields();
      
      // Prepare field values
      const fieldValues = {};
      for (const field of task.fields) {
        const fieldName = field.name || field.selector;
        fieldValues[fieldName] = this.resolveVariables(field.value);
      }
      
      // Fill fields using tab navigation
      console.log('🔄 Filling form using tab navigation mapping...');
      const results = await tabMapper.fillFields(fieldValues);
      
      // Log results
      const failedFields = results.filter(r => !r.success);
      if (failedFields.length > 0) {
        console.warn(`⚠️ Failed to fill ${failedFields.length} fields using tab navigation`);
      }
      
      // For any fields that failed with tab navigation, try standard approach
      for (const field of task.fields) {
        const selector = this.resolveVariables(field.selector);
        const value = this.resolveVariables(field.value);
        const fieldName = field.name || selector;
        const isOptional = field.optional || false;
        
        // Skip if this field was already filled successfully
        const fieldResult = results.find(r => r.field === fieldName && r.success);
        if (fieldResult) {
          console.log(`✅ Field already filled via tab navigation: ${fieldName}`);
          continue;
        }
        
        try {
          console.log(`🔍 Attempting to fill field: ${fieldName}`);
          
          // Try with the provided selector
          let success = await this.tryFillField(selector, value, fieldName, timeout);
          
          // If that fails and the field is optional, log and continue
          if (!success && isOptional) {
            console.log(`⚠️ Optional field not found, skipping: ${fieldName}`);
            continue;
          }
          
          // If that fails and field is required, try AI-powered filling
          if (!success && !isOptional) {
            console.log(`🤖 Standard filling failed, trying AI-powered approach for: ${fieldName}`);
            success = await this.aiFormFiller.analyzeForm(this.page, fieldName, field.type || 'text');
            
            if (!success) {
              throw new Error(`Failed to fill required field: ${fieldName}`);
            }
          }
          
          // Small delay between fields
          await this.page.waitForTimeout(300);
          
        } catch (error) {
          console.error(`❌ Error processing field ${fieldName}:`, error.message);
          
          // Take a screenshot of the current state
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const screenshotPath = `error-${fieldName.replace(/\s+/g, '-')}-${timestamp}.png`;
          await this.page.screenshot({ 
            path: screenshotPath, 
            fullPage: true,
            scale: 'css'
          });
          
          console.log(`📸 Screenshot saved: ${screenshotPath}`);
          
          if (!isOptional) {
            throw error;
          }
        }
      }
      
      // Take a screenshot after filling all fields
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = `form-filled-${timestamp}.png`;
      await this.page.screenshot({ 
        path: screenshotPath, 
        fullPage: true,
        scale: 'css'
      });
      console.log(`\n📸 Form filled screenshot: ${screenshotPath}`);
      
      // Save the current page HTML for debugging
      const htmlPath = `form-filled-${timestamp}.html`;
      const pageContent = await this.page.content();
      fs.writeFileSync(htmlPath, pageContent);
      console.log(`📄 Form page source saved: ${htmlPath}`);
      
    } catch (error) {
      console.error('Error in handleFill:', error);
      throw error;
    }
    
    // Log form elements for debugging
    try {
      console.log('🔍 Scanning for all form elements on the page...');
      const formElements = await this.page.evaluate(() => {
        const elements = [];
        const inputs = document.querySelectorAll('input, textarea, select, [role="textbox"], [contenteditable]');
        
        inputs.forEach(el => {
          const rect = el.getBoundingClientRect();
          elements.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || 'none',
            name: el.name || 'none',
            type: el.type || 'n/a',
            placeholder: el.placeholder || 'none',
            class: el.className ? el.className.split(' ')[0] : 'none',
            value: el.value ? (typeof el.value === 'string' ? el.value.substring(0, 50) : '[complex value]') : 'empty',
            visible: rect.width > 0 && rect.height > 0,
            position: { x: Math.round(rect.x), y: Math.round(rect.y) },
            size: { width: Math.round(rect.width), height: Math.round(rect.height) }
          });
        });
        
        return elements;
      });
      
      console.log('📋 Found form elements:');
      console.table(formElements.filter(el => el.visible));
      
      // Save form elements to a JSON file for reference
      const elementsPath = 'form-elements.json';
      fs.writeFileSync(elementsPath, JSON.stringify(formElements, null, 2));
      console.log(`📋 Form elements saved to: ${elementsPath}`);
      
    } catch (error) {
      console.warn('⚠️ Could not log form elements:', error.message);
    }
  }

  async handleUpload(task) {
    const selector = this.resolveVariables(task.selector);
    const filePath = this.resolveVariables(task.file);
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(process.cwd(), filePath);
    
    console.log(`📤 Uploading file: ${absolutePath} to selector: ${selector}`);
    
    try {
      // First, ensure the file exists
      await fs.promises.access(absolutePath, fs.constants.F_OK);
      
      // Wait for the file input to be present in the DOM
      await this.page.waitForSelector(selector, { state: 'attached', timeout: 10000 });
      
      // Make the input visible if it's hidden
      await this.page.evaluate((sel) => {
        const input = document.querySelector(sel);
        if (input) {
          input.style.visibility = 'visible';
          input.style.display = 'block';
          input.style.opacity = '1';
          input.style.position = 'static';
          input.style.width = '100%';
          input.style.height = '100%';
        }
      }, selector);
      
      // Use setInputFiles with force: true to bypass visibility checks
      const input = await this.page.$(selector);
      if (!input) {
        throw new Error(`File input not found with selector: ${selector}`);
      }
      
      await input.setInputFiles(absolutePath);
      console.log('✅ File uploaded successfully');
      
      // Wait a moment for any UI updates after upload
      await this.page.waitForTimeout(1000);
      
    } catch (error) {
      console.error('❌ Error during file upload:', error.message);
      throw error;
    }
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
      return { success: true };
    } catch (error) {
      console.error('❌ Pipeline failed:', error);
      
      // Take a screenshot on error
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = `error-${timestamp}.png`;
      try {
        await this.page?.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Screenshot saved to: ${screenshotPath}`);
      } catch (screenshotError) {
        console.error('Failed to take screenshot:', screenshotError);
      }
      
      return { 
        success: false, 
        error: error.message,
        screenshot: fs.existsSync(screenshotPath) ? screenshotPath : null,
        video: this.videoPath
      };
    } finally {
      // Close the context first to ensure video is saved
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      
      // Then close the browser
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      // Log video path if available
      if (this.videoPath) {
        console.log(`🎥 Video recorded: ${this.videoPath}`);
      }
    }
  }
}

export default TaskRunner;
