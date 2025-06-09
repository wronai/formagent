.PHONY: help install test clean run format lint setup dev prod-install docker-build docker-run docker-stop docs check-env check-ollama

# Variables
PACKAGE_MANAGER = npm
PYTHON = python3
PIP = pip3
DOCKER_COMPOSE = docker-compose
DOCKER = docker
NPM = npm
NODE = node
PORT ?= 3000
OLLAMA_HOST ?= localhost:11434

# Help target
help: ## Display this help message
	@echo "Available targets:"
	@fgrep -h "##" $(MAKEFILE_LIST) | fgrep -v fgrep | sed -e 's/\$$//' | sed -e 's/##//' | column -t -s ':'

# Install dependencies
install: ## Install all dependencies
	$(PACKAGE_MANAGER) install
	$(PIP) install -r requirements.txt

# Run tests
test: ## Run all tests
	$(NPM) test

# Run specific test file
test-file: ## Run specific test file (make test-file TEST=test/file.test.js)
	NODE_ENV=test $(NODE) --test $(TEST)

# Clean project
clean: ## Clean project files
	rm -rf node_modules/
	rm -rf output/*
	rm -f *.log
	find . -type f -name '*.log' -delete
	find . -type d -name 'coverage' -exec rm -rf {} +

# Run the application
run: check-env ## Run the application
	NODE_ENV=development $(NODE) server.js

# Format code
format: ## Format code using prettier
	npx prettier --write "**/*.{js,json,md,html}"

# Lint code
lint: ## Lint code using eslint
	npx eslint .

# Check code style
style: ## Check code style without fixing
	npx prettier --check "**/*.{js,json,md,html}"

# Setup development environment
setup: install ## Setup development environment
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env file from .env.example"; \
	else \
		echo ".env file already exists"; \
	fi

# Run with development settings
dev: check-env ## Run in development mode with nodemon
	npx nodemon server.js

# Install production dependencies
prod-install: ## Install production dependencies
	$(PACKAGE_MANAGER) ci --only=production

# Docker commands
docker-build: ## Build Docker image
	$(DOCKER_COMPOSE) build

docker-up: docker-build ## Start Docker containers
	$(DOCKER_COMPOSE) up -d

docker-down: ## Stop and remove Docker containers
	$(DOCKER_COMPOSE) down

docker-logs: ## Show Docker logs
	$(DOCKER_COMPOSE) logs -f

# Check if Ollama is running
check-ollama: ## Check if Ollama service is running
	@if ! $(DOCKER) ps | grep -q ollama; then \
		echo "Ollama container is not running. Starting..."; \
		$(MAKE) docker-up; \
	else \
		echo "Ollama is running"; \
	fi

# Check environment variables
check-env: ## Check if .env file exists
	@if [ ! -f .env ]; then \
		echo "Error: .env file not found. Run 'make setup' first."; \
		exit 1; \
	fi

# Generate documentation
docs: ## Generate documentation
	@echo "Generating documentation..."
	@# Add documentation generation commands here

# Check for vulnerabilities
security: ## Check for known vulnerabilities
	npm audit

# Run all checks
check: lint style test security ## Run all code quality checks
