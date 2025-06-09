.PHONY: install test clean run format lint

# Variables
PACKAGE_MANAGER = npm
PYTHON = python3
PIP = pip3

# Install dependencies
install:
	$(PACKAGE_MANAGER) install
	$(PIP) install -r requirements.txt

# Run tests
test:
	npm test

# Clean project
clean:
	rm -rf node_modules/
	rm -rf output/*
	find . -type f -name '*.log' -delete

# Run the application
run:
	node server.js

# Format code
format:
	npx prettier --write "**/*.{js,json,md}"

# Lint code
lint:
	npx eslint .

# Setup development environment
setup: install
	cp .env.example .env
	echo "Please edit .env file with your configuration"

# Run with development settings
dev:
	nodemon server.js

# Install production dependencies
prod-install:
	npm ci --only=production
