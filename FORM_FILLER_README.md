# Form Filler Automation

This tool automates the process of filling out job application forms using Playwright and a modular strategy pattern.

## Directory Structure

```
.
├── in/                     # Input data directory
│   ├── personal/           # Personal information
│   ├── education/          # Education history
│   ├── experience/         # Work experience
│   ├── skills/             # Skills and qualifications
│   └── documents/          # CV, cover letters, etc.
├── out/                    # Output directory
│   ├── 001/                # Output for first job application
│   │   ├── initial.png     # Screenshot before filling
│   │   ├── filled.png      # Screenshot after filling
│   │   ├── data.json       # Form data in JSON format
│   │   └── data.md         # Form data in Markdown format
│   └── ...
├── src/
│   ├── loaders/           # Data loading logic
│   ├── strategies/         # Form filling strategies
│   └── formFillerManager.js # Main manager class
└── job_urls.txt            # List of job application URLs
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create input data directories:
   ```bash
   mkdir -p in/{personal,education,experience,skills,documents}
   ```

3. Add your personal information in the appropriate files under the `in/` directory.

## Usage

1. Add job URLs to `job_urls.txt` (one per line)

2. Run the form filler:
   ```bash
   node runFormFiller.js
   ```

## Adding New Form Types

1. Create a new strategy class in `src/strategies/` that extends `BaseFormFiller`
2. Implement the `fill()` method with the specific form logic
3. Register the strategy in `runFormFiller.js` for the appropriate domain

## Configuration

Edit `.env` to configure:
- Browser settings
- Timeouts
- Output directories
- LLM settings (if using AI for field mapping)

## Notes

- The tool creates screenshots before and after form filling
- All form data is saved for reference
- Error handling and retries are built-in
- The solution is designed to be extensible for different job boards
