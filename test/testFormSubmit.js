const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testFormSubmission() {
  try {
    console.log('Sending test form submission...');
    
    // First, let's test with a simple JSON payload
    const formData = {
      first_name: 'Jan',
      last_name: 'Kowalski',
      email: 'jan.kowalski@example.com',
      phone: '+48123456789',
      job_title: 'Senior Developer',
      experience_years: '5',
      skills: 'JavaScript, Node.js, Python',
      about: 'Experienced developer with a passion for clean code',
      resume_path: '/tmp/sample_resume.pdf',
      portfolio_url: 'https://example.com/portfolio',
      start_date: '2023-07-01',
      salary: '15000',
      remote_work: 'true'
    };

    const response = await axios.post('http://localhost:3000/fill-form', {
      spec: fs.readFileSync(path.join(__dirname, '../specs/test_form.md'), 'utf8'),
      data: JSON.stringify(formData)
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Success! Response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error submitting form:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testFormSubmission();
