const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs/promises');
const path = require('path');
const { autoFillForm } = require('./src/autoFillForm');
const { parseMarkdownSpec } = require('./src/markdownParser');
const { validateSpec } = require('./src/validator');

const app = express();
app.use(express.json());
app.use(fileUpload());

app.post('/fill-form', async (req, res) => {
  try {
    const mdSpec = req.body.spec;
    validateSpec(mdSpec);

    const formSpec = parseMarkdownSpec(mdSpec);

    if (req.files && req.files.cv) {
      const uploadPath = `/tmp/${req.files.cv.name}`;
      await req.files.cv.mv(uploadPath);
      formSpec.files = uploadPath;
    }

    const result = await autoFillForm(formSpec);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Form Agent running on http://localhost:3000'));