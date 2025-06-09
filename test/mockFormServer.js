import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3002;
const upload = multer({ dest: 'uploads/' });

// Serve static files
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Simple HTML form for testing
const formHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Job Application</title>
</head>
<body>
    <h1>Job Application Form</h1>
    <form action="/submit" method="post" enctype="multipart/form-data">
        <div>
            <label for="firstname">First Name:</label>
            <input type="text" id="firstname" name="firstname" required>
        </div>
        <div>
            <label for="lastname">Last Name:</label>
            <input type="text" id="lastname" name="lastname" required>
        </div>
        <div>
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required>
        </div>
        <div>
            <label for="phone">Phone:</label>
            <input type="tel" id="phone" name="phone">
        </div>
        <div>
            <label for="cv">Upload CV (PDF):</label>
            <input type="file" id="cv" name="cv" accept=".pdf" required>
        </div>
        <div>
            <label for="message">Cover Letter:</label><br>
            <textarea id="message" name="message" rows="4" cols="50"></textarea>
        </div>
        <button type="submit">Submit Application</button>
    </form>
</body>
</html>
`;

// Routes
app.get('/', (req, res) => {
    res.send(formHTML);
});

app.post('/submit', upload.single('cv'), (req, res) => {
    console.log('Form submitted with data:', req.body);
    if (req.file) {
        console.log('File uploaded:', req.file);
    }
    res.send('Application submitted successfully!');
});

// Start server
app.listen(port, () => {
    console.log(`Mock form server running at http://localhost:${port}`);
});
