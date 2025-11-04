# Spotify Stream Deck Plugin

A comprehensive Stream Deck plugin for controlling Spotify playback. This plugin allows you to control your Spotify music directly from your Stream Deck.

## Features

- **Currently Playing**: Display the currently playing track and artist
- **Next Track**: Skip to the next track
- **Previous Track**: Go back to the previous track
- **Volume Up/Down**: Adjust Spotify volume (increments of 10%)
- **Play Selected Playlist**: Play a specific playlist by ID or URL
- **Like Song**: Add the currently playing song to your liked songs
- **Repeat Mode**: Toggle between off, context (repeat playlist), and track (repeat song)

## Setup Instructions

### Prerequisites

1. **Node.js** (v14 or higher)
2. **Stream Deck** software installed
3. **Spotify Developer Account** (free)

### Step 1: Create Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create an app"
3. Fill in app details:
   - App name: `Spotify Stream Deck Plugin`
   - App description: `Stream Deck plugin for controlling Spotify`
   - Redirect URI: `http://localhost:8888/callback`
4. Click "Save"
5. Copy your **Client ID** and **Client Secret** (click "Show Client Secret")

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Start OAuth Server

The plugin requires a local OAuth server for token exchange. Start it before configuring:

```bash
node oauth-server.js
```

Keep this server running while you configure the plugin.

### Step 4: Install Plugin to Stream Deck

1. Copy the entire plugin folder to Stream Deck plugins directory:
   - **macOS**: `~/Library/Application Support/com.elgato.StreamDeck/Plugins/`
   - **Windows**: `%APPDATA%\Elgato\StreamDeck\Plugins\`

2. Create a folder named `com.spotify.streamdeck.sdPlugin` in the Plugins directory

3. Copy all files from this repository into that folder

4. Restart Stream Deck application

### Step 5: Configure Plugin

1. Open Stream Deck application
2. Add a Spotify action to your deck (any action will work for initial setup)
3. Click the action to open Property Inspector
4. Enter your **Client ID** and **Client Secret**
5. Click "Authorize Spotify"
6. Complete authorization in the browser window that opens
7. After authorization, copy the full callback URL from the browser
8. Paste it when prompted in the Property Inspector
9. Click "Save"

The plugin will now automatically refresh tokens as needed.

## Usage

### Currently Playing Action
- Displays the currently playing track and artist
- Updates automatically when playback changes
- Shows "No track playing" when Spotify is paused or stopped

### Next/Previous Track Actions
- Simply press the button to skip tracks
- Works with any active Spotify device

### Volume Up/Down Actions
- Each press adjusts volume by 10%
- Range: 0-100%

### Play Playlist Action
1. Add the action to your deck
2. Configure in Property Inspector:
   - Enter playlist ID directly (e.g., `37i9dQZF1DXcBWIGoYBM5M`)
   - Or paste full Spotify URL (e.g., `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M`)
   - Or click "Load My Playlists" to browse and select
3. Save and press the button to play the playlist

### Like Song Action
- Press to add the currently playing song to your liked songs
- Works instantly with any active playback

### Repeat Mode Action
- Cycles through repeat modes: Off → Context (repeat playlist) → Track (repeat song) → Off
- Each press advances to the next mode

## Token Management

The plugin automatically handles token refresh. Tokens are stored locally in `tokens.json` and refreshed automatically before expiration. You don't need to re-authorize unless you revoke access from Spotify.

## Troubleshooting

### "Not authenticated" Error
- Make sure you've completed the authorization flow
- Check that `tokens.json` exists and contains valid tokens
- Try re-authorizing from the Property Inspector

### Actions Not Working
- Ensure Spotify is running and has an active device
- Check that the OAuth server is running (`node oauth-server.js`)
- Verify your Spotify app redirect URI matches exactly: `http://localhost:8888/callback`

### Playlist Not Playing
- Verify the playlist ID is correct
- Make sure you have access to the playlist (it's yours or public)
- Check that Spotify is active on a device

## Development

### Project Structure

```
.
├── manifest.json              # Plugin manifest
├── package.json              # Dependencies
├── plugin/
│   └── index.js             # Main plugin logic
├── oauth-server.js          # OAuth token exchange server
└── actions/
    ├── currently-playing/
    │   └── property-inspector.html
    ├── play-playlist/
    │   └── property-inspector.html
    └── ... (other actions)
```

### Required Spotify Scopes

- `user-read-playback-state`
- `user-modify-playback-state`
- `user-read-currently-playing`
- `user-library-modify`
- `user-read-playback-position`

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Security Notes

- **Never commit** `tokens.json` or `client_secret` to version control
- The OAuth server should only be run locally
- Keep your Client Secret secure

## Support

For issues and feature requests, please open an issue on GitHub.
