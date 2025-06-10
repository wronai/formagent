import fs from 'fs';
import fetch from 'node-fetch';


export class AIFormFiller {
  constructor(apiEndpoint = 'http://localhost:11434/api/generate') {
    this.apiEndpoint = apiEndpoint;
  }

  async analyzeForm(page, fieldName, fieldType = 'text') {
    console.log(`🤖 Using Mistral 7B to analyze form field: ${fieldName}`);
    
    // Get the page content and structure
    const pageContent = await page.content();
    const formElements = await this.extractFormElements(page);
    
    // Prepare the prompt for Mistral
    const prompt = this.createMistralPrompt(fieldName, fieldType, formElements, pageContent);
    
    try {
      // Call the local Mistral 7B instance
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral',
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.1,
            max_tokens: 500
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Mistral API error: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Parse the AI response
      const aiResponse = JSON.parse(result.response);
      console.log('Mistral analysis result:', aiResponse);
      
      // Try to find and interact with the field based on AI's suggestions
      if (aiResponse.strategy === 'selector') {
        return await this.interactWithField(page, aiResponse.selector, aiResponse.action, aiResponse.value);
      } else if (aiResponse.strategy === 'coordinate_click') {
        await page.mouse.click(aiResponse.x, aiResponse.y);
        if (aiResponse.value) {
          await page.keyboard.type(aiResponse.value);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Mistral form analysis failed:', error);
      return false;
    }
  }
  
  createMistralPrompt(fieldName, fieldType, formElements, pageContent) {
    return `You are an expert web form analyzer. Your task is to find the best way to interact with a "${fieldName}" field (type: ${fieldType}).

Form elements found on the page (${formElements.length} elements):
${JSON.stringify(formElements.slice(0, 20), null, 2)}...

Page content (truncated):
${pageContent.substring(0, 2000)}...

Analyze the form and determine the best way to interact with the "${fieldName}" field. Consider:
1. The field's purpose (e.g., email, name, phone)
2. The field's position in the form
3. The field's labels and nearby text
4. The field's attributes (id, name, class, etc.)

Respond with a JSON object containing:
{
  "strategy": "selector" | "coordinate_click",
  "selector": "CSS selector for the field (if strategy is 'selector')",
  "x": number, // X coordinate (if strategy is 'coordinate_click')
  "y": number, // Y coordinate (if strategy is 'coordinate_click')
  "action": "type" | "click" | "select",
  "value": "value to enter (if applicable)",
  "confidence": 0-1, // Your confidence in this solution
  "reasoning": "Explanation of why you chose this approach"
}`;
  }

  async extractFormElements(page) {
    return await page.evaluate(() => {
      const elements = [];
      const formInputs = Array.from(document.querySelectorAll('input, textarea, select, [role="textbox"], [contenteditable]'));
      
      formInputs.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(el);
        
        // Skip hidden elements
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || rect.width === 0 || rect.height === 0) {
          return;
        }
        
        elements.push({
          index,
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          name: el.name || null,
          type: el.type || 'text',
          placeholder: el.placeholder || '',
          value: el.value || '',
          className: el.className || '',
          labels: Array.from(document.querySelectorAll(`label[for="${el.id}"]`)).map(l => l.textContent.trim()),
          parentText: el.closest('label, div, form')?.textContent.trim() || '',
          position: { x: Math.round(rect.x), y: Math.round(rect.y) },
          size: { width: Math.round(rect.width), height: Math.round(rect.height) },
          isVisible: rect.width > 0 && rect.height > 0,
          isEnabled: !el.disabled,
          isReadOnly: el.readOnly,
          attributes: Array.from(el.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {})
        });
      });
      
      return elements;
    });
  }

  createAnalysisPrompt(fieldName, fieldType, formElements, pageContent) {
    return `Analyze the following form and find the best way to interact with a "${fieldName}" field (type: ${fieldType}).
    
Form elements found on the page (${formElements.length} elements):
${JSON.stringify(formElements, null, 2)}

Page content (truncated):
${pageContent.substring(0, 5000)}...

Your task is to determine the best way to interact with this field. Consider:
1. The field's purpose (e.g., email, name, phone)
2. The field's position in the form
3. The field's labels and nearby text
4. The field's attributes (id, name, class, etc.)

Respond with a JSON object containing:
{
  "strategy": "selector" | "coordinate_click",
  "selector": "CSS selector for the field (if strategy is 'selector')",
  "x": number, // X coordinate (if strategy is 'coordinate_click')
  "y": number, // Y coordinate (if strategy is 'coordinate_click')
  "action": "type" | "click" | "select",
  "value": "value to enter (if applicable)",
  "confidence": 0-1, // Your confidence in this solution
  "reasoning": "Explanation of why you chose this approach"
}`;
  }

  async interactWithField(page, selector, action, value) {
    try {
      const element = await page.$(selector);
      if (!element) return false;
      
      await element.scrollIntoViewIfNeeded();
      
      switch (action) {
        case 'type':
          await element.click({ clickCount: 3 });
          await page.keyboard.press('Backspace');
          await element.type(value, { delay: 50 });
          break;
        case 'click':
          await element.click();
          break;
        case 'select':
          await element.selectOption(value);
          break;
        default:
          return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to interact with field using selector ${selector}:`, error);
      return false;
    }
  }
}

export default AIFormFiller;
