const express = require('express');
const path = require('path');
const https = require('https');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Inject GROQ_KEY into HTML
app.get('/', (req, res) => {
  const fs = require('fs');
  let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  html = html.replace(
    'window.GROQ_KEY || "PLACEHOLDER_KEY"',
    `"${process.env.GROQ_KEY || ''}"`
  );
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Proxy Groq API calls (keeps key server-side)
app.post('/api/groq', async (req, res) => {
  const GROQ_KEY = process.env.GROQ_KEY;
  const body = JSON.stringify(req.body);
  
  const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.setHeader('Content-Type', 'application/json');
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => res.status(500).json({ error: e.message }));
  proxyReq.write(body);
  proxyReq.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CortiMaxx running on port ${PORT}`));
