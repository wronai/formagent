import { chromium } from 'playwright';
import path from 'path';
import { writeFileSync, unlinkSync, writeFile } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a simple HTTP server for testing
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>File Upload Test</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
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
          #fileInfo { 
            margin-top: 20px; 
            padding: 10px; 
            border: 1px solid #ddd;
            min-height: 50px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>File Upload Test</h1>
          <form id="uploadForm" method="POST" enctype="multipart/form-data">
            <input type="file" id="fileInput" name="file">
            <button type="button" class="upload-btn" id="uploadBtn">Select File</button>
            <div id="fileInfo">No file selected</div>
            <button type="submit" class="upload-btn" style="margin-top: 20px;">Upload File</button>
          </form>
          <div id="result"></div>
        </div>
        <script>
          document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
          });
          
          document.getElementById('fileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
              document.getElementById('fileInfo').innerHTML = 
                '<strong>Selected file:</strong> ' + file.name + '<br>' +
                '<strong>Type:</strong> ' + (file.type || 'Unknown') + '<br>' +
                '<strong>Size:</strong> ' + file.size + ' bytes';
            }
          });

          document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
              const response = await fetch('/upload', {
                method: 'POST',
                body: formData
              });
              const result = await response.text();
              document.getElementById('result').innerHTML = 
                '<div style="margin-top: 20px; padding: 10px; background: #e8f5e9; border: 1px solid #4caf50;">' +
                '<strong>Upload successful!</strong><br>' + result + '</div>';
            } catch (error) {
              document.getElementById('result').innerHTML = 
                '<div style="margin-top: 20px; padding: 10px; background: #ffebee; border: 1px solid #f44336;">' +
                '<strong>Upload failed:</strong> ' + error.message + '</div>';
            }
          });
        </script>
      </body>
      </html>
    `);
  } else if (req.method === 'POST' && req.url === '/upload') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      // In a real application, you would parse the multipart form data here
      // For this test, we'll just return a success message
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'File was uploaded successfully!',
        // In a real app, you would include the file details here
        file: {
          name: 'test-file.txt',
          size: 12345,
          type: 'text/plain'
        }
      }));
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Start the server on a random available port
const serverInstance = server.listen(0, 'localhost', () => {
  const port = serverInstance.address().port;
  console.log(`Test server running at http://localhost:${port}`);
  
  // Run the test after the server starts
  runTest(port).catch(console.error);
});

async function runTest(port) {

// Run the test
  console.log('Starting test with port:', port);
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('Creating test file...');
    const testFilePath = path.join(__dirname, 'test-file.txt');
    writeFileSync(testFilePath, 'This is a test file for upload');
    
    console.log('Navigating to test page...');
    await page.goto(`http://localhost:${port}`);
    
    console.log('Uploading file...');
    const fileInput = await page.$('input[type="file"]');
    
    if (!fileInput) {
      throw new Error('File input not found on the page');
    }
    
    // Upload the file
    await fileInput.setInputFiles(testFilePath);
    
    // Verify the file was selected
    const fileInfo = await page.$eval('#fileInfo', el => el.textContent);
    console.log('File info:', fileInfo);
    
    if (!fileInfo.includes('test-file.txt')) {
      throw new Error('File was not properly selected');
    }
    
    console.log('Submitting the form...');
    await page.click('button[type="submit"]');
    
    // Wait for the success message
    await page.waitForSelector('#result', { state: 'visible', timeout: 10000 });
    
    const result = await page.$eval('#result', el => el.textContent);
    console.log('Upload result:', result);
    
    if (result.includes('successful')) {
      console.log('✅ Test passed: File upload was successful');
    } else {
      console.log('❌ Test failed: File upload was not successful');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Take a screenshot if something goes wrong
    await page.screenshot({ path: 'upload-test-error.png' });
    console.log('📸 Screenshot saved as upload-test-error.png');
    
  } finally {
    // Clean up
    await browser.close();
    try { unlinkSync(path.join(__dirname, 'test-file.txt')); } catch (e) {}
    server.close();
  }
}
