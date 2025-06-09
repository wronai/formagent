const { spawn } = require('child_process');

function generate({ model, prompt, format }) {
  return new Promise((resolve, reject) => {
    const process = spawn('ollama', ['run', model]);
    let output = '';
    process.stdin.write(prompt);
    process.stdin.end();
    process.stdout.on('data', (data) => output += data.toString());
    process.stderr.on('data', (err) => console.error(err.toString()));
    process.on('close', () => {
      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch (err) {
        reject(new Error('Błąd parsowania odpowiedzi LLM'));
      }
    });
  });
}

module.exports = { generate };