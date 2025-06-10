import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFileUpload() {
    console.log('🚀 Starting file upload test...');
    
    // Create a test file if it doesn't exist
    const testFilePath = path.join(__dirname, 'test-upload.txt');
    if (!fs.existsSync(testFilePath)) {
        fs.writeFileSync(testFilePath, 'This is a test file for file upload functionality.\nCreated on: ' + new Date().toISOString());
    }

    // Create a simple HTML page for testing
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>File Upload Test</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .container { margin-top: 50px; text-align: center; }
            #fileInput { display: none; }
            .upload-btn {
                background-color: #4CAF50;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
            }
            #fileInfo { margin-top: 20px; padding: 10px; border: 1px solid #ddd; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>File Upload Test</h1>
            <input type="file" id="fileInput">
            <button class="upload-btn" id="uploadBtn">Select File</button>
            <div id="fileInfo">No file selected</div>
        </div>
        <script>
            document.getElementById('uploadBtn').addEventListener('click', () => {
                document.getElementById('fileInput').click();
            });
            
            document.getElementById('fileInput').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    document.getElementById('fileInfo').innerHTML = '
                        <strong>Selected file:</strong> ' + file.name + '<br>\n' +
                        '<strong>Type:</strong> ' + (file.type || 'Unknown') + '<br>\n' +
                        '<strong>Size:</strong> ' + file.size + ' bytes';
                }
            });
        </script>
    </body>
    </html>`;

    const htmlPath = path.join(__dirname, 'test-upload-page.html');
    fs.writeFileSync(htmlPath, htmlContent);

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('🌐 Opening test page...');
        await page.goto(`file:${htmlPath}`);
        
        console.log('📤 Uploading file...');
        const fileInput = await page.$('input[type="file"]');
        
        if (!fileInput) {
            throw new Error('File input not found on the page');
        }
        
        // Make the input visible for testing
        await page.evaluate((input) => {
            input.style.display = 'block';
            input.style.visibility = 'visible';
            input.style.width = '100%';
            input.style.height = '100%';
        }, fileInput);
        
        // Set the file
        console.log('📤 Setting file input...');
        await fileInput.setInputFiles(testFilePath);
        
        console.log('⏳ Waiting for file info to update...');
        
        // Wait for the file info to be updated
        await page.waitForFunction(
          () => {
            const info = document.querySelector('#fileInfo');
            return info && info.textContent && info.textContent.includes('bytes');
          },
          { timeout: 5000 }
        );
        
        console.log('✅ File uploaded successfully');
        
        // Verify the file was set
        const fileInfo = await page.$eval('#fileInfo', el => el.textContent);
        console.log('📄 File info:', fileInfo.trim());
        
        if (fileInfo.includes('test-upload.txt') && fileInfo.includes('bytes')) {
            console.log('✅ Test passed: File was successfully attached');
        } else {
            console.log('❌ Test failed: File was not attached correctly');
            console.log('File info content:', JSON.stringify(fileInfo));
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Clean up
        await browser.close();
        try {
            fs.unlinkSync(htmlPath);
        } catch (e) {
            console.log('Could not delete temporary HTML file:', e.message);
        }
    }
}

testFileUpload().catch(console.error);
