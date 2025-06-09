#!/usr/bin/env node

const FormFillerManager = require('./src/formFillerManager');
const BewerbungJobsFiller = require('./src/strategies/bewerbungJobsFiller');
const path = require('path');

async function main() {
  console.log('Starting form filler...');
  
  // Initialize the form filler manager
  const manager = new FormFillerManager();
  
  // Register strategies
  manager.registerStrategy('bewerbung.jobs', BewerbungJobsFiller);
  
  try {
    // Process job URLs
    const jobUrlsPath = path.join(__dirname, 'job_urls.txt');
    await manager.processJobUrls(jobUrlsPath);
    
    console.log('\nForm filling process completed!');
  } catch (error) {
    console.error('Error in form filler:', error);
    process.exit(1);
  }
}

main().catch(console.error);
