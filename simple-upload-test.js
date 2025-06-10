const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

async function testFileUpload() {
    console.log('🚀 Starting simple file upload test...');
    
    // Create a test file
    const testFilePath = path.join(__dirname, 'test-file.txt');
    await fs.writeFile(testFilePath, 'This is a test file for upload');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        console.log('🌐 Creating test page...');
        await page.setContent(`
            <!DOCTYPE html>
            <html>
            <body>
                <h1>Simple File Upload Test</h1>
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
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('input[type="file"]')
        ]);
        
        await fileChooser.setFiles(testFilePath);
        
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
        await browser.close();
        // Clean up test file
        try { await fs.unlink(testFilePath); } catch (e) {}
    }
}

testFileUpload().catch(console.error);
