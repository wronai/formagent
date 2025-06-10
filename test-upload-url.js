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
    
    console.log('Navigating to test upload page...');
    await page.goto('https://www.file.io/');
    
    console.log('Waiting for file input...');
    // Try multiple selectors that might be used for file upload
    const fileInputSelectors = [
      'input[type="file"]',
      '#select-files-input',
      '.file-upload-input',
      '[data-testid="file-upload"]',
      'input[accept*="*"]'
    ];
    
    let fileInput = null;
    for (const selector of fileInputSelectors) {
      try {
        fileInput = await page.$(selector);
        if (fileInput) {
          console.log(`Found file input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`Selector ${selector} not found`);
      }
    }
    
    if (!fileInput) {
      throw new Error('Could not find file input on the page');
    }
    
    console.log('Making file input visible...');
    await page.evaluate((input) => {
      input.style.visibility = 'visible';
      input.style.display = 'block';
      input.style.width = '100%';
      input.style.height = '100%';
      input.style.opacity = '1';
      input.style.position = 'static';
    }, fileInput);
    
    console.log('Uploading file...');
    await fileInput.setInputFiles(testFilePath);
    console.log('File input set, waiting for upload to process...');
    
    console.log('Waiting for upload to complete...');
    // Wait for the download link or success message to appear
    console.log('Waiting for upload to complete...');
    await page.waitForFunction(
      () => {
        // Check for download link
        const downloadLink = document.querySelector('a[href*="/download/"]');
        // Or check for success message
        const successMessage = Array.from(document.querySelectorAll('*'))
          .some(el => el.textContent.includes('success') || el.textContent.includes('uploaded'));
        return downloadLink || successMessage;
      },
      { timeout: 30000, polling: 1000 }
    );
    
    // Try to get the download URL if available
    let downloadUrl = 'Download URL not found';
    try {
      downloadUrl = await page.$eval('a[href*="/download/"]', a => a.href);
    } catch (e) {
      console.log('Could not find download URL, but upload might still be successful');
    }
    console.log('✅ File uploaded successfully!');
    console.log('📥 Download URL:', downloadUrl);
    
    // Verify the file was uploaded by checking the page content
    const pageContent = await page.content();
    if (pageContent.includes('test-upload.txt')) {
      console.log('✅ File name is correct in the page');
    } else {
      console.log('❌ File name not found in the page');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Take a screenshot if something goes wrong
    await page.screenshot({ path: 'upload-error.png' });
    console.log('📸 Screenshot saved as upload-error.png');
    
  } finally {
    // Clean up
    await browser.close();
    try { unlinkSync(path.join(__dirname, 'test-upload.txt')); } catch (e) {}
  }
})();
