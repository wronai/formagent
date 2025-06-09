import axios from 'axios';

// Sample form specification in Markdown format
const formSpec = `## Formularz rekrutacyjny Acme Corp
- Imię: Jan
- Nazwisko: Kowalski
- Email: jan.kowalski@example.com
- Załącznik CV: /tmp/example_cv.pdf
`;

// Sample test URL (using a test form URL)
const testUrl = 'https://httpbin.org/post';

async function testFormSubmission() {
  try {
    console.log('Sending test form submission...');
    
    const response = await axios.post('http://localhost:3000/fill-form', {
      spec: formSpec,
      url: testUrl
    });
    
    console.log('Form submission successful!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error during form submission:');
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testFormSubmission().catch(console.error);
