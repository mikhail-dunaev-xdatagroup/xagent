import express from 'express';

const app = express();

app.get('/hello', (req, res) => {
  res.json({ world: true });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('xAgent app is running on port', port);
});