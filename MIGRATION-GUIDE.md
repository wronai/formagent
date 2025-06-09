# Migration Guide: New Browser Automation Structure

This guide helps you migrate from the old `browserAutomation.js` to the new modular browser automation structure.

## What's New

The new structure splits browser automation into focused modules:

- `BrowserManager` - Core browser lifecycle management
- `PageNavigation` - Page navigation and URL handling
- `FormFiller` - Form interaction and submission
- `ElementInteractor` - Element interactions (clicks, hovers, etc.)
- `FileHandler` - File uploads and downloads
- `BrowserAutomation` - Unified facade for all browser interactions

## Migration Steps

### 1. Update Imports

**Before:**
```javascript
const { BrowserAutomation } = require('./src/browserAutomation');
```

**After:**
```javascript
const { BrowserAutomation } = require('./src/browser');
```

### 2. Update Initialization

**Before:**
```javascript
const browser = new BrowserAutomation();
await browser.initialize({ headless: false });
```

**After:**
```javascript
const browser = new BrowserAutomation({ headless: false });
await browser.initialize();
```

### 3. Common Migrations

#### Navigation

**Before:**
```javascript
await browser.page.goto('https://example.com');
```

**After:**
```javascript
await browser.navigation.goto('https://example.com');
```

#### Clicking Elements

**Before:**
```javascript
await browser.page.click('button.submit');
```

**After:**
```javascript
await browser.element.click('button.submit');
```

#### Filling Forms

**Before:**
```javascript
await browser.page.fill('input#username', 'user@example.com');
```

**After:**
```javascript
await browser.form.fill('input#username', 'user@example.com');
```

#### File Uploads

**Before:**
```javascript
const [fileChooser] = await Promise.all([
  browser.page.waitForFileChooser(),
  browser.page.click('input[type="file"]')
]);
await fileChooser.setFiles('path/to/file.txt');
```

**After:**
```javascript
await browser.file.uploadFile('input[type="file"]', 'path/to/file.txt');
```

### 4. Run the Migration Script

We've provided a migration script to help update your code:

```bash
node scripts/migrate-to-new-browser.js
```

**Note:** Always review the changes and test thoroughly after migration.

## New Features

### Taking Screenshots

```javascript
// Take a full page screenshot
await browser.file.takeScreenshot({
  path: 'screenshot.png',
  fullPage: true
});
```

### Handling Downloads

```javascript
// Wait for a file to be downloaded
const filePath = await browser.file.waitForDownload();
console.log(`File downloaded to: ${filePath}`);
```

### Advanced Form Handling

```javascript
// Select multiple options in a multi-select
await browser.form.select('select#languages', ['javascript', 'typescript']);

// Check a checkbox
await browser.form.setChecked('input#subscribe', true);
```

## Troubleshooting

### Common Issues

1. **Element not found**
   - Ensure selectors are correct
   - Add proper waits before interactions

2. **Navigation timeouts**
   - Increase timeout values if needed
   - Check for network issues

3. **File uploads failing**
   - Verify file paths are correct
   - Ensure the file input is visible and interactable

## Need Help?

If you encounter any issues during migration, please:
1. Check the [documentation](./README.md)
2. Review the example files
3. Open an issue on GitHub with details of the problem

Happy automating!
