#!/usr/bin/env node

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import FormFillerManager from './src/formFillerManager.js';
import BewerbungJobsFiller from './src/strategies/bewerbungJobsFiller.js';
import MockFormFiller from './src/strategies/mockFormFiller.js';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDirectories() {
  const fs = await import('fs/promises');
  const dirs = [
    'out',
    'in/personal',
    'in/education',
    'in/experience',
    'in/skills',
    'in/documents',
    'out/errors'
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true }).catch(console.warn);
  }
}

async function main() {
  console.log('🚀 Starting form filler...');
  
  try {
    // Ensure all required directories exist
    await ensureDirectories();
    
    // Initialize the form filler manager
    const manager = new FormFillerManager();
    
    // Register strategies
    manager.registerStrategy('localhost', MockFormFiller);
    manager.registerStrategy('bewerbung.jobs', BewerbungJobsFiller);
    
    // Process job URLs
    const jobUrlsPath = path.join(__dirname, 'job_urls.txt');
    console.log(`📋 Processing URLs from: ${jobUrlsPath}`);
    
    await manager.processJobUrls(jobUrlsPath);
    
    console.log('\n✅ Form filling process completed!');
  } catch (error) {
    console.error('❌ Error in form filler:');
    console.error(error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

main().catch(console.error);
