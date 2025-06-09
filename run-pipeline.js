#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const TaskRunner = require('./src/taskRunner');

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node run-pipeline.js <pipeline-file> [--var name=value ...]');
    process.exit(1);
  }

  const pipelineFile = args[0];
  const overrides = {};

  // Parse --var arguments (e.g., --var user.firstName=John)
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--var' && i + 1 < args.length) {
      const [key, value] = args[++i].split('=');
      if (key && value !== undefined) {
        // Support nested properties (e.g., user.firstName)
        const keys = key.split('.');
        let current = overrides;
        
        for (let j = 0; j < keys.length - 1; j++) {
          const k = keys[j];
          current[k] = current[k] || {};
          current = current[k];
        }
        
        current[keys[keys.length - 1]] = value;
      }
    }
  }

  // Check if pipeline file exists
  if (!fs.existsSync(pipelineFile)) {
    console.error(`Error: Pipeline file '${pipelineFile}' not found`);
    process.exit(1);
  }

  try {
    const runner = new TaskRunner();
    await runner.run(path.resolve(pipelineFile), overrides);
    process.exit(0);
  } catch (error) {
    console.error('Pipeline execution failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
