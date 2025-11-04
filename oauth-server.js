const http = require('http');
const url = require('url');
const querystring = require('querystring');
const fetch = require('node-fetch');

const PORT = 8888;
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

// Simple in-memory store for OAuth states (in production, use proper session storage)
const oauthStates = new Map();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  // Handle callback redirect
  if (path === '/callback' && method === 'GET') {
    const code = parsedUrl.query.code;
    const state = parsedUrl.query.state;
    const error = parsedUrl.query.error;

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html', ...corsHeaders });
      res.end(`
        <html>
          <body style="font-family: Arial; padding: 20px; background: #1e1e1e; color: white;">
            <h2>Authorization Failed</h2>
            <p>Error: ${error}</p>
            <p>You can close this window.</p>
          </body>
        </html>
      `);
      return;
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html', ...corsHeaders });
      res.end(`
        <html>
          <body style="font-family: Arial; padding: 20px; background: #1e1e1e; color: white;">
            <h2>Authorization Error</h2>
            <p>No authorization code received.</p>
            <p>You can close this window.</p>
          </body>
        </html>
      `);
      return;
    }

    // Show success page
    res.writeHead(200, { 'Content-Type': 'text/html', ...corsHeaders });
    res.end(`
      <html>
        <body style="font-family: Arial; padding: 20px; background: #1e1e1e; color: white;">
          <h2>Authorization Successful!</h2>
          <p>Please copy the full URL from your browser's address bar and paste it into the Stream Deck plugin configuration.</p>
          <p style="background: #2d2d2d; padding: 10px; border-radius: 4px; word-break: break-all;">
            ${req.url}
          </p>
          <p style="color: #888; font-size: 12px;">You can close this window after copying the URL.</p>
        </body>
      </html>
    `);
    return;
  }

  // Handle token exchange
  if (path === '/exchange' && method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { code, client_id, client_secret, redirect_uri } = data;

        if (!code || !client_id || !client_secret) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Missing required parameters' }));
          return;
        }

        // Exchange authorization code for tokens
        const tokenResponse = await fetch(SPOTIFY_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64')
          },
          body: querystring.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirect_uri || 'http://localhost:8888/callback'
          })
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.text();
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Token exchange failed', details: errorData }));
          return;
        }

        const tokenData = await tokenResponse.json();

        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          token_type: tokenData.token_type
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
      }
    });
    return;
  }

  // Default 404
  res.writeHead(404, { 'Content-Type': 'text/plain', ...corsHeaders });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Spotify OAuth Token Exchange Server running on http://localhost:${PORT}`);
  console.log('This server handles OAuth callbacks and token exchange.');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
