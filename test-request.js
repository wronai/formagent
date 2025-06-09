const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testFormFill() {
  try {
    // Read the form specification
    const spec = fs.readFileSync('./specs/form_acme.md', 'utf8');
    
    // Create form data
    const form = new FormData();
    form.append('spec', spec);
    
    // Add a test file if needed
    // form.append('cv', fs.createReadStream('./path/to/test-cv.pdf'));
    
    // Send the request
    const response = await axios.post('http://localhost:3000/fill-form', form, {
      headers: {
        ...form.getHeaders(),
      },
    });
    
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testFormFill();
