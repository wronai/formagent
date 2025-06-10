import { chromium } from 'playwright';
// Use mock client for testing
// import ollama from './ollamaClient.js';
import ollama from './ollamaClient.mock.js';

async function autoFillForm(formSpec) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(formSpec.url);
  const htmlContent = await page.content();

  const prompt = `Analyze this form structure:\n${htmlContent}\n\nBased on markdown specs:\n${formSpec.markdown}`;

  const fieldMapping = await ollama.generate({
    model: 'mistral:7b',
    prompt,
    format: 'json'
  });

  for (const [selector, value] of Object.entries(fieldMapping)) {
    try {
      await page.fill(selector, value);
    } catch (err) {
      console.warn(`Cannot fill ${selector}: ${err.message}`);
    }
  }

  if (formSpec.files) {
    await page.setInputFiles('input[type="file"]', formSpec.files);
  }

  await page.screenshot({ path: '/tmp/form_progress.png' });
  await browser.close();

  return { status: 'completed', screenshot: '/tmp/form_progress.png' };
}

export { autoFillForm };