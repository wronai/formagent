import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration script to update code from old browserAutomation.js to the new modular structure
 */
async function migrateFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    
    // Replace imports
    content = content.replace(
      /const\s+{\s*BrowserAutomation\s*}\s*=\s*require\(['"]\.\/src\/browserAutomation['"]\)/g,
      'const { BrowserAutomation } = require(\'./src/browser\')'
    );
    
    // Replace method calls with new structure
    content = content.replace(/\.browser\./g, '.browserManager.');
    content = content.replace(/\.page\./g, '.getPage().');
    
    // Save the updated file
    await fs.writeFile(filePath, content, 'utf-8');
    logger.info(`Migrated: ${filePath}`);
  } catch (error) {
    logger.error(`Error migrating ${filePath}:`, error);
  }
}

// Main function to run the migration
async function main() {
  const filesToMigrate = [
    'run-job-applications.js',
    'run-pipeline.js',
    'test/simpleDemo.js',
    'test/browserAutomationDemo.js'
  ];
  
  for (const file of filesToMigrate) {
    try {
      await fs.access(file);
      await migrateFile(file);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error(`Error processing ${file}:`, error);
      }
    }
  }
  
  logger.info('Migration completed. Please review the changes and test thoroughly.');
}

// Run the migration
if (require.main === module) {
  main().catch(error => {
    logger.error('Migration failed:', error);
    process.exit(1);
  });
}

export { migrateFile };
