import { chromium } from 'playwright';
import path from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  // Test file to upload
  testFile: {
    name: 'test-upload.txt',
    content: 'This is a test file for upload\nCreated at: ' + new Date().toISOString()
  },
  
  // Test website (using a public file upload service)
  targetUrl: 'https://www.file.io/',
  
  // Timeouts
  timeouts: {
    pageLoad: 30000,    // 30 seconds
    elementVisible: 10000, // 10 seconds
    action: 5000        // 5 seconds
  },
  
  // Headless mode (set to false to see the browser)
  headless: false
};

async function testFileUpload() {
  console.log('🚀 Starting file upload test...');
  
  // Create a test file
  const testFilePath = path.join(__dirname, CONFIG.testFile.name);
  writeFileSync(testFilePath, CONFIG.testFile.content);
  console.log(`📄 Created test file: ${testFilePath}`);
  
  // Launch browser
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({ 
    headless: CONFIG.headless,
    slowMo: 100 // Slow down by 100ms for better visualization
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to the target URL
    console.log(`🌍 Navigating to ${CONFIG.targetUrl}...`);
    await page.goto(CONFIG.targetUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.timeouts.pageLoad 
    });
    
    // Wait for the file input to be present
    console.log('🔍 Looking for file input...');
    const fileInput = await page.waitForSelector('input[type="file"]', {
      state: 'attached',
      timeout: CONFIG.timeouts.elementVisible
    });
    
    if (!fileInput) {
      throw new Error('File input not found on the page');
    }
    
    // Make the input visible (in case it's hidden)
    console.log('👁️ Making file input visible...');
    await page.evaluate((input) => {
      input.style.visibility = 'visible';
      input.style.display = 'block';
      input.style.width = '100%';
      input.style.height = '100%';
      input.style.opacity = '1';
      input.style.position = 'static';
    }, fileInput);
    
    // Set the file input
    console.log('📤 Uploading file...');
    await fileInput.setInputFiles(testFilePath);
    console.log('✅ File input set successfully');
    
    // Wait for any upload to complete (this will vary by website)
    console.log('⏳ Waiting for upload to process...');
    await page.waitForTimeout(5000); // Wait 5 seconds for demo purposes
    
    // Take a screenshot of the result
    const screenshotPath = 'upload-result.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`📸 Screenshot saved as ${screenshotPath}`);
    
    // Check if the upload was successful
    const pageContent = await page.content();
    if (pageContent.includes(CONFIG.testFile.name)) {
      console.log('✅ File name found on the page - upload likely successful!');
    } else {
      console.log('ℹ️ Could not verify upload success automatically');
      console.log('Please check the screenshot and browser window for results');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Take a screenshot on error
    const errorScreenshotPath = 'upload-error.png';
    await page.screenshot({ path: errorScreenshotPath });
    console.log(`📸 Error screenshot saved as ${errorScreenshotPath}`);
    
  } finally {
    // Clean up
    console.log('🧹 Cleaning up...');
    await browser.close();
    try { 
      unlinkSync(testFilePath);
      console.log('🗑️ Test file removed');
    } catch (e) {
      console.log('⚠️ Could not remove test file:', e.message);
    }
    console.log('✨ Test completed');
  }
}

// Run the test
testFileUpload().catch(console.error);
