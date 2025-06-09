# Job Application Processor

An automated job application processor that can fill out online job application forms using your profile data.

## Features

- Automated form filling for job applications
- Support for various form fields (text, select, checkbox, file uploads)
- Profile management with support for multiple data sources
- Screenshot capture before and after form submission
- Extensible architecture for custom form handlers
- Command-line interface for easy use

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn
- Playwright browsers (will be installed automatically)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/formagent.git
   cd formagent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

## Usage

### 1. Prepare Your Profile Data

Create a profile directory structure:

```
in/
├── documents/
│   ├── resume.pdf
│   └── cover_letter.pdf
├── images/
│   └── photo.jpg
└── profile/
    └── personal.json
```

### 2. Create a Job URLs File

Create a file named `job_urls.txt` in the project root with one URL per line:

```
# Example job URLs
https://example.com/jobs/123
https://example.com/careers/456
```

### 3. Run the Job Processor

```bash
# Process all job applications
npm run run-jobs

# Or run with custom options
npx formagent process --urls ./my-jobs.txt --output ./results --profile ./my-profile
```

### 4. View Results

Results will be saved in the `out` directory (or your specified output directory) with the following structure:

```
out/
├── 1/
│   ├── 01_initial.png
│   ├── 02_filled.png
│   ├── 03_before_submit.png
│   ├── 04_after_submit.png
│   ├── data.json
│   └── data.md
├── 2/
│   └── ...
└── summary.json
```

## Configuration

### Command Line Options

```
Usage: formagent process [options]

Process job applications from job_urls.txt

Options:
  -u, --urls <path>     path to job URLs file (default: "./job_urls.txt")
  -o, --output <dir>     output directory (default: "./out")
  -p, --profile <dir>    profile data directory (default: "./in")
  --headless             run browser in headless mode (default: true)
  --no-headless          show browser window
  --debug                enable debug logging
  -h, --help             display help for command
```

### Environment Variables

You can also configure the processor using environment variables:

- `JOB_URLS_FILE`: Path to job URLs file
- `OUTPUT_DIR`: Output directory for results
- `PROFILE_DIR`: Directory containing profile data
- `HEADLESS`: Set to 'false' to show browser window
- `DEBUG`: Set to 'true' to enable debug logging

## Creating Custom Form Handlers

For websites with complex forms, you can create custom form handlers:

1. Create a new file in `src/forms/handlers/` (e.g., `ExampleHandler.js`)
2. Extend the `BaseFormHandler` class
3. Implement the `matches` static method and the `handle` method
4. The handler will be automatically registered

Example handler:

```javascript
import BaseFormHandler from '../BaseFormHandler.js';

export default class ExampleHandler extends BaseFormHandler {
  static matches(url) {
    return url.includes('example.com');
  }

  async handle() {
    // Custom form handling logic
    await this.takeScreenshot('01_initial');
    
    // Fill form fields
    await this.fillFormFields({
      'input[name="name"]': { field: 'personal.fullName' },
      'input[name="email"]': { field: 'contact.email' },
      // ...
    });
    
    await this.takeScreenshot('02_filled');
    
    // Submit the form
    await this.browser.element.click('button[type="submit"]');
    
    return true;
  }
}
```

## Best Practices

1. **Test with a small number of applications first** to ensure everything works as expected.
2. **Review the screenshots** to verify that forms are being filled correctly.
3. **Use custom handlers** for websites with complex forms or special requirements.
4. **Keep your profile data up to date** to ensure accurate information is used.
5. **Monitor the output** for any errors or warnings.

## Troubleshooting

### Common Issues

1. **Forms not being detected**
   - Check if the form is loaded dynamically with JavaScript
   - Add a delay before interacting with the form
   - Create a custom handler for the specific website

2. **File uploads not working**
   - Ensure file paths are correct and files exist
   - Check if the file input is visible and enabled
   - Some websites may require clicking a button to open the file dialog first

3. **CAPTCHA or bot detection**
   - Some websites may block automated form submissions
   - You may need to complete these steps manually

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Playwright](https://playwright.dev/) for reliable browser automation
- Inspired by various job application automation tools

---

Happy job hunting! 🚀
