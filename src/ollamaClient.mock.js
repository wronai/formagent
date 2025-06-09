// Mock version of ollamaClient.js for testing without LLM
function generate({ model, prompt }) {
  console.log('Mock LLM called with prompt:', prompt.substring(0, 200) + '...');
  
  // Mock response that simulates form field mapping
  const mockResponse = {
    fields: {
      'input[name="first_name"]': 'John',
      'input[name="last_name"]': 'Doe',
      'input[type="email"]': 'john.doe@example.com',
      'input[type="file"]': '/tmp/example_cv.pdf'
    }
  };
  
  return Promise.resolve(mockResponse);
}

module.exports = { generate };
