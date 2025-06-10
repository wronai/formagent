const { chromium } = require('playwright');
const path = require('path');

(async () => {
  // Create a browser instance
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 Starting file upload test...');
    
    // Create a test file
    const testFilePath = path.join(__dirname, 'test-file.txt');
    require('fs').writeFileSync(testFilePath, 'Test file content');
    
    // Navigate to a simple test page
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <h1>File Upload Test</h1>
        <input type="file" id="fileInput">
        <div id="status">No file selected</div>
        <script>
          document.getElementById('fileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
              document.getElementById('status').textContent = 
                `Selected: ${file.name} (${file.size} bytes)`;
            }
          });
        </script>
      </body>
      </html>
    `);

    console.log('📤 Uploading file...');
    
    // Set the file input directly
    const input = await page.$('input[type="file"]');
    await input.setInputFiles(testFilePath);
    
    // Wait for the status to update
    await page.waitForFunction(
      'document.getElementById("status").textContent.includes("test-file.txt")',
      { timeout: 5000 }
    );
    
    const status = await page.$eval('#status', el => el.textContent);
    console.log('✅ Upload status:', status);
    
    if (status.includes('test-file.txt')) {
      console.log('✅ Test passed: File was successfully attached');
    } else {
      console.log('❌ Test failed: File was not attached correctly');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    await browser.close();
    try { require('fs').unlinkSync(path.join(__dirname, 'test-file.txt')); } catch (e) {}
  }
})();
