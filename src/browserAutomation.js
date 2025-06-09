const { chromium } = require('playwright');
const logger = require('./utils/logger');

class BrowserAutomation {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async initialize(headless = true) {
    try {
      this.browser = await chromium.launch({ headless });
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 1024 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      });
      this.page = await this.context.newPage();
      logger.info('Browser initialized');
    } catch (error) {
      logger.error('Error initializing browser:', error);
      throw error;
    }
  }

  async searchGoogle(query) {
    try {
      logger.info(`Searching Google for: ${query}`);
      await this.page.goto('https://www.google.com');
      
      // Accept cookies if the banner appears
      try {
        await this.page.click('button:has-text("Accept all")', { timeout: 3000 });
        logger.info('Accepted cookies');
      } catch (e) {
        logger.info('No cookie banner found or could not click it');
      }
      
      // Type the search query
      await this.page.fill('textarea[name="q"]', query);
      
      // Click the search button
      await Promise.all([
        this.page.waitForNavigation(),
        this.page.click('input[name="btnK"]')
      ]);
      
      logger.info('Search completed');
      return await this.page.title();
    } catch (error) {
      logger.error('Error during Google search:', error);
      throw error;
    }
  }

  async fillForm(url, formData) {
    try {
      logger.info(`Filling form at: ${url}`);
      await this.page.goto(url);
      
      // Wait for the form to be ready
      await this.page.waitForLoadState('networkidle');
      
      // Fill each form field
      for (const [field, value] of Object.entries(formData)) {
        try {
          // Try different selectors
          const selectors = [
            `input[name="${field}"], textarea[name="${field}"], [name="${field}"]`,
            `input[placeholder*="${field}"], textarea[placeholder*="${field}"]`,
            `[id*="${field}" i]`,
            `[class*="${field}" i]`,
            `input[type="${field}"]`
          ];
          
          for (const selector of selectors) {
            try {
              await this.page.fill(selector, value);
              logger.info(`Filled field: ${field}`);
              break;
            } catch (e) {
              // Try next selector
              continue;
            }
          }
        } catch (error) {
          logger.warn(`Could not fill field ${field}:`, error.message);
        }
      }
      
      // Try to submit the form
      try {
        await this.page.click('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Wyślij")');
        logger.info('Form submitted');
      } catch (error) {
        logger.warn('Could not find submit button, trying to press Enter');
        await this.page.keyboard.press('Enter');
      }
      
      // Wait for navigation or success message
      try {
        await this.page.waitForNavigation({ timeout: 5000 });
      } catch (e) {
        logger.info('No navigation occurred after form submission');
      }
      
      return {
        success: true,
        url: this.page.url(),
        title: await this.page.title(),
        content: await this.page.content()
      };
    } catch (error) {
      logger.error('Error filling form:', error);
      return {
        success: false,
        error: error.message,
        screenshot: await this.takeScreenshot('form-error')
      };
    }
  }

  async uploadFile(url, filePath, formSelector = 'form') {
    try {
      logger.info(`Uploading file to: ${url}`);
      await this.page.goto(url);
      
      // Handle file input
      const [fileChooser] = await Promise.all([
        this.page.waitForEvent('filechooser'),
        this.page.click('input[type="file"]')
      ]);
      
      await fileChooser.setFiles(filePath);
      
      // Submit the form
      await this.page.click('button[type="submit"], input[type="submit"]');
      
      // Wait for upload to complete
      await this.page.waitForLoadState('networkidle');
      
      return {
        success: true,
        message: 'File uploaded successfully',
        url: this.page.url()
      };
    } catch (error) {
      logger.error('Error uploading file:', error);
      return {
        success: false,
        error: error.message,
        screenshot: await this.takeScreenshot('upload-error')
      };
    }
  }

  async takeScreenshot(name = 'screenshot') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const screenshotPath = `screenshots/${name}-${timestamp}.png`;
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      return screenshotPath;
    } catch (error) {
      logger.error('Error taking screenshot:', error);
      return null;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Browser closed');
    }
  }
}

// Example usage
async function runExamples() {
  const browser = new BrowserAutomation();
  
  try {
    // Initialize the browser
    await browser.initialize(false); // Set to true for headless mode
    
    // Example 1: Search Google
    console.log('\n--- Example 1: Searching Google ---');
    const searchResults = await browser.searchGoogle('wyszukaj w google zielone samochody');
    console.log('Search results title:', searchResults);
    
    // Example 2: Fill a contact form
    console.log('\n--- Example 2: Filling a contact form ---');
    const formResult = await browser.fillForm('https://example.com/contact', {
      name: 'Jan Kowalski',
      email: 'jan@example.com',
      message: 'To jest testowa wiadomość wysłana automatycznie.'
    });
    console.log('Form submission result:', formResult.success ? 'Success' : 'Failed');
    
    // Example 3: File upload to a test upload service
    console.log('\n--- Example 3: Uploading a file ---');
    const uploadResult = await browser.uploadFile(
      'https://www.file.io/',
      './test/test-file.txt'
    );
    console.log('File upload result:', uploadResult.success ? 'Success' : 'Failed');
    
    // Example 4: Fill a job application form with file upload
    console.log('\n--- Example 4: Job application with file upload ---');
    const jobApplication = await browser.fillForm('https://example.com/careers/apply', {
      'first_name': 'Jan',
      'last_name': 'Kowalski',
      'email': 'jan@example.com',
      'phone': '+48123456789',
      'position': 'Senior Developer',
      'experience': '5+ years',
      'resume': '/path/to/resume.pdf',  // This would be handled by the uploadFile method in a real scenario
      'cover_letter': 'I am very interested in this position...'
    });
    console.log('Job application result:', jobApplication.success ? 'Success' : 'Failed');
    
  } catch (error) {
    console.error('Error in examples:', error);
  } finally {
    await browser.close();
  }
}

// Uncomment to run examples directly
// runExamples().catch(console.error);

module.exports = BrowserAutomation;
