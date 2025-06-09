#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const TaskRunner = require('./src/taskRunner');
const { chromium } = require('playwright');

// Configuration
const CONFIG = {
  jobUrlsFile: './job_urls.txt',
  pipelineFile: './tasks/job_application_pipeline.yaml',
  maxRetries: 2,
  delayBetweenJobs: 5000, // 5 seconds
};

// User data - in a real app, this would come from environment variables or a config file
const USER_DATA = {
  user: {
    firstName: "Jan",
    lastName: "Kowalski",
    email: "jan.kowalski@example.com",
    phone: "+48123456789",
    coverLetter: `Sehr geehrtes Team,

hiermit bewerbe ich mich auf die ausgeschriebene Stelle. 
Meine vollständigen Unterlagen finden Sie im Anhang.

Mit freundlichen Grüßen,
${USER_DATA.user.firstName} ${USER_DATA.user.lastName}`
  },
  paths: {
    cv: path.resolve(__dirname, 'documents/cv.pdf'),
    coverLetter: path.resolve(__dirname, 'documents/cover_letter.pdf')
  }
};

// Create documents directory if it doesn't exist
const documentsDir = path.resolve(__dirname, 'documents');
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
  console.log(`📁 Created documents directory: ${documentsDir}`);
  console.log(`ℹ️ Please add your CV and cover letter to this directory.`);
}

// Check if job URLs file exists
if (!fs.existsSync(CONFIG.jobUrlsFile)) {
  // Create a sample job URLs file
  const sampleUrls = [
    '# Add one job URL per line',
    '# Example:',
    '# https://bewerbung.jobs/295330/sekret%C3%A4r-m-w-d',
    '# https://bewerbung.jobs/325696/buchhalter-m-w-d',
    ''
  ].join('\n');
  
  fs.writeFileSync(CONFIG.jobUrlsFile, sampleUrls);
  console.log(`📝 Created sample job URLs file: ${CONFIG.jobUrlsFile}`);
  console.log('ℹ️ Please edit this file with the actual job URLs you want to apply for.');
  process.exit(0);
}

// Read job URLs from file
function readJobUrls() {
  const content = fs.readFileSync(CONFIG.jobUrlsFile, 'utf8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

// Process a single job application
async function processJobApplication(url, attempt = 1) {
  console.log(`\n📝 Processing job application: ${url}`);
  
  const runner = new TaskRunner();
  
  try {
    await runner.run(CONFIG.pipelineFile, {
      ...USER_DATA,
      jobUrl: url
    });
    
    console.log(`✅ Successfully processed: ${url}`);
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${url} (attempt ${attempt}):`, error.message);
    
    if (attempt < CONFIG.maxRetries) {
      console.log(`🔄 Retrying... (${attempt + 1}/${CONFIG.maxRetries})`);
      return processJobApplication(url, attempt + 1);
    }
    
    console.error(`❌ Failed to process after ${CONFIG.maxRetries} attempts: ${url}`);
    return false;
  } finally {
    await runner.close();
  }
}

// Main function
async function main() {
  console.log('🚀 Starting job application automation');
  console.log('===================================');
  
  const jobUrls = readJobUrls();
  
  if (jobUrls.length === 0) {
    console.log('ℹ️ No job URLs found in the file. Please add some job URLs and try again.');
    return;
  }
  
  console.log(`📋 Found ${jobUrls.length} job(s) to process`);
  
  let successCount = 0;
  let failedCount = 0;
  
  for (const url of jobUrls) {
    const success = await processJobApplication(url);
    
    if (success) {
      successCount++;
    } else {
      failedCount++;
    }
    
    // Add a delay between jobs to avoid rate limiting
    if (jobUrls.indexOf(url) < jobUrls.length - 1) {
      console.log(`⏳ Waiting ${CONFIG.delayBetweenJobs / 1000} seconds before next job...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenJobs));
    }
  }
  
  // Print summary
  console.log('\n🏁 Job Application Summary');
  console.log('======================');
  console.log(`✅ Successfully processed: ${successCount} job(s)`);
  if (failedCount > 0) {
    console.log(`❌ Failed to process: ${failedCount} job(s)`);
  }
}

// Run the main function
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});