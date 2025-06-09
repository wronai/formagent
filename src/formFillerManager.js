import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import DataLoader from './loaders/dataLoader.js';
import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FormFillerManager {
  constructor() {
    this.strategies = new Map();
    this.dataLoader = new DataLoader();
  }

  registerStrategy(domain, strategyClass) {
    this.strategies.set(domain, strategyClass);
  }

  async processJobUrls(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const urls = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\nProcessing URL ${i + 1}/${urls.length}: ${url}`);
      await this.processUrl(url, i + 1);
    }
  }

  async processUrl(url, index) {
    const browser = await chromium.launch({ headless: config.browser.headless });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // Create output directory
      const outputDir = path.join('out', String(index).padStart(3, '0'));
      await fs.mkdir(outputDir, { recursive: true });

      // Navigate to the URL
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Take initial screenshot
      await page.screenshot({ path: path.join(outputDir, 'initial.png'), fullPage: true });
      
      // Get domain to determine strategy
      const domain = new URL(url).hostname;
      const StrategyClass = this.getStrategy(domain);
      
      if (!StrategyClass) {
        throw new Error(`No strategy registered for domain: ${domain}`);
      }
      
      // Initialize and execute strategy
      const strategy = new StrategyClass(page, this.dataLoader);
      await strategy.init();
      const formData = await strategy.fill();
      
      // Save results
      await strategy.takeScreenshot(path.join(outputDir, 'filled.png'));
      await strategy.saveFormData(formData, path.join(outputDir, 'data'));
      await strategy.saveMarkdown(formData, path.join(outputDir, 'data'));
      
      console.log(`Successfully processed: ${url}`);
    } catch (error) {
      console.error(`Error processing ${url}:`, error);
      // Save error information
      const errorDir = path.join('out', 'errors', String(index).padStart(3, '0'));
      await fs.mkdir(errorDir, { recursive: true });
      await fs.writeFile(
        path.join(errorDir, 'error.txt'),
        `Error processing ${url}:\n${error.stack}`,
        'utf-8'
      );
    } finally {
      await browser.close();
    }
  }

  getStrategy(domain) {
    for (const [key, StrategyClass] of this.strategies.entries()) {
      if (domain.includes(key)) {
        return StrategyClass;
      }
    }
    return null;
  }
}

export default FormFillerManager;
