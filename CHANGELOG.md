# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2025-06-10

### Added
- New modular browser automation architecture
- `BrowserManager` class for core browser lifecycle management
- `PageNavigation` class for URL and page management
- `FormFiller` class for form interactions
- `ElementInteractor` class for element interactions
- `FileHandler` class for file uploads/downloads
- Migration script and guide for updating from v1.x to v2.0.0
- Comprehensive JSDoc documentation
- New test examples for the updated API

### Changed
- **BREAKING**: Completely refactored browser automation code
- **BREAKING**: Updated API for all browser interactions
- Improved error handling and logging
- Better separation of concerns
- Updated dependencies to latest versions

### Removed
- Old `browserAutomation.js` (replaced by new modular structure)

### Migration Guide

See [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) for detailed instructions on upgrading from v1.x to v2.0.0.

## [1.0.0] - 2025-06-09

### Added
- Initial release of FormAgent
- Basic form filling capabilities
- Task runner for job applications
- Support for YAML-based task definitions
- Basic browser automation with Playwright
