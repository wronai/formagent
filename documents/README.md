# Documents Directory

This directory should contain your job application documents:

1. **CV/Resume** - Your professional CV in PDF format
   - Default expected file: `cv.pdf`
   - Update the `CV_PATH` in `.env` if using a different filename

2. **Cover Letter** - Your cover letter in PDF format
   - Default expected file: `cover_letter.pdf`
   - Update the `COVER_LETTER_PATH` in `.env` if using a different filename

## File Naming Convention

For best results, use simple filenames without spaces or special characters:

- Good: `cv_john_doe.pdf`
- Good: `cover_letter_john_doe.pdf`
- Avoid: `My CV (2024).pdf` (contains spaces and special characters)

## File Format

- PDF format is recommended for consistent formatting across different systems
- Ensure the files are not password protected
- Keep file sizes reasonable (under 5MB recommended)

## Adding Your Documents

1. Place your CV and cover letter in this directory
2. Update the file paths in your `.env` file if needed
3. The application will automatically use these files when submitting job applications
