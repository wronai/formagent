import { BrowserAutomation } from '../src/browser/index.js';
import logger from '../src/utils/logger.js';

async function runDemo() {
  // Initialize the browser with options
  const browser = new BrowserAutomation({
    headless: false, // Set to true for headless mode
    downloadsDir: './downloads' // Directory for downloaded files
  });

  try {
    logger.info('Initializing browser...');
    await browser.initialize();

    // Navigation example
    logger.info('Navigating to example.com...');
    await browser.navigation.goto('https://example.com');
    
    // Get page title
    const title = await browser.navigation.getTitle();
    logger.info(`Page title: ${title}`);
    
    // Take a screenshot
    await browser.file.takeScreenshot({
      path: './screenshots/example-home.png',
      fullPage: true
    });

    // Navigation to a test form
    logger.info('Navigating to test form...');
    await browser.navigation.goto('https://playwright.dev/docs/test-assertions');
    
    // Wait for the search input to be visible
    await browser.element.waitForVisible('input[placeholder*="Search"]');
    
    // Fill the search form
    logger.info('Filling search form...');
    await browser.form.fill('input[placeholder*="Search"]', 'locator');
    
    // Wait for search results
    await browser.element.waitForVisible('text=Locator');
    
    // Take another screenshot
    await browser.file.takeScreenshot({
      path: './screenshots/search-results.png',
      fullPage: true
    });
    
    logger.info('Search form filled successfully!');
    
    // Example of file upload (uncomment and modify as needed)
    // await browser.file.uploadFile('input[type="file"]', './example.txt');
    
    // Example of form submission (uncomment if needed)
    // await browser.form.submitForm('form');
    
    logger.info('Demo completed successfully!');
    
  } catch (error) {
    logger.error('Demo failed:', error);
    
    // Take a screenshot on error
    try {
      await browser.file.takeScreenshot({
        path: './screenshots/error.png',
        fullPage: true
      });
      logger.info('Screenshot saved to ./screenshots/error.png');
    } catch (screenshotError) {
      logger.error('Failed to take error screenshot:', screenshotError);
    }
    
    throw error; // Re-throw the error after handling
    
  } finally {
    // Always close the browser when done
    await browser.close().catch(error => {
      logger.error('Error closing browser:', error);
    });
  }
}

// Run the demo
runDemo().catch(error => {
  logger.error('Unhandled error in demo:', error);
  process.exit(1);
});

export default runDemo;
