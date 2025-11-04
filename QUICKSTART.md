# Quick Start Guide

## Prerequisites

1. **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
2. **Stream Deck** software installed
3. **Spotify Developer Account** - [Create App](https://developer.spotify.com/dashboard)

## Setup Steps

### 1. Get Spotify Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create an app"
3. Fill in:
   - App name: `Spotify Stream Deck Plugin`
   - Redirect URI: `http://localhost:8888/callback`
4. Save and copy your **Client ID** and **Client Secret**

### 2. Install Plugin

**Option A: Using install script (macOS/Linux)**
```bash
./install.sh
cd ~/Library/Application\ Support/com.elgato.StreamDeck/Plugins/com.spotify.streamdeck.sdPlugin
npm install
```

**Option B: Manual installation**
1. Copy entire plugin folder to Stream Deck plugins directory:
   - **macOS**: `~/Library/Application Support/com.elgato.StreamDeck/Plugins/com.spotify.streamdeck.sdPlugin/`
   - **Windows**: `%APPDATA%\Elgato\StreamDeck\Plugins\com.spotify.streamdeck.sdPlugin\`
2. Open terminal in plugin directory
3. Run: `npm install`

### 3. Start OAuth Server

In a terminal, navigate to the plugin directory and run:
```bash
node oauth-server.js
```

Keep this running while you configure the plugin.

### 4. Configure Plugin

1. Restart Stream Deck application
2. Add any Spotify action to your deck (e.g., "Currently Playing")
3. Click the action to open Property Inspector
4. Enter your **Client ID** and **Client Secret**
5. Click "Authorize Spotify"
6. Complete authorization in browser
7. Copy the callback URL from browser
8. Paste when prompted in Property Inspector
9. Click "Save"

### 5. Add Icons

The plugin needs icon images. See `ICONS.md` for details and requirements.

## Using Actions

### Currently Playing
- Displays track name and artist
- Updates automatically

### Next/Previous Track
- Press button to skip tracks

### Volume Up/Down
- Each press adjusts volume by 10%

### Play Playlist
- Configure playlist ID in Property Inspector
- Press button to play playlist

### Like Song
- Press to add current song to liked songs

### Repeat Mode
- Cycles: Off → Context → Track → Off

## Troubleshooting

**Plugin not appearing in Stream Deck:**
- Check plugin is in correct directory
- Restart Stream Deck
- Check for errors in Stream Deck logs

**Authorization fails:**
- Ensure OAuth server is running
- Verify redirect URI matches exactly: `http://localhost:8888/callback`
- Check browser console for errors

**Actions not working:**
- Ensure Spotify is running
- Check you have an active Spotify device
- Verify tokens are valid (check `tokens.json`)

**Token refresh issues:**
- Tokens auto-refresh every 50 minutes
- Re-authorize if refresh fails

## Support

For issues, check:
1. Stream Deck logs
2. Browser console (for Property Inspector)
3. OAuth server console output
4. Plugin console output (if available)

## Development

See `README.md` for detailed development information.
