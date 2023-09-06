import express from 'express';
import fileUpload from 'express-fileupload';
import FormData from 'form-data';
import axios from 'axios';
const app = express();
const port = 3000;

// Use express-fileupload middleware to handle file uploads
app.use(fileUpload());

app.post('/transcribe', async (req, res) => {
  try {
    const data = new FormData();
    data.append('model', 'whisper-1');

    // Check if a file was uploaded in the request
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadedFile = req.files.file.data; // Get the file data as a Buffer
    data.append('file', uploadedFile, { filename: 'audio.mp3' }); // Add the file with a filename

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://api.openai.com/v1/audio/transcriptions',
      headers: {
        ...data.getHeaders(),
        Authorization: 'Bearer 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',
      },
      data: data,
    };

    const response = await axios.request(config);
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.get('/est', async (req, res) => {
    res.json({status:"ok"});
  });

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
