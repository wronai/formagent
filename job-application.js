import { chromium } from 'playwright';
import path from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  // Test file to upload (CV)
  testFile: {
    name: 'lebenslauf.pdf',
    content: 'Test CV content',
    type: 'application/pdf'
  },
  
  // Target job application URL
  targetUrl: 'https://bewerbung.jobs/325696/buchhalter-m-w-d',
  
  // Applicant information
  applicant: {
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max.mustermann@example.com',
    phone: '017612345678',
    street: 'Musterstraße 1',
    city: 'Berlin',
    zip: '10115',
    country: 'Deutschland',
    salary: '50.000',
    availability: '01.09.2023',
    message: 'Sehr geehrtes Team,\n\nmit großem Interesse habe ich Ihre Stellenausschreibung für die Position als Buchhalter (m/w/d) gelesen und bewerbe mich hiermit um die ausgeschriebene Stelle.\n\nMit freundlichen Grüßen,\nMax Mustermann'
  },
  
  // Timeouts
  timeouts: {
    pageLoad: 60000,    // 60 seconds
    elementVisible: 15000, // 15 seconds
    action: 5000,       // 5 seconds
    navigation: 30000   // 30 seconds
  },
  
  // Headless mode (set to false to see the browser)
  headless: false,
  
  // Screenshot paths
  screenshots: {
    formFilled: 'form-filled.png',
    beforeSubmit: 'before-submit.png',
    afterSubmit: 'after-submit.png',
    error: 'error.png'
  }
};

