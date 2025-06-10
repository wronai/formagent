#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TaskRunner from './src/taskRunner.js';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    phone: "+48123456789"
  },
  paths: {
    cv: path.resolve(__dirname, 'documents/cv.pdf'),
    coverLetter: path.resolve(__dirname, 'documents/cover_letter.pdf')
  }
};

// Add cover letter template after USER_DATA is defined
USER_DATA.user.coverLetter = `Sehr geehrtes Team,

hiermit bewerbe ich mich auf die ausgeschriebene Stelle. 
Meine vollständigen Unterlagen finden Sie im Anhang.

Mit freundlichen Grüßen,
${USER_DATA.user.firstName} ${USER_DATA.user.lastName}`;

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
  let result;
  
  try {
    result = await runner.run(CONFIG.pipelineFile, {
      ...USER_DATA,
      jobUrl: url
    });
    
    if (result.success) {
      console.log(`✅ Successfully processed: ${url}`);
      if (result.video) {
        console.log(`🎥 Video recording: ${result.video}`);
      }
      return { success: true, video: result.video };
    } else {
      console.error(`❌ Error processing ${url} (attempt ${attempt}):`, result.error || 'Unknown error');
      if (result.screenshot) console.log(`📸 Error screenshot: ${result.screenshot}`);
      if (result.video) console.log(`🎥 Error video: ${result.video}`);
      
      if (attempt < CONFIG.maxRetries) {
        console.log(`🔄 Retrying... (${attempt + 1}/${CONFIG.maxRetries})`);
        return processJobApplication(url, attempt + 1);
      }
      
      console.error(`❌ Failed to process after ${CONFIG.maxRetries} attempts: ${url}`);
      return { success: false, error: result.error, screenshot: result.screenshot, video: result.video };
    }
  } catch (error) {
    console.error(`❌ Unhandled error processing ${url} (attempt ${attempt}):`, error);
    
    if (attempt < CONFIG.maxRetries) {
      console.log(`🔄 Retrying... (${attempt + 1}/${CONFIG.maxRetries})`);
      return processJobApplication(url, attempt + 1);
    }
    
    console.error(`❌ Failed to process after ${CONFIG.maxRetries} attempts: ${url}`);
    return { 
      success: false, 
      error: error.message, 
      screenshot: result?.screenshot, 
      video: result?.video 
    };
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
  
  const results = {
    success: 0,
    failed: 0,
    failedUrls: [],
    videos: []
  };
  
  for (const url of jobUrls) {
    const result = await processJobApplication(url);
    
    if (result.success) {
      results.success++;
      if (result.video) {
        results.videos.push({
          url,
          path: result.video,
          status: 'success'
        });
      }
    } else {
      results.failed++;
      results.failedUrls.push({
        url,
        error: result.error,
        screenshot: result.screenshot,
        video: result.video
      });
      
      if (result.video) {
        results.videos.push({
          url,
          path: result.video,
          status: 'error',
          error: result.error
        });
      }
    }
    
    // Add a delay between jobs to avoid rate limiting
    if (jobUrls.indexOf(url) < jobUrls.length - 1) {
      console.log(`\n⏳ Waiting ${CONFIG.delayBetweenJobs / 1000} seconds before next job...\n`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenJobs));
    }
  }
  
  // Print summary
  console.log('\n🏁 Job Application Summary');
  console.log('======================');
  console.log(`✅ Successfully processed: ${results.success} job(s)`);
  console.log(`❌ Failed to process: ${results.failed} job(s)`);
  
  // Log video recordings
  if (results.videos.length > 0) {
    console.log('\n🎥 Video Recordings:');
    results.videos.forEach((video, index) => {
      console.log(`${index + 1}. [${video.status.toUpperCase()}] ${video.url}`);
      console.log(`   Path: ${video.path}`);
      if (video.error) console.log(`   Error: ${video.error}`);
    });
  }
  
  if (results.failed > 0) {
    console.log('\n❌ Failed URLs:');
    results.failedUrls.forEach((item, index) => {
      console.log(`${index + 1}. ${item.url}`);
      if (item.error) console.log(`   Error: ${item.error}`);
      if (item.screenshot) console.log(`   Screenshot: ${item.screenshot}`);
      if (item.video) console.log(`   Video: ${item.video}`);
    });
  }
  
  return results;
}

// Run the main function
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});