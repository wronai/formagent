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
        try {
          if (!element) return '';
          if (element.id) return `//*[@id="${element.id}"]`;
          if (!element.tagName) return '';
          
          const tagName = element.tagName.toLowerCase();
          
          // Handle SVG and other special elements
          if (tagName === 'body') return '/html/body';
          if (tagName === 'html') return '/html';
          
          const parent = element.parentNode;
          if (!parent) return '';
          
          // Get all siblings with the same tag name
          const siblings = Array.from(parent.children || [])
            .filter(child => child.tagName && child.tagName.toLowerCase() === tagName);
          
          // If there's only one element with this tag, we don't need an index
          if (siblings.length <= 1) {
            const parentXPath = getElementXPath(parent);
            return parentXPath ? `${parentXPath}/${tagName}` : `//${tagName}`;
          } else {
            // Find the index of the current element among its siblings with the same tag
            const index = siblings.indexOf(element) + 1;
            const parentXPath = getElementXPath(parent);
            return parentXPath ? `${parentXPath}/${tagName}[${index}]` : `//${tagName}[${index}]`;
          }
        } catch (error) {
          console.error('Error generating XPath:', error);
          return '';
        }
      };
      
      return getElementXPath(el);
    }, elementHandle);
  }
  
  async getElementInfo(elementHandle) {
    return await this.page.evaluate(el => {
      try {
        if (!el || !el.getBoundingClientRect) return null;
        
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        
        // Check if element is visible
        const isVisible = style.display !== 'none' && 
                         style.visibility !== 'hidden' &&
                         rect.width > 0 && 
                         rect.height > 0 &&
                         style.opacity !== '0' &&
                         style.pointerEvents !== 'none';
        
        if (!isVisible) return null;
        
        // Get element type
        const tagName = el.tagName ? el.tagName.toLowerCase() : '';
        let type = 'text';
        
        if (tagName === 'input') {
          type = el.type || 'text';
          // Special handling for different input types
          if (['checkbox', 'radio', 'submit', 'button', 'image', 'file', 'hidden', 'reset'].includes(type)) {
            return null; // Skip these input types
          }
        } else if (tagName === 'textarea') {
          type = 'textarea';
        } else if (tagName === 'select') {
          type = 'select';
        } else if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
          type = 'contenteditable';
        } else if (el.getAttribute('role') === 'textbox' || 
                  el.getAttribute('role') === 'searchbox' ||
                  el.getAttribute('role') === 'combobox') {
          type = 'textbox';
        } else if (tagName === 'a' && el.href) {
          type = 'link';
        } else if (tagName === 'button' || 
                  el.getAttribute('role') === 'button' ||
                  el.getAttribute('type') === 'button') {
          type = 'button';
        } else {
          // Skip elements that aren't interactive
          if (!el.tabIndex || el.tabIndex < 0) return null;
        }
        
        // Get label text from associated label, aria-label, or aria-labelledby
        let labelText = '';
        if (el.id) {
          const label = document.querySelector(`label[for="${el.id}"]`);
          if (label) {
            labelText = label.textContent.trim();
          }
        }
        
        // If no label found, try to find a parent label
        if (!labelText) {
          const parentLabel = el.closest('label');
          if (parentLabel) {
            labelText = parentLabel.textContent.trim();
          }
        }
        
        // Get aria attributes
        const ariaLabel = el.getAttribute('aria-label') || '';
        const ariaLabelledBy = el.getAttribute('aria-labelledby') || '';
        let ariaLabelledByText = '';
        
        if (ariaLabelledBy) {
          const labelledByElement = document.getElementById(ariaLabelledBy);
          if (labelledByElement) {
            ariaLabelledByText = labelledByElement.textContent.trim();
          }
        }
        
        // Get placeholder text
        const placeholder = el.getAttribute('placeholder') || '';
        
        // Get value, handling different element types
        let value = '';
        if ('value' in el) {
          value = el.value || '';
        } else if ('textContent' in el) {
          value = el.textContent.trim();
        }
        
        // Get tab index, defaulting to 0 for focusable elements
        let tabIndex = el.tabIndex;
        if (tabIndex === -1 && (
            tagName === 'a' ||
            tagName === 'button' ||
            tagName === 'input' ||
            tagName === 'select' ||
            tagName === 'textarea' ||
            el.isContentEditable ||
            ['button', 'link', 'checkbox', 'radio', 'textbox', 'searchbox', 'combobox'].includes(el.getAttribute('role') || '')
        )) {
          tabIndex = 0;
        }
        
        // Get all attributes for debugging
        const attributes = {};
        if (el.attributes) {
          Array.from(el.attributes).forEach(attr => {
            attributes[attr.name] = attr.value;
          });
        }
        
        // Get computed styles for debugging
        const computedStyles = {};
        const styleProps = ['display', 'visibility', 'opacity', 'pointer-events', 'position', 'z-index'];
        styleProps.forEach(prop => {
          computedStyles[prop] = style[prop] || style.getPropertyValue(prop);
        });
        
        return {
          tagName,
          type,
          id: el.id || '',
          name: el.name || '',
          value: value,
          placeholder,
          labelText: labelText || ariaLabel || ariaLabelledByText || '',
          ariaLabel,
          ariaLabelledBy,
          ariaLabelledByText,
          tabIndex,
          className: el.className || '',
          isRequired: el.required || el.getAttribute('aria-required') === 'true' || false,
          isDisabled: el.disabled || el.getAttribute('aria-disabled') === 'true' || false,
          isReadOnly: el.readOnly || el.getAttribute('aria-readonly') === 'true' || false,
          position: {
            x: Math.round(rect.left + window.scrollX),
            y: Math.round(rect.top + window.scrollY),
            viewportX: Math.round(rect.left),
            viewportY: Math.round(rect.top)
          },
          size: {
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          computedStyles,
          attributes,
          isVisible: isVisible,
          isInViewport: (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
          )
        };
      } catch (error) {
        console.error('Error getting element info:', error);
        return null;
      }
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
