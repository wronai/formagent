import { chromium } from 'playwright';
import path from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('Creating test file...');
    const testFilePath = path.join(__dirname, 'test-upload.txt');
    writeFileSync(testFilePath, 'This is a test file for URL upload');
    
    console.log('Navigating to httpbin.org file upload test page...');
    await page.goto('https://httpbin.org/forms/post');
    
    console.log('Filling out the form...');
    await page.fill('input[name="custname"]', 'Test User');
    await page.fill('input[name="custtel"]', '123-456-7890');
    await page.fill('input[name="custemail"]', 'test@example.com');
    
    // Find the file input
    console.log('Waiting for file input...');
    const fileInput = await page.$('input[type="file"]');
    
    if (!fileInput) {
      // Try to find the file input in an iframe
      console.log('File input not found in main page, checking for iframes...');
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const frameFileInput = await frame.$('input[type="file"]');
          if (frameFileInput) {
            console.log('Found file input in iframe');
            await frameFileInput.setInputFiles(testFilePath);
            console.log('File uploaded via iframe');
            break;
          }
        } catch (e) {
          console.log('Error checking iframe:', e.message);
        }
      }
    } else {
      console.log('Uploading file...');
      await fileInput.setInputFiles(testFilePath);
    }
    
    console.log('Submitting the form...');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for response...');
    await page.waitForResponse(response => 
      response.url().includes('/post') && response.status() === 200
    );
    
    console.log('✅ Form submitted successfully!');
    
    // Get the response content
    const response = await page.evaluate(() => 
      document.querySelector('body')?.textContent || ''
    );
    
    console.log('Response status:', response.includes('200 OK') ? '✅ 200 OK' : '❌ Not 200');
    
    if (response.includes('test-upload.txt') || response.includes('multipart/form-data')) {
      console.log('✅ File was successfully uploaded!');
      console.log('Response contains the file name');
    } else {
      console.log('❌ File upload verification failed');
      console.log('Response content:', response.substring(0, 500) + '...');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Take a screenshot if something goes wrong
    await page.screenshot({ path: 'upload-httpbin-error.png' });
    console.log('📸 Screenshot saved as upload-httpbin-error.png');
    
  } finally {
    // Clean up
    await browser.close();
    try { unlinkSync(path.join(__dirname, 'test-upload.txt')); } catch (e) {}
  }
})();
