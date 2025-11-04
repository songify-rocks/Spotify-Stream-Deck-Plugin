const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Stream Deck WebSocket connection
let ws = null;
let port = null;
let uuid = null;

// Spotify API configuration
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const REDIRECT_URI = 'http://localhost:8888/callback';

// Token storage file
const TOKEN_FILE = path.join(__dirname, 'tokens.json');

class SpotifyPlugin {
  constructor() {
    this.clientId = null;
    this.clientSecret = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.deviceId = null;
    
    // Track active "currently playing" action contexts for polling
    this.currentlyPlayingContexts = new Set();
    
    // Track active "play/pause" action contexts for polling
    this.playPauseContexts = new Set();
    
    // Load tokens if they exist
    this.loadTokens();
    
    // Start token refresh interval
    this.startTokenRefresh();
    
    // Start polling for currently playing updates
    this.startCurrentlyPlayingPolling();
    
    // Start polling for play/pause state updates
    this.startPlayPausePolling();
  }

  connectWebSocket(inPort, inUUID, inRegisterEvent, inInfo) {
    port = inPort;
    uuid = inUUID;

    ws = new WebSocket(`ws://localhost:${port}`);

    ws.on('open', () => {
      const register = {
        event: inRegisterEvent,
        uuid: inUUID
      };
      ws.send(JSON.stringify(register));
    });

    ws.on('message', (data) => {
      const json = JSON.parse(data);
      this.handleMessage(json);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  sendMessage(json) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(json));
    }
  }

  handleMessage(json) {
    const event = json.event;
    const context = json.context;

    switch (event) {
      case 'willAppear':
        this.handleWillAppear(json);
        break;
      case 'willDisappear':
        this.handleWillDisappear(json);
        break;
      case 'keyDown':
        this.handleKeyDown(json);
        break;
      case 'didReceiveSettings':
        this.handleSettings(json);
        break;
      case 'propertyInspectorDidAppear':
        this.handlePropertyInspector(json);
        break;
      case 'sendToPlugin':
        // Handle messages from property inspector
        if (json.payload) {
          this.handlePropertyInspectorMessage(json.payload);
        }
        break;
    }
  }

