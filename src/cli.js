#!/usr/bin/env node

import { Command } from 'commander';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import chalk from 'chalk';
import JobApplicationProcessor from './JobApplicationProcessor.js';
import { formHandlerRegistry } from './forms/FormHandlerRegistry.js';
import logger from './utils/logger.js';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load package.json for version info
const pkg = require('../package.json');

// Create CLI program
const program = new Command();

program
  .name('formagent')
  .description('CLI for automating job applications')
  .version(pkg.version, '-v, --version', 'output the current version')
  .showHelpAfterError('(add --help for additional information)');

// Process command
program
  .command('process')
  .description('Process job applications from job_urls.txt')
  .option('-u, --urls <path>', 'path to job URLs file', './job_urls.txt')
  .option('-o, --output <dir>', 'output directory', './out')
  .option('-p, --profile <dir>', 'profile data directory', './in')
  .option('--headless', 'run browser in headless mode', true)
  .option('--no-headless', 'show browser window')
  .option('--debug', 'enable debug logging')
  .action(async (options) => {
    try {
      // Set log level
      if (options.debug) {
        logger.level = 'debug';
      }

      logger.info(chalk.blue.bold('\n=== FormAgent Job Processor ===\n'));
      logger.info(`Version: ${pkg.version}`);
      logger.info(`Node.js: ${process.version}\n`);

      // Create and configure the processor
      const processor = new JobApplicationProcessor({
        urlsFile: options.urls,
        outputDir: options.output,
        profileDir: options.profile,
        headless: options.headless
      });

      // Process job applications
      const results = await processor.processAll();
      
      // Display summary
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      console.log('\n' + chalk.bold('=== Processing Complete ==='));
      console.log(chalk.green(`✓ ${successCount} applications processed successfully`));
      if (failCount > 0) {
        console.log(chalk.red(`✗ ${failCount} applications failed`));
      }
      console.log(`\nResults saved to: ${path.resolve(options.output)}\n`);
      
      process.exit(0);
      
    } catch (error) {
      logger.error(chalk.red('\nFatal error:'), error.message);
      if (options.debug) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// List handlers command
program
  .command('list-handlers')
  .description('List all registered form handlers')
  .action(() => {
    const handlers = formHandlerRegistry.getHandlers();
    console.log(chalk.blue.bold('\n=== Registered Form Handlers ===\n'));
    
    if (handlers.size === 0) {
      console.log('No form handlers registered');
      return;
    }
    
    Array.from(handlers.entries()).forEach(([name, handler]) => {
      console.log(chalk.bold(name));
      if (handler.description) {
        console.log(`  ${handler.description}`);
      }
      console.log();
    });
  });

// Show version
program
  .command('version')
  .description('show version information')
  .action(() => {
    console.log(`FormAgent v${pkg.version}`);
    console.log(`Node.js ${process.version}`);
  });

// Parse command line arguments
async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default program;
