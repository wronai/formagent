const { chromium } = require('playwright');
const path = require('path');

// Simple console logger
const logger = {
  info: (...args) => console.log('ℹ️', ...args),
  error: (...args) => console.error('❌', ...args),
  warn: (...args) => console.warn('⚠️', ...args)
};

class SimpleBrowserAutomation {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize(headless = false) {
    try {
      this.browser = await chromium.launch({ headless });
      this.page = await this.browser.newPage();
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

  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Browser closed');
    }
  }
}

// Create an instance of our simple browser automation
const BrowserAutomation = SimpleBrowserAutomation;

async function runDemo() {
  const browser = new BrowserAutomation();
  
  try {
    console.log('🚀 Starting browser automation demo...');
    
    // Initialize the browser in non-headless mode so you can see what's happening
    await browser.initialize(false);
    
    // Example 1: Search Google for "zielone samochody"
    console.log('\n🔍 Example 1: Searching Google for "zielone samochody"');
    try {
      const searchTerm = 'zielone samochody';
      const results = await browser.searchGoogle(searchTerm);
      console.log('✅ Search completed. Page title:', results);
      await browser.page.waitForTimeout(2000); // Pause to see the results
    } catch (error) {
      console.error('❌ Error in Google search example:', error.message);
    }
    
    // Example 2: Fill a test form with file upload
    console.log('\n📝 Example 2: Filling a test form with file upload');
    try {
      const formUrl = 'https://www.file.io/';
      const filePath = path.join(__dirname, 'test-file.txt');
      
      // Create a test file if it doesn't exist
      const fs = require('fs');
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, 'This is a test file for upload demo');
      }
      
      const uploadResult = await browser.uploadFile(formUrl, filePath);
      console.log('✅ File upload result:', uploadResult.success ? 'Success' : 'Failed');
      if (uploadResult.url) console.log('   Upload URL:', uploadResult.url);
      await browser.page.waitForTimeout(2000);
    } catch (error) {
      console.error('❌ Error in file upload example:', error.message);
    }
    
    // Example 3: Fill a job application form
    console.log('\n💼 Example 3: Filling a job application form');
    try {
      const jobFormUrl = 'https://example.com/careers/apply'; // Replace with actual URL
      const formData = {
        'first_name': 'Jan',
        'last_name': 'Kowalski',
        'email': 'jan.kowalski@example.com',
        'phone': '+48123456789',
        'position': 'Senior Developer',
        'experience': '5+ years',
        'message': 'I am very interested in this position...'
      };
      
      console.log(`   Attempting to fill form at: ${jobFormUrl}`);
      const formResult = await browser.fillForm(jobFormUrl, formData);
      console.log('✅ Form submission result:', formResult.success ? 'Success' : 'Failed');
      if (formResult.url) console.log('   Result URL:', formResult.url);
      await browser.page.waitForTimeout(2000);
    } catch (error) {
      console.error('❌ Error in job application example:', error.message);
    }
    
    // Example 4: Fill a contact form
    console.log('\n📧 Example 4: Filling a contact form');
    try {
      const contactFormUrl = 'https://example.com/contact'; // Replace with actual URL
      const contactData = {
        'name': 'Jan Kowalski',
        'email': 'jan@example.com',
        'subject': 'Test Message',
        'message': 'This is a test message sent by an automated script.'
      };
      
      console.log(`   Attempting to fill contact form at: ${contactFormUrl}`);
      const contactResult = await browser.fillForm(contactFormUrl, contactData);
      console.log('✅ Contact form result:', contactResult.success ? 'Success' : 'Failed');
      if (contactResult.url) console.log('   Result URL:', contactResult.url);
    } catch (error) {
      console.error('❌ Error in contact form example:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error in demo:', error);
  } finally {
    console.log('\n🏁 Demo completed. Closing browser...');
    await browser.close();
    process.exit(0);
  }
}

// Run the demo
runDemo().catch(console.error);
