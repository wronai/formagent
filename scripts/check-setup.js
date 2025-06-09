#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Helper functions for colored output
function success(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function warning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function error(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function info(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

// Main function
async function checkSetup() {
  console.log('🔍 Checking FormAgent setup...\n');
  
  // 1. Check Node.js version
  try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(process.version.match(/v(\d+)\./)[1], 10);
    if (majorVersion >= 14) {
      success(`Node.js version: ${nodeVersion} (OK)`);
    } else {
      warning(`Node.js version ${nodeVersion} is outdated. Please upgrade to Node.js 14 or later.`);
    }
  } catch (err) {
    error('Failed to check Node.js version');
  }
  
  // 2. Check npm installation
  try {
    const npmVersion = execSync('npm --version').toString().trim();
    success(`npm version: ${npmVersion} (OK)`);
  } catch (err) {
    error('npm is not installed or not in PATH');
  }
  
  // 3. Check Playwright installation
  try {
    const playwrightVersion = execSync('npx playwright --version').toString().trim();
    success(`Playwright version: ${playwrightVersion} (OK)`);
  } catch (err) {
    warning('Playwright is not installed. Installing...');
    try {
      execSync('npx playwright install', { stdio: 'inherit' });
      success('Playwright installed successfully');
    } catch (installErr) {
      error('Failed to install Playwright');
      console.error(installErr);
    }
  }
  
  // 4. Check .env file
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    success('.env file exists');
    
    // Check required environment variables
    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
      'USER_FIRST_NAME',
      'USER_LAST_NAME',
      'USER_EMAIL',
      'USER_PHONE',
      'CV_PATH',
      'COVER_LETTER_PATH'
    ];
    
    let allVarsPresent = true;
    for (const varName of requiredVars) {
      if (!envContent.includes(`${varName}=`)) {
        warning(`Missing required environment variable: ${varName}`);
        allVarsPresent = false;
      }
    }
    
    if (allVarsPresent) {
      success('All required environment variables are set');
    }
  } else {
    error('.env file not found. Please copy .env.example to .env and update the values.');
  }
  
  // 5. Check documents directory
  const docsDir = path.resolve(__dirname, '../documents');
  if (fs.existsSync(docsDir)) {
    success('Documents directory exists');
    
    // Check for required documents
    const requiredDocs = [
      'cv.pdf',
      'cover_letter.pdf'
    ];
    
    let allDocsPresent = true;
    for (const doc of requiredDocs) {
      const docPath = path.join(docsDir, doc);
      if (!fs.existsSync(docPath)) {
        warning(`Missing document: ${doc}`);
        allDocsPresent = false;
      } else {
        success(`Found document: ${doc}`);
      }
    }
    
    if (!allDocsPresent) {
      info('Please add the missing documents to the documents/ directory');
    }
  } else {
    error('Documents directory not found. Please create a documents/ directory.');
  }
  
  // 6. Check job URLs file
  const jobUrlsPath = path.resolve(__dirname, '../job_urls.txt');
  if (fs.existsSync(jobUrlsPath)) {
    const content = fs.readFileSync(jobUrlsPath, 'utf8');
    const urls = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    
    if (urls.length > 0) {
      success(`Found ${urls.length} job URL(s) in job_urls.txt`);
    } else {
      warning('No job URLs found in job_urls.txt. Add job URLs to get started.');
    }
  } else {
    error('job_urls.txt not found. Please create this file and add job URLs.');
  }
  
  console.log('\n✅ Setup check completed');
  console.log('\nNext steps:');
  console.log('1. Review any warnings or errors above');
  console.log('2. Run `npm run apply` to start applying to jobs');
  console.log('3. Check the logs directory for detailed logs');
}

// Run the setup check
checkSetup().catch(console.error);
