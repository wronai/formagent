import { Configuration, OpenAIApi } from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAPPING_CACHE_FILE = path.join(process.cwd(), '.field-mappings.json');

class FieldMapper {
  constructor() {
    this.mappings = new Map();
    this.llm = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      // Load cached mappings
      await this.loadMappings();
      
      // Initialize LLM if API key is available
      if (process.env.OPENAI_API_KEY) {
        const configuration = new Configuration({
          apiKey: process.env.OPENAI_API_KEY,
        });
        this.llm = new OpenAIApi(configuration);
      } else {
        logger.warn('OPENAI_API_KEY not found. LLM-based field mapping will be disabled.');
      }
      
      this.initialized = true;
    } catch (error) {
      logger.error(`Failed to initialize FieldMapper: ${error.message}`);
      throw error;
    }
  }

  async loadMappings() {
    try {
      const data = await fs.readFile(MAPPING_CACHE_FILE, 'utf8');
      const parsed = JSON.parse(data);
      this.mappings = new Map(parsed);
      logger.info(`Loaded ${this.mappings.size} field mappings from cache`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Cache file doesn't exist yet, that's fine
        this.mappings = new Map();
      } else {
        throw error;
      }
    }
  }

  async saveMappings() {
    try {
      const data = JSON.stringify(Array.from(this.mappings.entries()), null, 2);
      await fs.writeFile(MAPPING_CACHE_FILE, data, 'utf8');
    } catch (error) {
      logger.error(`Failed to save field mappings: ${error.message}`);
    }
  }

  async getMapping(website, fieldName, fieldType, fieldLabel) {
    const cacheKey = this._generateCacheKey(website, fieldName, fieldType, fieldLabel);
    
    // Check if we have a cached mapping
    if (this.mappings.has(cacheKey)) {
      return this.mappings.get(cacheKey);
    }

    // If no LLM is available, return null
    if (!this.llm) {
      return null;
    }

    try {
      // Use LLM to determine the mapping
      const prompt = this._createMappingPrompt(website, fieldName, fieldType, fieldLabel);
      const response = await this.llm.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that maps form fields to standardized profile data fields.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      });

      const mapping = JSON.parse(response.data.choices[0].message.content.trim());
      
      // Cache the mapping
      this.mappings.set(cacheKey, mapping);
      await this.saveMappings();
      
      return mapping;
      
    } catch (error) {
      logger.error(`Failed to get field mapping: ${error.message}`);
      return null;
    }
  }

  _generateCacheKey(website, fieldName, fieldType, fieldLabel) {
    return `${website}|${fieldName}|${fieldType}|${fieldLabel}`;
  }

  _createMappingPrompt(website, fieldName, fieldType, fieldLabel) {
    return `Given the following form field details from ${website}, map it to a standardized profile data field.

Field Name: ${fieldName}
Field Type: ${fieldType}
Field Label: ${fieldLabel}

Available profile data categories:
- personal (name, email, phone, etc.)
- education (degrees, institutions, dates)
- experience (job titles, companies, dates, descriptions)
- skills (languages, technical skills, soft skills)
- documents (resume, cover letter, certificates)

Return a JSON object with the following structure:
{
  "fieldPath": "path.to.profile.field",
  "confidence": 0.9,
  "notes": "Any additional notes about this mapping"
}

If the field doesn't map to any standard profile field, return null.`;
  }
}

// Export a singleton instance
export const fieldMapper = new FieldMapper();

// Initialize on import
fieldMapper.init().catch(error => {
  logger.error(`Failed to initialize FieldMapper: ${error.message}`);
});