  loadTokens() {
    try {
      if (fs.existsSync(TOKEN_FILE)) {
        const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;
        this.tokenExpiry = data.tokenExpiry;
        this.clientId = data.clientId;
        this.clientSecret = data.clientSecret;
        this.deviceId = data.deviceId;
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  }

  saveTokens() {
    try {
      const data = {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        tokenExpiry: this.tokenExpiry,
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        deviceId: this.deviceId
      };
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  async ensureValidToken() {
    if (!this.accessToken || !this.refreshToken) {
      throw new Error('Not authenticated. Please configure your Spotify credentials.');
    }

    // Check if token is expired or will expire in the next minute
    if (this.tokenExpiry && Date.now() >= (this.tokenExpiry - 60000)) {
      await this.refreshAccessToken();
    }

    return this.accessToken;
  }

  async refreshAccessToken() {
    if (!this.refreshToken || !this.clientId || !this.clientSecret) {
      throw new Error('Missing credentials for token refresh');
    }

    try {
      const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
      }
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);
      this.saveTokens();
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  startTokenRefresh() {
    // Refresh token every 50 minutes (tokens expire in 1 hour)
    setInterval(async () => {
      if (this.refreshToken) {
        try {
          await this.refreshAccessToken();
        } catch (error) {
          console.error('Auto token refresh failed:', error);
        }
      }
    }, 50 * 60 * 1000);
  }

  startCurrentlyPlayingPolling() {
    // Update currently playing display every 5 seconds
    // Spotify API rate limit allows frequent polling for this endpoint
    setInterval(async () => {
      if (this.currentlyPlayingContexts.size > 0 && this.accessToken) {
        try {
          // Update all active "currently playing" actions
          for (const context of this.currentlyPlayingContexts) {
            await this.updateCurrentlyPlayingDisplay({ context });
          }
        } catch (error) {
          // Silently handle errors (token issues, no playback, etc.)
          // Individual actions will show "Error" if needed
        }
      }
    }, 5000); // Update every 5 seconds
  }

  startPlayPausePolling() {
    // Update play/pause button state every 2 seconds
    setInterval(async () => {
      if (this.playPauseContexts.size > 0 && this.accessToken) {
        try {
          // Update all active "play/pause" actions
          for (const context of this.playPauseContexts) {
            await this.updatePlayPauseState(context);
          }
        } catch (error) {
          // Silently handle errors
        }
      }
    }, 2000); // Update every 2 seconds for responsive state changes
  }

  async makeSpotifyRequest(endpoint, options = {}) {
    const token = await this.ensureValidToken();
    
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, mergedOptions);
    
    if (response.status === 401) {
      // Token expired, try refreshing
      await this.refreshAccessToken();
      mergedOptions.headers['Authorization'] = `Bearer ${this.accessToken}`;
      return fetch(`${SPOTIFY_API_BASE}${endpoint}`, mergedOptions);
    }

    return response;
  }

  async getCurrentlyPlaying() {
    try {
      const response = await this.makeSpotifyRequest('/me/player/currently-playing');
      if (response.status === 204) {
        return null; // No track playing
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting currently playing:', error);
      throw error;
    }
  }

  async skipToNext() {
    try {
      const response = await this.makeSpotifyRequest('/me/player/next', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.ensureValidToken()}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Error skipping to next:', error);
      throw error;
    }
  }

  async skipToPrevious() {
    try {
      const response = await this.makeSpotifyRequest('/me/player/previous', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.ensureValidToken()}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Error skipping to previous:', error);
      throw error;
    }
  }

  async changeVolume(volumePercent) {
    try {
      const response = await this.makeSpotifyRequest(`/me/player/volume?volume_percent=${volumePercent}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${await this.ensureValidToken()}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Error changing volume:', error);
      throw error;
    }
  }

  async playPlaylist(playlistId, deviceId = null) {
    try {
      const targetDevice = deviceId || this.deviceId;
      const body = {
        context_uri: `spotify:playlist:${playlistId}`
      };
      
      if (targetDevice) {
        body.device_id = targetDevice;
      }

      const response = await this.makeSpotifyRequest('/me/player/play', {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      return response.ok;
    } catch (error) {
      console.error('Error playing playlist:', error);
      throw error;
    }
  }

  async addToLikedSongs(trackId) {
    try {
      const response = await this.makeSpotifyRequest(`/me/tracks?ids=${trackId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${await this.ensureValidToken()}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Error adding to liked songs:', error);
      throw error;
    }
  }

  async togglePlayPause() {
    try {
      // Get current playback state
      const response = await this.makeSpotifyRequest('/me/player', {
        headers: {
          'Authorization': `Bearer ${await this.ensureValidToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get player state');
      }

      const playerState = await response.json();
      const isPlaying = playerState.is_playing;

      // Toggle play/pause
      const toggleResponse = await this.makeSpotifyRequest('/me/player/' + (isPlaying ? 'pause' : 'play'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${await this.ensureValidToken()}`
        }
      });
      
      return toggleResponse.ok;
    } catch (error) {
      console.error('Error toggling play/pause:', error);
      throw error;
    }
  }

  async getPlaybackState() {
    try {
      const response = await this.makeSpotifyRequest('/me/player', {
        headers: {
          'Authorization': `Bearer ${await this.ensureValidToken()}`
        }
      });

      if (!response.ok) {
        return { is_playing: false };
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting playback state:', error);
      return { is_playing: false };
    }
  }

  async updatePlayPauseState(context) {
    try {
      const playerState = await this.getPlaybackState();
      const isPlaying = playerState.is_playing || false;
      
      // Set state: 0 = paused (show play icon), 1 = playing (show pause icon)
      // In Stream Deck, state 0 is the first state in the States array
      const state = isPlaying ? 0 : 1;
      
      this.sendMessage({
        event: 'setState',
        context: context,
        payload: {
          state: state
        }
      });
    } catch (error) {
      console.error('Error updating play/pause state:', error);
    }
  }

  async toggleRepeatMode() {
    try {
      // Get current repeat state
      const response = await this.makeSpotifyRequest('/me/player', {
        headers: {
          'Authorization': `Bearer ${await this.ensureValidToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get player state');
      }

      const playerState = await response.json();
      const currentState = playerState.repeat_state || 'off';
      
      // Cycle: off -> context -> track -> off
      let nextState = 'off';
      if (currentState === 'off') {
        nextState = 'context';
      } else if (currentState === 'context') {
        nextState = 'track';
      }

      const updateResponse = await this.makeSpotifyRequest(`/me/player/repeat?state=${nextState}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${await this.ensureValidToken()}`
        }
      });
      
      return updateResponse.ok;
    } catch (error) {
      console.error('Error toggling repeat mode:', error);
      throw error;
    }
  }

  handleWillAppear(event) {
    // Update action display based on current state
    if (event.action === 'com.spotify.streamdeck.currently-playing') {
      // Add to tracking set for periodic updates
      this.currentlyPlayingContexts.add(event.context);
      this.updateCurrentlyPlayingDisplay(event);
    } else if (event.action === 'com.spotify.streamdeck.play-pause') {
      // Add to tracking set for periodic state updates
      this.playPauseContexts.add(event.context);
      this.updatePlayPauseState(event.context);
    }
  }

  handleWillDisappear(event) {
    // Remove from tracking when action is removed from deck
    if (event.action === 'com.spotify.streamdeck.currently-playing') {
      this.currentlyPlayingContexts.delete(event.context);
    } else if (event.action === 'com.spotify.streamdeck.play-pause') {
      this.playPauseContexts.delete(event.context);
    }
  }

  async updateCurrentlyPlayingDisplay(event) {
    try {
      const track = await this.getCurrentlyPlaying();
      if (track && track.item) {
        const title = track.item.name;
        const artist = track.item.artists.map(a => a.name).join(', ');
        this.setTitle(event.context, `${title}\n${artist}`);
      } else {
        this.setTitle(event.context, 'No track playing');
      }
    } catch (error) {
      this.setTitle(event.context, 'Error');
      console.error('Error updating display:', error);
    }
  }

  setTitle(context, title) {
    this.sendMessage({
      event: 'setTitle',
      context: context,
      payload: {
        title: title
      }
    });
  }

  showAlert(context) {
    this.sendMessage({
      event: 'showAlert',
      context: context
    });
  }

  handleKeyDown(event) {
    const action = event.action;
    const settings = event.payload?.settings || {};

    switch (action) {
      case 'com.spotify.streamdeck.next':
        this.skipToNext().catch(err => {
          console.error('Next track error:', err);
          this.showAlert(event.context);
        });
        break;

      case 'com.spotify.streamdeck.previous':
        this.skipToPrevious().catch(err => {
          console.error('Previous track error:', err);
          this.showAlert(event.context);
        });
        break;

      case 'com.spotify.streamdeck.volume-up':
        this.getCurrentVolume().then(currentVol => {
          const newVol = Math.min(100, currentVol + 10);
          this.changeVolume(newVol).catch(err => {
            console.error('Volume up error:', err);
            this.showAlert(event.context);
          });
        });
        break;

      case 'com.spotify.streamdeck.volume-down':
        this.getCurrentVolume().then(currentVol => {
          const newVol = Math.max(0, currentVol - 10);
          this.changeVolume(newVol).catch(err => {
            console.error('Volume down error:', err);
            this.showAlert(event.context);
          });
        });
        break;

      case 'com.spotify.streamdeck.play-playlist':
        const playlistId = settings.playlistId;
        if (playlistId) {
          this.playPlaylist(playlistId).catch(err => {
            console.error('Play playlist error:', err);
            this.showAlert(event.context);
          });
        } else {
          this.showAlert(event.context);
        }
        break;

      case 'com.spotify.streamdeck.like-song':
        this.getCurrentlyPlaying().then(track => {
          if (track && track.item) {
            this.addToLikedSongs(track.item.id).catch(err => {
              console.error('Like song error:', err);
              this.showAlert(event.context);
            });
          } else {
            this.showAlert(event.context);
          }
        });
        break;

      case 'com.spotify.streamdeck.repeat-mode':
        this.toggleRepeatMode().catch(err => {
          console.error('Repeat mode error:', err);
          this.showAlert(event.context);
        });
        break;

      case 'com.spotify.streamdeck.currently-playing':
        this.updateCurrentlyPlayingDisplay(event);
        break;

      case 'com.spotify.streamdeck.play-pause':
        this.togglePlayPause().then(() => {
          // Update state after toggle
          setTimeout(() => {
            this.updatePlayPauseState(event.context);
          }, 500);
        }).catch(err => {
          console.error('Play/pause error:', err);
          this.showAlert(event.context);
        });
        break;
    }
  }

  handleSettings(event) {
    // Handle settings updates from property inspector
    if (event.payload && event.payload.settings) {
      const settings = event.payload.settings;
      if (settings.clientId) {
        this.clientId = settings.clientId;
      }
      if (settings.clientSecret) {
        this.clientSecret = settings.clientSecret;
      }
      if (settings.accessToken) {
        this.accessToken = settings.accessToken;
      }
      if (settings.refreshToken) {
        this.refreshToken = settings.refreshToken;
      }
      if (settings.tokenExpiry) {
        this.tokenExpiry = settings.tokenExpiry;
      }
      if (settings.deviceId) {
        this.deviceId = settings.deviceId;
      }
      this.saveTokens();
    }
  }

  handlePropertyInspector(event) {
    // Send current settings to property inspector
    this.sendMessage({
      event: 'sendToPropertyInspector',
      context: event.context,
      payload: {
        clientId: this.clientId || '',
        clientSecret: this.clientSecret || '',
        hasTokens: !!this.accessToken,
        accessToken: this.accessToken || ''
      }
    });
  }

  handlePropertyInspectorMessage(payload) {
    // Handle messages from property inspector (e.g., token updates)
    if (payload.accessToken) {
      this.accessToken = payload.accessToken;
    }
    if (payload.refreshToken) {
      this.refreshToken = payload.refreshToken;
    }
    if (payload.tokenExpiry) {
      this.tokenExpiry = payload.tokenExpiry;
    }
    this.saveTokens();
  }

  async getCurrentVolume() {
    try {
      const response = await this.makeSpotifyRequest('/me/player', {
        headers: {
          'Authorization': `Bearer ${await this.ensureValidToken()}`
        }
      });

      if (!response.ok) {
        return 50; // Default volume
      }

      const playerState = await response.json();
      return playerState.device?.volume_percent || 50;
    } catch (error) {
      console.error('Error getting volume:', error);
      return 50;
    }
  }
}

// Initialize plugin
const plugin = new SpotifyPlugin();

// Read command line arguments
const args = process.argv.slice(2);
if (args.length >= 4) {
  const port = args[0];
  const uuid = args[1];
  const registerEvent = args[2];
  const info = JSON.parse(args[3]);
  
  plugin.connectWebSocket(port, uuid, registerEvent, info);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  plugin.saveTokens();
  if (ws) {
    ws.close();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  plugin.saveTokens();
  if (ws) {
    ws.close();
  }
  process.exit(0);
});
