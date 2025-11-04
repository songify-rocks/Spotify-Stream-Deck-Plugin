/**
 * Local OAuth server to handle Spotify callback automatically
 */
import streamDeck from "@elgato/streamdeck";
import http from "http";
import { URL } from "url";
import { globalSettings } from "./global-settings";

export class OAuthServer {
    private static instance: OAuthServer | null = null;
    private server: http.Server | null = null;
    private port = 8888;
    private isRunning = false;

    private constructor() {}

    static getInstance(): OAuthServer {
        if (!OAuthServer.instance) {
            OAuthServer.instance = new OAuthServer();
        }
        return OAuthServer.instance;
    }

    /**
     * Start the local OAuth server
     */
    async start(clientId: string, clientSecret: string): Promise<void> {
        if (this.isRunning) {
            streamDeck.logger.warn('[OAuthServer] Server already running');
            return;
        }

        streamDeck.logger.info(`[OAuthServer] Starting server with clientId: ${clientId.substring(0, 8)}...`);

        return new Promise((resolve, reject) => {
            this.server = http.createServer(async (req, res) => {
                try {
                    const url = new URL(req.url || '', `http://127.0.0.1:${this.port}`);
                    
                    streamDeck.logger.info(`[OAuthServer] Received request: ${req.method} ${url.pathname}`);
                    
                    // Handle root path for testing
                    if (url.pathname === '/' || url.pathname === '') {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end('<h1>OAuth Server Running</h1><p>Waiting for Spotify callback...</p>');
                        return;
                    }
                    
                    // Only handle callback path
                    if (url.pathname !== '/callback') {
                        streamDeck.logger.warn(`[OAuthServer] Invalid path requested: ${url.pathname}`);
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end('<h1>404 Not Found</h1>');
                        return;
                    }

                    const code = url.searchParams.get('code');
                    const error = url.searchParams.get('error');

                    if (error) {
                        streamDeck.logger.error('[OAuthServer] Authorization error:', error);
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Authorization Failed</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            text-align: center;
        }
        .container { max-width: 500px; padding: 40px; }
        h1 { font-size: 36px; margin: 20px 0; font-weight: 400; }
        p { font-size: 16px; line-height: 1.6; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>&#10060; Authorization Failed</h1>
        <p>Error: ${error}</p>
        <p>You can close this window and try again.</p>
    </div>
</body>
</html>`);
                        this.stop();
                        return;
                    }

                    if (!code) {
                        streamDeck.logger.error('[OAuthServer] No authorization code received');
                        res.writeHead(400, { 'Content-Type': 'text/html' });
                        res.end('<h1>400 Bad Request - No authorization code</h1>');
                        return;
                    }

                    streamDeck.logger.info('[OAuthServer] Received authorization code, exchanging for tokens...');

                    // Exchange code for tokens
                    const tokens = await this.exchangeCodeForTokens(code, clientId, clientSecret);

                    if (tokens) {
                        // Save tokens to global settings
                        const currentSettings = await globalSettings.getSettings();
                        await globalSettings.setSettings({
                            ...currentSettings,
                            clientId,
                            clientSecret,
                            accessToken: tokens.access_token,
                            refreshToken: tokens.refresh_token
                        });

                        streamDeck.logger.info('[OAuthServer] Tokens saved successfully!');

                        // Send success page
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Authentication Successful</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1DB954 0%, #1ed760 100%);
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            text-align: center;
        }
        .container {
            max-width: 500px;
            padding: 40px;
        }
        .checkmark {
            font-size: 80px;
            margin-bottom: 20px;
            animation: scaleIn 0.5s ease-out;
        }
        @keyframes scaleIn {
            from { transform: scale(0); }
            to { transform: scale(1); }
        }
        h1 {
            font-size: 42px;
            margin: 0 0 20px 0;
            font-weight: 400;
        }
        p {
            font-size: 18px;
            line-height: 1.6;
            margin: 15px 0;
        }
        .auto-close {
            margin-top: 30px;
            font-size: 14px;
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="checkmark">&#10004;</div>
        <h1>Authentication Successful!</h1>
        <p>Your Spotify account has been connected.</p>
        <p><strong>You can close this window now.</strong></p>
        <p>Your Stream Deck is ready to control Spotify!</p>
        <div class="auto-close">This window will close automatically in 5 seconds...</div>
    </div>
    <script>
        setTimeout(() => { window.close(); }, 5000);
    </script>
</body>
</html>`);
                    } else {
                        // Send error page
                        res.writeHead(500, { 'Content-Type': 'text/html' });
                        res.end(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>Token Exchange Failed</title>
                                <style>
                                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f44336; color: white; }
                                    h1 { font-size: 48px; margin: 0; }
                                    p { font-size: 18px; }
                                </style>
                            </head>
                            <body>
                                <h1>❌ Token Exchange Failed</h1>
                                <p>Could not exchange authorization code for tokens.</p>
                                <p>Please try again or check your Client ID and Secret.</p>
                            </body>
                            </html>
                        `);
                    }

                    // Stop server after handling callback
                    setTimeout(() => this.stop(), 1000);

                } catch (error) {
                    streamDeck.logger.error('[OAuthServer] Error handling callback:', error);
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end('<h1>500 Internal Server Error</h1>');
                    this.stop();
                }
            });

            this.server.on('error', (error: any) => {
                streamDeck.logger.error('[OAuthServer] Server error:', error);
                streamDeck.logger.error('[OAuthServer] Error details:', JSON.stringify(error));
                this.isRunning = false;
                
                if ((error as any).code === 'EADDRINUSE') {
                    streamDeck.logger.error(`[OAuthServer] Port ${this.port} is already in use!`);
                }
                
                reject(error);
            });

            this.server.listen(this.port, '127.0.0.1', () => {
                this.isRunning = true;
                streamDeck.logger.info(`[OAuthServer] ✓ Server successfully started on http://127.0.0.1:${this.port}`);
                streamDeck.logger.info(`[OAuthServer] ✓ Ready to receive OAuth callback`);
                resolve();
            });
        });
    }

    /**
     * Exchange authorization code for access and refresh tokens
     */
    private async exchangeCodeForTokens(code: string, clientId: string, clientSecret: string): Promise<any> {
        try {
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: `http://127.0.0.1:${this.port}/callback`,
                client_id: clientId,
                client_secret: clientSecret
            });

            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            if (!response.ok) {
                const errorText = await response.text();
                streamDeck.logger.error('[OAuthServer] Token exchange failed:', response.status, errorText);
                return null;
            }

            const tokens = await response.json();
            streamDeck.logger.info('[OAuthServer] Tokens received successfully');
            return tokens;

        } catch (error) {
            streamDeck.logger.error('[OAuthServer] Error exchanging code for tokens:', error);
            return null;
        }
    }

    /**
     * Stop the OAuth server
     */
    stop(): void {
        if (this.server) {
            this.server.close(() => {
                streamDeck.logger.info('[OAuthServer] Server stopped');
            });
            this.server = null;
            this.isRunning = false;
        }
    }

    /**
     * Check if server is running
     */
    getIsRunning(): boolean {
        return this.isRunning;
    }

    /**
     * Get the callback URL
     */
    getCallbackUrl(): string {
        return `http://127.0.0.1:${this.port}/callback`;
    }
}

export const oauthServer = OAuthServer.getInstance();

