import express from 'express';
import fileUpload from 'express-fileupload';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { autoFillForm } from './src/autoFillForm.js';
import markdownParser from './src/markdownParser.js';
import validator from './src/validator.js';

const { parseMarkdownSpec } = markdownParser;
const { validateSpec } = validator;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(fileUpload());

app.post('/fill-form', async (req, res) => {
  try {
    const mdSpec = req.body.spec;
    if (!mdSpec) {
      throw new Error('Brak specyfikacji formularza');
    }

    // First validate the original spec
    validateSpec(mdSpec);

    // Then process variables if provided
    let processedSpec = mdSpec;
    if (req.body.data) {
      const data = JSON.parse(req.body.data);
      Object.entries(data).forEach(([key, value]) => {
        processedSpec = processedSpec.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
      });
    }

    const formSpec = parseMarkdownSpec(processedSpec);

    if (req.files && req.files.cv) {
      const uploadPath = `/tmp/${req.files.cv.name}`;
      await req.files.cv.mv(uploadPath);
      formSpec.files = uploadPath;
    }

    const result = await autoFillForm(formSpec);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Simple form submission test endpoint
app.post('/test-form', (req, res) => {
  try {
    const { spec } = req.body;
    if (!spec) {
      return res.status(400).json({ error: 'No spec provided' });
    }
    
    // Just return the parsed spec for testing
    res.json({
      status: 'success',
      spec: spec,
      receivedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test form error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Form Agent running on http://localhost:3000'));