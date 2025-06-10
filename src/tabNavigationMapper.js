import fs from 'fs';

export class TabNavigationMapper {
  constructor(page) {
    this.page = page;
    this.fieldMap = [];
    this.visitedIndexes = new Set();
  }

  async mapFormFields() {
    console.log('🔍 Starting form field mapping with Tab navigation...');
    
    // First, click on the body to ensure focus
    await this.page.click('body');
    
    // Get the initial active element
    let activeElement = await this.page.evaluateHandle(() => document.activeElement);
    
    // Keep track of the first element to detect when we've looped
    let firstElement = activeElement;
    let firstElementXPath = await this.getElementXPath(activeElement);
    
    // Maximum number of fields to prevent infinite loops
    const maxFields = 100;
    let fieldCount = 0;
    
    do {
      // Get current element details
      const elementInfo = await this.getElementInfo(activeElement);
      
      if (elementInfo) {
        const xpath = await this.getElementXPath(activeElement);
        
        // Only process if we haven't seen this element before
        if (!this.visitedIndexes.has(elementInfo.tabIndex)) {
          this.fieldMap.push({
            xpath,
            ...elementInfo
          });
          this.visitedIndexes.add(elementInfo.tabIndex);
          
          console.log(`📍 Mapped field: ${elementInfo.type} (${elementInfo.name || 'no name'})`);
        }
      }
      
      // Press Tab to move to the next focusable element
      await this.page.keyboard.press('Tab');
      
      // Get the new active element
      activeElement = await this.page.evaluateHandle(() => document.activeElement);
      const currentXPath = await this.getElementXPath(activeElement);
      
      // Check if we've looped back to the beginning
      if (currentXPath === firstElementXPath) {
        console.log('🔁 Reached the start of the form, mapping complete');
        break;
      }
      
      fieldCount++;
    } while (fieldCount < maxFields);
    
    // Save the field map for debugging
    fs.writeFileSync('form-field-map.json', JSON.stringify(this.fieldMap, null, 2));
    console.log(`✅ Mapped ${this.fieldMap.length} form fields`);
    
    return this.fieldMap;
  }
  
  async getElementXPath(elementHandle) {
    return await this.page.evaluate(el => {
      // Get the XPath for an element
      if (!el || !el.ownerDocument) return '';
      
      const getElementXPath = (element) => {
        if (!element) return '';
        if (element.id) return `//*[@id="${element.id}"]`;
        
        const sameTagSiblings = Array.from(
          element.parentNode ? element.parentNode.children : [],
          child => child.tagName
        ).filter(tagName => tagName === element.tagName);
        
        if (sameTagSiblings.length <= 1) {
          return `${getElementXPath(element.parentNode)}/${element.tagName.toLowerCase()}`;
        } else {
          const index = Array.from(element.parentNode.children)
            .filter(child => child.tagName === element.tagName)
            .indexOf(element) + 1;
          
          return `${getElementXPath(element.parentNode)}/${element.tagName.toLowerCase()}[${index}]`;
        }
      };
      
      return getElementXPath(el);
    }, elementHandle);
  }
  
  async getElementInfo(elementHandle) {
    return await this.page.evaluate(el => {
      if (!el || !el.getBoundingClientRect) return null;
      
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      
      // Skip hidden or non-visible elements
      if (style.display === 'none' || style.visibility === 'hidden' || 
          rect.width === 0 || rect.height === 0) {
        return null;
      }
      
      const tagName = el.tagName.toLowerCase();
      let type = 'text';
      
      if (tagName === 'input') {
        type = el.type || 'text';
      } else if (tagName === 'textarea') {
        type = 'textarea';
      } else if (tagName === 'select') {
        type = 'select';
      } else if (el.isContentEditable) {
        type = 'contenteditable';
      } else if (el.getAttribute('role') === 'textbox') {
        type = 'textbox';
      } else if (el.getAttribute('contenteditable') === 'true') {
        type = 'contenteditable';
      }
      
      // Get label text if available
      let labelText = '';
      if (el.id) {
        const label = document.querySelector(`label[for="${el.id}"]`);
        if (label) {
          labelText = label.textContent.trim();
        }
      }
      
      // Get placeholder text
      const placeholder = el.getAttribute('placeholder') || '';
      
      // Get aria-label
      const ariaLabel = el.getAttribute('aria-label') || '';
      
      // Get tab index
      const tabIndex = el.tabIndex;
      
      return {
        tagName,
        type,
        id: el.id || '',
        name: el.name || '',
        value: el.value || '',
        placeholder,
        labelText,
        ariaLabel,
        tabIndex,
        className: el.className || '',
        isRequired: el.required || false,
        isDisabled: el.disabled || false,
        isReadOnly: el.readOnly || false,
        position: {
          x: Math.round(rect.left + window.scrollX),
          y: Math.round(rect.top + window.scrollY)
        },
        size: {
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      };
    }, elementHandle);
  }
  
  async fillFieldByIndex(index, value) {
    if (index < 0 || index >= this.fieldMap.length) {
      throw new Error(`Invalid field index: ${index}`);
    }
    
    const field = this.fieldMap[index];
    console.log(`Filling field ${index} (${field.type}):`, field.name || field.placeholder || field.ariaLabel || 'unnamed');
    
    try {
      // Click the field to focus
      await this.page.mouse.click(
        field.position.x + 5, 
        field.position.y + 5
      );
      
      // Clear the field
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('A');
      await this.page.keyboard.up('Control');
      await this.page.keyboard.press('Backspace');
      
      // Type the value
      await this.page.keyboard.type(value, { delay: 30 });
      
      return true;
    } catch (error) {
      console.error(`Error filling field ${index}:`, error);
      return false;
    }
  }
  
  async fillFields(fieldValues) {
    const results = [];
    
    for (let i = 0; i < this.fieldMap.length; i++) {
      const field = this.fieldMap[i];
      const fieldName = field.name || field.ariaLabel || field.placeholder || `field_${i}`;
      
      // Skip if we don't have a value for this field
      if (!(fieldName in fieldValues)) {
        continue;
      }
      
      const value = fieldValues[fieldName];
      const success = await this.fillFieldByIndex(i, value);
      
      results.push({
        index: i,
        field: fieldName,
        success,
        type: field.type
      });
      
      // Small delay between fields
      await this.page.waitForTimeout(200);
    }
    
    return results;
  }
}

export default TabNavigationMapper;
