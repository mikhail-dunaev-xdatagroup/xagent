import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { askVertex } from './vertexClient';
import { setupAuth } from './auth';
import { backendURL, frontendURL, isDev, port } from './config';

const app = express();
app.use(express.json());

setupAuth(app, { isDev, frontendURL, backendURL });

const publicPath = path.join(__dirname, '..', 'public');
const hasPublic = fs.existsSync(publicPath);
if (hasPublic) {
  app.use(express.static(publicPath));
}

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

if (hasPublic) {
  const sendIndex = (_req: express.Request, res: express.Response) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  };
  app.get('/', sendIndex);
  app.get('/{*path}', sendIndex);
}

app.listen(port, () => {
  console.log('Server listening on port', port);
});
