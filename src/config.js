require('dotenv').config();

const config = {
  // Ollama Configuration
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3',
    temperature: parseFloat(process.env.OLLAMA_TEMPERATURE) || 0.7,
  },
  
  // Form Configuration
  form: {
    defaultSpec: process.env.DEFAULT_FORM_SPEC || './specs/form_acme.md',
    outputDir: process.env.DEFAULT_OUTPUT_DIR || './output',
  },
  
  // Browser Configuration
  browser: {
    headless: process.env.HEADLESS !== 'false',
    slowMo: parseInt(process.env.SLOW_MO) || 100,
    timeout: parseInt(process.env.TIMEOUT) || 30000,
  },
  
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
  },
  
  // Email Configuration (for future use)
  email: {
    enabled: process.env.SMTP_HOST && process.env.SMTP_PORT,
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.EMAIL_FROM || 'formagent@example.com',
  },
};

// Validate required configurations
const requiredVars = [];
requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    console.warn(`Warning: Missing required environment variable: ${varName}`);
  }
});

module.exports = config;