async function submitJobApplication() {
  console.log('🚀 Starting job application...');
  
  // Create a test PDF file (in a real scenario, use a real PDF file)
  const testFilePath = path.join(__dirname, CONFIG.testFile.name);
  writeFileSync(testFilePath, CONFIG.testFile.content);
  console.log(`📄 Created test file: ${testFilePath}`);
  
  // Launch browser with German language settings
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({ 
    headless: CONFIG.headless,
    slowMo: 100 // Slow down by 100ms for better visualization
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1200 },
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    acceptDownloads: true
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to the job application page
    console.log(`🌍 Navigating to ${CONFIG.targetUrl}...`);
    await page.goto(CONFIG.targetUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.timeouts.pageLoad 
    });
    
    // Accept cookies if the banner is present
    try {
      await page.click('button:has-text("Alle akzeptieren"), button:has-text("Akzeptieren"), [id*="cookie"] button, [class*="cookie"] button', {
        timeout: 5000
      });
      console.log('✅ Accepted cookies');
    } catch (e) {
      console.log('ℹ️ No cookie banner found or could not accept cookies');
    }
    
    // Click on "Jetzt bewerben" button
    console.log('📝 Starting application process...');
    await page.click('button:has-text("Jetzt bewerben"), a:has-text("Jetzt bewerben")', {
      timeout: CONFIG.timeouts.elementVisible
    });
    
    // Wait for the application form to load
    console.log('⏳ Loading application form...');
    await page.waitForSelector('form', { 
      state: 'visible',
      timeout: CONFIG.timeouts.elementVisible 
    });
    
    // Fill out personal information
    console.log('✍️ Filling out personal information...');
    await page.fill('input[name*="vorname"], input[name*="firstname"], #vorname, #firstname', CONFIG.applicant.firstName);
    await page.fill('input[name*="nachname"], input[name*="lastname"], #nachname, #lastname', CONFIG.applicant.lastName);
    await page.fill('input[type="email"], input[name*="email"], #email', CONFIG.applicant.email);
    await page.fill('input[type="tel"], input[name*="phone"], #phone', CONFIG.applicant.phone);
    
    // Fill out address
    await page.fill('input[name*="strasse"], input[name*="street"], #strasse, #street', CONFIG.applicant.street);
    await page.fill('input[name*="plz"], input[name*="zip"], #plz, #zip', CONFIG.applicant.zip);
    await page.fill('input[name*="ort"], input[name*="city"], #ort, #city', CONFIG.applicant.city);
    
    // Handle file upload
    console.log('📤 Handling file upload...');
    try {
      // Look for file input (might be hidden)
      const fileInput = await page.$('input[type="file"]');
      
      if (fileInput) {
        // Make the input visible if it's hidden
        await page.evaluate((input) => {
          input.style.visibility = 'visible';
          input.style.display = 'block';
          input.style.width = '100%';
          input.style.height = '100%';
          input.style.opacity = '1';
          input.style.position = 'static';
        }, fileInput);
        
        // Set the file input
        await fileInput.setInputFiles(testFilePath);
        console.log('✅ File uploaded successfully');
      } else {
        console.log('⚠️ File input not found, trying drag and drop approach');
        // Alternative approach if the file input is not directly accessible
        await page.click('.file-upload, .upload-button, [class*="upload"], [id*="upload"]', {
          timeout: 5000
        }).catch(() => {});
        
        // Wait a moment for any dialog to appear (though we won't interact with it)
        await page.waitForTimeout(1000);
        
        // Try to find the file input again after clicking
        const fileInputAfterClick = await page.$('input[type="file"]');
        if (fileInputAfterClick) {
          await fileInputAfterClick.setInputFiles(testFilePath);
          console.log('✅ File uploaded after clicking upload area');
        } else {
          console.log('⚠️ Could not find file input even after clicking upload area');
        }
      }
    } catch (error) {
      console.error('⚠️ Error during file upload:', error.message);
      // Continue with the application even if file upload fails
    }
    
    // Fill out additional information
    console.log('📝 Filling out additional information...');
    try {
      // Try to fill salary expectation if field exists
      await page.fill('input[name*="gehalt"], input[name*="salary"], #gehalt, #salary', CONFIG.applicant.salary);
    } catch (e) {
      console.log('ℹ️ Salary field not found or not fillable');
    }
    
    try {
      // Try to fill availability date if field exists
      await page.fill('input[name*="verfugbar"], input[name*="available"], #verfugbar, #available', CONFIG.applicant.availability);
    } catch (e) {
      console.log('ℹ️ Availability field not found or not fillable');
    }
    
    // Fill out cover letter/message
    try {
      await page.fill('textarea, [role="textbox"], [contenteditable="true"], [class*="message"], [id*="message"]', 
                     CONFIG.applicant.message);
    } catch (e) {
      console.log('ℹ️ Could not fill message field:', e.message);
    }
    
    // Take a screenshot before submitting
    console.log('📸 Taking screenshot of filled form...');
    await page.screenshot({ path: CONFIG.screenshots.formFilled });
    
    // Handle consent checkboxes
    console.log('✅ Checking consent checkboxes...');
    try {
      // Check all checkboxes (data protection, terms, etc.)
      const checkboxes = await page.$$('input[type="checkbox"]');
      for (const checkbox of checkboxes) {
        try {
          await checkbox.check({ timeout: 1000 });
        } catch (e) {
          // Ignore if checkbox can't be checked
        }
      }
    } catch (e) {
      console.log('ℹ️ Could not check all checkboxes:', e.message);
    }
    
    // Take a screenshot before submitting
    await page.screenshot({ path: CONFIG.screenshots.beforeSubmit });
    
    // Submit the form
    console.log('🚀 Submitting the application...');
    
    // Try to find and click the submit button
    try {
      await page.click('button[type="submit"], input[type="submit"], button:has-text("Bewerbung absenden"), button:has-text("Absenden")', {
        timeout: CONFIG.timeouts.action
      });
      
      // Wait for navigation or success message
      try {
        await page.waitForNavigation({
          waitUntil: 'networkidle',
          timeout: CONFIG.timeouts.navigation
        });
        console.log('✅ Form submitted successfully');
      } catch (e) {
        console.log('ℹ️ No navigation detected after form submission');
      }
      
      // Take a screenshot after submission
      await page.screenshot({ path: CONFIG.screenshots.afterSubmit });
      
      // Check for success message
      const pageContent = await page.content();
      if (pageContent.toLowerCase().includes('erfolg') || 
          pageContent.toLowerCase().includes('danke') ||
          pageContent.toLowerCase().includes('vielen dank')) {
        console.log('🎉 Application submitted successfully!');
      } else {
        console.log('ℹ️ Application might not have been submitted successfully');
        console.log('Please check the screenshots for more information');
      }
      
    } catch (error) {
      console.error('❌ Error submitting the form:', error.message);
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Application failed:', error);
    
    // Take a screenshot on error
    try {
      await page.screenshot({ path: CONFIG.screenshots.error });
      console.log(`📸 Error screenshot saved as ${CONFIG.screenshots.error}`);
    } catch (e) {
      console.log('⚠️ Could not take error screenshot:', e.message);
    }
    
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
    console.log('✨ Application process completed');
  }
}

// Run the application
submitJobApplication().catch(console.error);
