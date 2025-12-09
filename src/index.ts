import 'dotenv/config';
import express from 'express';
import { askVertex } from './vertexClient';

const app = express();
app.use(express.json());

app.post('/ask', async (req, res) => {
  try {
    const question = req.body?.question;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'question must be a string' });
    }

    const answer = await askVertex(question);

    res.json({ answer });
  } catch (err) {
    console.error('Error in /ask:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('Server listening on port', port);
});

console.log("GOOGLE_APPLICATION_CREDENTIALS =", process.env.GOOGLE_APPLICATION_CREDENTIALS);