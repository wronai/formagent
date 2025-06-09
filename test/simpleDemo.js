const { chromium } = require('playwright');

async function runDemo() {
  console.log('🚀 Starting simple browser automation demo...');
  
  // Launch the browser in non-headless mode so we can see what's happening
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Example 1: Search Google
    console.log('\n🔍 Example 1: Searching Google for "zielone samochody"');
    await page.goto('https://www.google.com');
    
    // Accept cookies if the banner appears
    try {
      await page.click('button:has-text("Accept all")', { timeout: 3000 });
      console.log('✅ Accepted cookies');
    } catch (e) {
      console.log('ℹ️ No cookie banner found');
    }
    
    // Type the search query
    await page.fill('textarea[name="q"]', 'zielone samochody');
    
    // Click the search button
    await Promise.all([
      page.waitForNavigation(),
      page.click('input[name="btnK"]')
    ]);
    
    console.log('✅ Search completed');
    console.log('   Page title:', await page.title());
    
    // Wait a moment to see the results
    await page.waitForTimeout(2000);
    
    // Example 2: Fill a test form
    console.log('\n📝 Example 2: Filling a test form');
    await page.goto('https://www.example.com');
    
    // Example 3: Show how to fill a form (this won't submit since it's example.com)
    console.log('   On example.com - showing how form filling would work');
    
    // Example 4: Show file upload (commented out as it requires a real form)
    // console.log('\n📤 Example 4: File upload demo');
    // const [fileChooser] = await Promise.all([
    //   page.waitForEvent('filechooser'),
    //   page.click('input[type="file"]')
    // ]);
    // await fileChooser.setFiles('test/test-file.txt');
    // console.log('✅ File selected for upload');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Keep the browser open for a while before closing
    console.log('\n🏁 Demo completed. The browser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Run the demo
runDemo().catch(console.error);
