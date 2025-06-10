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
    console.log(`\n🌐 [${new Date().toISOString()}] Starting processing URL ${index}: ${url}`);
    
    const browser = await chromium.launch({ 
      headless: config.browser.headless,
      args: [
        '--window-size=1200,2000',
        '--disable-dev-shm-usage',
        '--no-sandbox'
      ]
    });
    
    const context = await browser.newContext({
      viewport: {
        width: 1200,
        height: 2000,
        deviceScaleFactor: 1,
      },
      recordVideo: {
        dir: 'videos/',
        size: { width: 1200, height: 2000 }
      },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    try {
      // Create output directory
      const outputDir = path.join('out', String(index).padStart(3, '0'));
      await fs.mkdir(outputDir, { recursive: true });

      // Enable request/response logging
      await this.enableNetworkLogging(page, outputDir);
      
      // Set timeouts
      page.setDefaultTimeout(30000);
      page.setDefaultNavigationTimeout(60000);
      
      // Navigate to the URL
      console.log(`🔄 Navigating to: ${url}`);
      const response = await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      if (!response || !response.ok()) {
        throw new Error(`Failed to load page: ${response ? response.status() : 'No response'}`);
      }
      
      // Save initial page state
      await this.savePageState(page, outputDir, 'initial');
      
      // Get domain to determine strategy
      const domain = new URL(url).hostname;
      const StrategyClass = this.getStrategy(domain);
      
      if (!StrategyClass) {
        throw new Error(`No strategy registered for domain: ${domain}`);
      }
      
      // Initialize strategy
      console.log(`🔧 Initializing strategy for domain: ${domain}`);
      const strategy = new StrategyClass(page, this.dataLoader);
      await strategy.init();
      
      // Take a snapshot before form filling
      await strategy.takeHtmlSnapshot(page, 'before_fill');
      
      // Fill the form
      console.log('🖊️  Filling form...');
      const formData = await strategy.fill();
      
      // Save results
      await this.savePageState(page, outputDir, 'filled');
      
      // Save form data
      await fs.writeFile(
        path.join(outputDir, 'form_data.json'),
        JSON.stringify(formData, null, 2),
        'utf-8'
      );
      
      // Save execution logs
      await strategy.saveLogs(outputDir);
      
      // Verify form submission
      if (formData.success === false) {
        console.warn(`⚠️  Form submission may have failed for: ${url}`);
      } else {
        console.log(`✅ Successfully processed: ${url}`);
      }
      
      return formData.success !== false;
      
    } catch (error) {
      console.error(`❌ Error processing ${url}:`, error);
      
      // Save detailed error information
      const errorDir = path.join('out', 'errors', String(index).padStart(3, '0'));
      await fs.mkdir(errorDir, { recursive: true });
      
      // Save error details
      const errorInfo = {
        url,
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        pageUrl: page.url(),
        pageTitle: await page.title().catch(() => 'N/A')
      };
      
      await fs.writeFile(
        path.join(errorDir, 'error.json'),
        JSON.stringify(errorInfo, null, 2),
        'utf-8'
      );
      
      // Save screenshot of the error page
      try {
        await page.screenshot({ 
          path: path.join(errorDir, 'error.png'),
          fullPage: true 
        });
        
        // Save page HTML
        const html = await page.content();
        await fs.writeFile(
          path.join(errorDir, 'page.html'),
          html,
          'utf-8'
        );
      } catch (e) {
        console.error('Failed to capture error details:', e);
      }
      
      return false;
      
    } finally {
      try {
        // Close browser and save video if available
        await context.close();
        await browser.close();
      } catch (e) {
        console.error('Error during cleanup:', e);
      }
    }
  }

  async savePageState(page, outputDir, prefix) {
    try {
      // Take screenshot
      await page.screenshot({ 
        path: path.join(outputDir, `${prefix}.png`), 
        fullPage: true 
      });
      
      // Save page HTML
      const html = await page.content();
      await fs.writeFile(
        path.join(outputDir, `${prefix}.html`),
        html,
        'utf-8'
      );
      
      // Save page text
      const text = await page.evaluate(() => document.body.innerText);
      await fs.writeFile(
        path.join(outputDir, `${prefix}.txt`),
        text,
        'utf-8'
      );
    } catch (e) {
      console.error(`Error saving page state (${prefix}):`, e);
    }
  }
  
  async enableNetworkLogging(page, outputDir) {
    const networkLogs = [];
    
    // Log all requests
    page.on('request', request => {
      const logEntry = {
        type: 'request',
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString(),
        resourceType: request.resourceType()
      };
      networkLogs.push(logEntry);
      console.log(`🔹 ${request.method()} ${request.url()}`);
    });
    
    // Log all responses
    page.on('response', async response => {
      try {
        const status = response.status();
        if (status >= 400) {
          const logEntry = {
            type: 'error_response',
            url: response.url(),
            status,
            statusText: response.statusText(),
            timestamp: new Date().toISOString()
          };
          networkLogs.push(logEntry);
          console.error(`❌ ${status} ${response.statusText()} - ${response.url()}`);
        }
      } catch (e) {
        // Ignore errors in logging
      }
    });
    
    // Log console messages
    page.on('console', msg => {
      const type = msg.type();
      if (['error', 'warning'].includes(type)) {
        const logEntry = {
          type: 'console',
          level: type,
          text: msg.text(),
          url: msg.location().url,
          timestamp: new Date().toISOString()
        };
        networkLogs.push(logEntry);
        console.log(`[${type.toUpperCase()}] ${msg.text()}`);
      }
    });
    
    // Save network logs when page closes
    page.on('close', async () => {
      try {
        await fs.writeFile(
          path.join(outputDir, 'network_logs.json'),
          JSON.stringify(networkLogs, null, 2),
          'utf-8'
        );
      } catch (e) {
        console.error('Failed to save network logs:', e);
      }
    });
  }

  getStrategy(domain) {
    console.log(`🔍 Finding strategy for domain: ${domain}`);
    
    // Try exact matches first
    if (this.strategies.has(domain)) {
      const strategy = this.strategies.get(domain);
      console.log(`✅ Found exact match strategy: ${strategy.name}`);
      return strategy;
    }
    
    // Then try partial matches
    for (const [key, StrategyClass] of this.strategies.entries()) {
      if (domain.includes(key)) {
        console.log(`🔍 Found partial match: ${key} in ${domain}`);
        return StrategyClass;
      }
    }
    
    // Try with subdomains removed
    const domainParts = domain.split('.');
    if (domainParts.length > 2) {
      const baseDomain = domainParts.slice(-2).join('.');
      if (this.strategies.has(baseDomain)) {
        console.log(`🌐 Using base domain strategy: ${baseDomain}`);
        return this.strategies.get(baseDomain);
      }
    }
    
    console.warn(`⚠️  No strategy found for domain: ${domain}`);
    return null;
  }
}

export default FormFillerManager;
