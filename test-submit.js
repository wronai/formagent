const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testFormSubmission() {
  const formData = new FormData();
  
  // Read the form spec
  const formSpec = fs.readFileSync(path.join(__dirname, 'specs', 'form_acme.md'), 'utf8');
  formData.append('spec', formSpec);
  
  // Add form data
  const formDataJson = {
    first_name: 'Jan',
    last_name: 'Kowalski',
    email: 'jan.kowalski@example.com',
    cv_path: '/tmp/test_cv.txt'
  };
  formData.append('data', JSON.stringify(formDataJson));
  
  // Add file
  formData.append('cv', fs.createReadStream('/tmp/test_cv.txt'));
  
  try {
    const response = await axios.post('http://localhost:3000/fill-form', formData, {
      headers: {
        ...formData.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testFormSubmission();
