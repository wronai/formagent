import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { BrowserAutomation } from './browser/index.js';
import { formHandlerRegistry } from './forms/FormHandlerRegistry.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Processes job applications from a list of URLs
 */
class JobApplicationProcessor {
  /**
   * Create a new JobApplicationProcessor
   * @param {Object} options - Configuration options
   * @param {string} [options.urlsFile='./job_urls.txt'] - Path to the file containing job URLs
   * @param {string} [options.outputDir='./out'] - Base output directory
   * @param {string} [options.profileDir='./in'] - Directory containing profile data
   * @param {boolean} [options.headless=true] - Run browser in headless mode
   */
  constructor({
    urlsFile = './job_urls.txt',
    outputDir = './out',
    profileDir = './in',
    headless = true
  } = {}) {
    this.urlsFile = urlsFile;
    this.outputDir = outputDir;
    this.profileDir = profileDir;
    this.headless = headless;
    this.browser = null;
    this.profileData = {};
  }

  /**
   * Load profile data from the profile directory
   */
  async loadProfileData() {
    try {
      const profilePath = path.join(process.cwd(), this.profileDir);
      
      // Read all files in the profile directory
      const files = await fs.readdir(profilePath, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isFile()) {
          const filePath = path.join(profilePath, file.name);
          const ext = path.extname(file.name).toLowerCase();
          
          try {
            if (ext === '.json') {
              // Parse JSON files
              const content = await fs.readFile(filePath, 'utf8');
              this.profileData = { ...this.profileData, ...JSON.parse(content) };
            } else if (ext === '.md' || ext === '.txt') {
              // Read text files
              const content = await fs.readFile(filePath, 'utf8');
              const key = path.basename(file.name, ext);
              this.profileData[key] = content;
            }
          } catch (error) {
            logger.warn(`Error reading profile file ${file.name}: ${error.message}`);
          }
        }
      }
      
      logger.info(`Loaded profile data with ${Object.keys(this.profileData).length} keys`);
      return this.profileData;
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(`Profile directory not found: ${this.profileDir}`);
      } else {
        logger.error(`Error loading profile data: ${error.message}`);
      }
      return {};
    }
  }

  /**
   * Load job URLs from the URLs file
   * @returns {Promise<Array<{url: string, lineNumber: number}>>} Array of URLs with line numbers
   */
  async loadJobUrls() {
    try {
      const content = await fs.readFile(this.urlsFile, 'utf8');
      return content
        .split('\n')
        .map((line, index) => ({
          url: line.trim(),
          lineNumber: index + 1
        }))
        .filter(entry => {
          // Filter out empty lines and comments
          const trimmed = entry.url.trim();
          return trimmed && !trimmed.startsWith('#');
        });
    } catch (error) {
      logger.error(`Error loading job URLs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Initialize the browser
   */
  async initBrowser() {
    try {
      this.browser = new BrowserAutomation({
        headless: this.headless,
        downloadsDir: path.join(process.cwd(), this.outputDir, 'downloads')
      });
      
      await this.browser.initialize();
      logger.info('Browser initialized');
      return true;
    } catch (error) {
      logger.error(`Failed to initialize browser: ${error.message}`);
      return false;
    }
  }

  /**
   * Close the browser
   */
  async closeBrowser() {
    if (this.browser) {
      try {
        await this.browser.close();
        logger.info('Browser closed');
      } catch (error) {
        logger.error(`Error closing browser: ${error.message}`);
      } finally {
        this.browser = null;
      }
    }
  }

  /**
   * Process a single job application
   * @param {Object} job - Job details
   * @param {string} job.url - Job application URL
   * @param {number} job.lineNumber - Line number in the URLs file
   */
  async processJobApplication(job) {
    const { url, lineNumber } = job;
    
    logger.info(`\n=== Processing job application ${lineNumber}: ${url} ===`);
    
    try {
      // Find a matching form handler
      const HandlerClass = formHandlerRegistry.findMatchingHandler(url) || 
                         (await import('./forms/handlers/DefaultFormHandler.js')).default;
      
      if (!HandlerClass) {
        throw new Error('No suitable form handler found');
      }
      
      // Create output directory for this job
      const jobOutputDir = path.join(this.outputDir, String(lineNumber));
      await fs.mkdir(jobOutputDir, { recursive: true });
      
      // Initialize the handler
      const handler = new HandlerClass(this.browser, url, this.profileData, jobOutputDir);
      await handler.init();
      
      // Process the form
      const success = await handler.handle();
      
      if (success) {
        logger.info(`Successfully processed job application: ${url}`);
      } else {
        logger.warn(`Failed to process job application: ${url}`);
      }
      
      return success;
      
    } catch (error) {
      logger.error(`Error processing job application ${url}: ${error.message}`);
      return false;
    }
  }

  /**
   * Process all job applications
   */
  async processAll() {
    try {
      // Load profile data
      await this.loadProfileData();
      
      // Load job URLs
      const jobs = await this.loadJobUrls();
      
      if (jobs.length === 0) {
        logger.warn('No job URLs found to process');
        return [];
      }
      
      logger.info(`Found ${jobs.length} job applications to process`);
      
      // Initialize browser
      if (!(await this.initBrowser())) {
        throw new Error('Failed to initialize browser');
      }
      
      // Process each job
      const results = [];
      
      for (const job of jobs) {
        try {
          const success = await this.processJobApplication(job);
          results.push({
            ...job,
            success,
            timestamp: new Date().toISOString()
          });
          
          // Add a small delay between jobs
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          logger.error(`Unexpected error processing job ${job.url}: ${error.message}`);
          results.push({
            ...job,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      return results;
      
    } catch (error) {
      logger.error(`Fatal error: ${error.message}`);
      throw error;
      
    } finally {
      // Always close the browser
      await this.closeBrowser();
      
      // Save results summary
      await this.saveResultsSummary();
    }
  }

  /**
   * Save a summary of the processing results
   */
  async saveResultsSummary() {
    try {
      const summaryPath = path.join(this.outputDir, 'summary.json');
      const timestamp = new Date().toISOString();
      
      const summary = {
        timestamp,
        total: 0,
        success: 0,
        failed: 0,
        jobs: []
      };
      
      // Read all job result files
      const jobDirs = await fs.readdir(this.outputDir, { withFileTypes: true });
      
      for (const dir of jobDirs) {
        if (dir.isDirectory() && /^\d+$/.test(dir.name)) {
          const jobPath = path.join(this.outputDir, dir.name, 'data.json');
          
          try {
            const jobData = await fs.readFile(jobPath, 'utf8');
            const jobResult = JSON.parse(jobData);
            
            summary.jobs.push({
              id: dir.name,
              url: jobResult.url || '',
              success: jobResult.success || false,
              timestamp: jobResult.timestamp || timestamp
            });
            
            summary.total++;
            if (jobResult.success) {
              summary.success++;
            } else {
              summary.failed++;
            }
            
          } catch (error) {
            logger.warn(`Error reading job result for ${dir.name}: ${error.message}`);
          }
        }
      }
      
      // Save summary
      await fs.writeFile(
        summaryPath,
        JSON.stringify(summary, null, 2),
        'utf8'
      );
      
      logger.info(`Saved summary to ${summaryPath}`);
      return summary;
      
    } catch (error) {
      logger.error(`Error saving results summary: ${error.message}`);
      return null;
    }
  }
}

export default JobApplicationProcessor;
