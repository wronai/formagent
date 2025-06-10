import { chromium } from 'playwright';
import path from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Creating test file...');
    const testFilePath = path.join(__dirname, 'test-file.txt');
    writeFileSync(testFilePath, 'Test file content');
    
    console.log('Creating test page...');
    await page.setContent(`
      <html>
        <body>
          <input type="file" id="fileInput">
          <div id="status">No file selected</div>
          <script>
            document.getElementById('fileInput').onchange = function(e) {
              const file = e.target.files[0];
              document.getElementById('status').textContent = 
                'Selected: ' + file.name + ' (' + file.size + ' bytes)';
            };
          </script>
        </body>
      </html>
    `);

    console.log('Uploading file...');
    const input = await page.$('input[type="file"]');
    await input.setInputFiles(testFilePath);
    
    console.log('Waiting for status update...');
    await page.waitForFunction(
      'document.getElementById("status").textContent.includes("test-file.txt")',
      { timeout: 5000 }
    );
    
    const status = await page.$eval('#status', el => el.textContent);
    console.log('Status:', status);
    
    if (status.includes('test-file.txt')) {
      console.log('✅ Test passed!');
    } else {
      console.log('❌ Test failed');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
    try { unlinkSync(path.join(__dirname, 'test-file.txt')); } catch (e) {}
  }
})();
