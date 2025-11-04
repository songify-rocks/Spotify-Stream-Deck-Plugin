/**
 * Spotify API service for handling authentication and API calls
 */

export interface SpotifyTokens {
	accessToken: string;
	refreshToken: string;
	expiresAt?: number; // Timestamp when token expires
}

export interface SpotifyAuthSettings {
	clientId?: string;
	clientSecret?: string;
	accessToken?: string;
	refreshToken?: string;
	[key: string]: any;
}

export interface CurrentlyPlaying {
	isPlaying: boolean;
	track?: {
		name: string;
		artists: string[];
		album: string;
		albumArtUrl?: string;
		uri: string;
	};
	device?: {
		volume_percent?: number;
	};
	shuffleState?: boolean;
	repeatState?: string;
}

interface TokenResponse {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
}

interface SpotifyArtist {
	name: string;
}

interface SpotifyAlbum {
	name: string;
	images?: Array<{ url: string }>;
}

interface SpotifyTrack {
	name: string;
	artists: SpotifyArtist[];
	album: SpotifyAlbum;
	uri: string;
}

interface CurrentlyPlayingResponse {
	is_playing: boolean;
	item: SpotifyTrack | null;
}

interface PlayerStateResponse {
	is_playing: boolean;
	item: SpotifyTrack | null;
	shuffle_state: boolean;
	repeat_state: string;
	device?: {
		volume_percent?: number;
	};
}

export class SpotifyAPI {
	private clientId: string;
	private clientSecret: string;
	private accessToken: string;
	private refreshToken: string;
	private expiresAt?: number;
	private refreshTimer?: NodeJS.Timeout;

	constructor(settings: SpotifyAuthSettings) {
		this.clientId = settings.clientId || "";
		this.clientSecret = settings.clientSecret || "";
		this.accessToken = settings.accessToken || "";
		this.refreshToken = settings.refreshToken || "";
	}

	/**
	 * Initialize tokens and set up auto-refresh
	 */
	async initialize(settings: SpotifyAuthSettings): Promise<void> {
		this.clientId = settings.clientId || "";
		this.clientSecret = settings.clientSecret || "";
		this.accessToken = settings.accessToken || "";
		this.refreshToken = settings.refreshToken || "";

		// Refresh token on initialization if we have a refresh token
		if (this.refreshToken) {
			await this.refreshAccessToken();
		}

		// Set up auto-refresh timer (refresh every 50 minutes)
		this.setupAutoRefresh();
	}

	/**
	 * Refresh the access token using the refresh token
	 */
	async refreshAccessToken(): Promise<boolean> {
		if (!this.refreshToken || !this.clientId || !this.clientSecret) {
			return false;
		}

		try {
			const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

			const response = await fetch("https://accounts.spotify.com/api/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Basic ${credentials}`,
				},
				body: new URLSearchParams({
					grant_type: "refresh_token",
					refresh_token: this.refreshToken,
				}),
			});

			if (!response.ok) {
				console.error("Failed to refresh token:", await response.text());
				return false;
			}

			const data = await response.json() as TokenResponse;
			this.accessToken = data.access_token;
			// Refresh token might be included in response
			if (data.refresh_token) {
				this.refreshToken = data.refresh_token;
			}
			this.expiresAt = Date.now() + (data.expires_in * 1000);

			return true;
		} catch (error) {
			console.error("Error refreshing token:", error);
			return false;
		}
	}

	/**
	 * Set up automatic token refresh
	 */
	private setupAutoRefresh(): void {
		// Clear existing timer
		if (this.refreshTimer) {
			clearInterval(this.refreshTimer);
		}

		// Refresh every 50 minutes
		this.refreshTimer = setInterval(() => {
			this.refreshAccessToken();
		}, 50 * 60 * 1000);
	}

	/**
	 * Make an authenticated request to Spotify API
	 */
	private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
		// Ensure token is still valid
		if (this.expiresAt && Date.now() >= this.expiresAt - 60000) {
			await this.refreshAccessToken();
		}

		const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
			...options,
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				...options.headers,
			},
		});

		// If unauthorized, try refreshing token once
		if (response.status === 401) {
			const refreshed = await this.refreshAccessToken();
			if (refreshed) {
				return fetch(`https://api.spotify.com/v1${endpoint}`, {
					...options,
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
						...options.headers,
					},
				});
			}
		}

		return response;
	}

	/**
	 * Get currently playing track with full player state
	 * This fetches /me/player which includes device, volume, shuffle, repeat state
	 */
	async getCurrentlyPlaying(): Promise<CurrentlyPlaying | null> {
		try {
			// Use /me/player instead of /me/player/currently-playing to get full state
			const response = await this.makeRequest("/me/player");

			if (response.status === 204) {
				// No content - nothing is playing
				return { isPlaying: false };
			}

			if (!response.ok) {
				console.error("Failed to get player state:", await response.text());
				return null;
			}

			const data = await response.json() as PlayerStateResponse;
			
			if (!data.item) {
				return { isPlaying: false };
			}

			const track = data.item;
			const albumArt = track.album?.images?.[0]?.url || track.album?.images?.[1]?.url;

			return {
				isPlaying: data.is_playing || false,
				track: {
					name: track.name,
					artists: track.artists.map((a) => a.name),
					album: track.album?.name || "",
					albumArtUrl: albumArt,
					uri: track.uri,
				},
				device: {
					volume_percent: data.device?.volume_percent
				},
				shuffleState: data.shuffle_state,
				repeatState: data.repeat_state
			};
		} catch (error) {
			console.error("Error getting player state:", error);
			return null;
		}
	}

	/**
	 * Play next track
	 */
	async nextTrack(): Promise<boolean> {
		try {
			const response = await this.makeRequest("/me/player/next", {
				method: "POST",
			});

			return response.ok || response.status === 204;
		} catch (error) {
			console.error("Error skipping to next track:", error);
			return false;
		}
	}

	/**
	 * Play previous track
	 */
	async previousTrack(): Promise<boolean> {
		try {
			const response = await this.makeRequest("/me/player/previous", {
				method: "POST",
			});

			return response.ok || response.status === 204;
		} catch (error) {
			console.error("Error going to previous track:", error);
			return false;
		}
	}

	/**
	 * Toggle play/pause
	 */
	async togglePlayPause(): Promise<boolean> {
		try {
			const currentlyPlaying = await this.getCurrentlyPlaying();

			if (currentlyPlaying?.isPlaying) {
				// Pause
				const response = await this.makeRequest("/me/player/pause", {
					method: "PUT",
				});
				return response.ok || response.status == 204;
			} else {
				// Play
				const response = await this.makeRequest("/me/player/play", {
					method: "PUT",
				});
				return response.ok || response.status == 204;
			}
		} catch (error) {
			console.error("Error toggling play/pause:", error);
			return false;
		}
	}

	/**
	 * Play a specific playlist
	 */
	async playPlaylist(playlistId: string): Promise<boolean> {
		try {
			const response = await this.makeRequest("/me/player/play", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					context_uri: `spotify:playlist:${playlistId}`,
				}),
			});

			return response.ok || response.status === 204;
		} catch (error) {
			console.error("Error playing playlist:", error);
			return false;
		}
	}

	/**
	 * Toggle shuffle mode
	 */
	async toggleShuffle(): Promise<boolean> {
		try {
			// First get current shuffle state
			const response = await this.makeRequest("/me/player");
			if (!response.ok) {
				return false;
			}

			const playerState = await response.json() as PlayerStateResponse;
			const currentShuffle = playerState.shuffle_state || false;

			// Toggle shuffle
			const toggleResponse = await this.makeRequest(`/me/player/shuffle?state=${!currentShuffle}`, {
				method: "PUT",
			});

			return toggleResponse.ok || toggleResponse.status === 204;
		} catch (error) {
			console.error("Error toggling shuffle:", error);
			return false;
		}
	}

	/**
	 * Set repeat mode (off, track, context)
	 */
	async setRepeatMode(mode: "off" | "track" | "context"): Promise<boolean> {
		try {
			const response = await this.makeRequest(`/me/player/repeat?state=${mode}`, {
				method: "PUT",
			});

			return response.ok || response.status === 204;
		} catch (error) {
			console.error("Error setting repeat mode:", error);
			return false;
		}
	}

	/**
	 * Clean up resources
	 */
	cleanup(): void {
		if (this.refreshTimer) {
			clearInterval(this.refreshTimer);
			this.refreshTimer = undefined;
		}
	}

	/**
	 * Save track to user's library (Like Song)
	 */
	async saveTrack(trackId: string): Promise<boolean> {
		try {
			const response = await this.makeRequest("/me/tracks", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					ids: [trackId],
				}),
			});

			return response.ok || response.status === 200;
		} catch (error) {
			console.error("Error saving track:", error);
			return false;
		}
	}

	/**
	 * Get current volume percentage
	 */
	async getCurrentVolume(): Promise<number | null> {
		try {
			const stateResponse = await this.makeRequest("/me/player");
			
			if (!stateResponse.ok) {
				console.error("Failed to get playback state for current volume");
				return null;
			}

			const state = await stateResponse.json() as PlayerStateResponse;
			return state.device?.volume_percent ?? null;
		} catch (error) {
			console.error("Error getting current volume:", error);
			return null;
		}
	}

	/**
	 * Adjust volume by a relative percentage
	 * @param percentageChange - Positive to increase, negative to decrease (e.g., 10 or -10)
	 */
	async adjustVolume(percentageChange: number): Promise<boolean> {
		try {
			// First, get current playback state to know current volume
			const stateResponse = await this.makeRequest("/me/player");
			
			if (!stateResponse.ok) {
				console.error("Failed to get playback state for volume adjustment");
				return false;
			}

			const state = await stateResponse.json() as PlayerStateResponse;
			const currentVolume = state.device?.volume_percent || 0;
			
			// Calculate new volume (clamp between 0 and 100)
			const newVolume = Math.max(0, Math.min(100, currentVolume + percentageChange));
			
			// Set the new volume
			const response = await this.makeRequest(`/me/player/volume?volume_percent=${newVolume}`, {
				method: "PUT",
			});

			return response.ok || response.status === 204;
		} catch (error) {
			console.error("Error adjusting volume:", error);
			return false;
		}
	}

	/**
	 * Set volume to a specific percentage
	 * @param volumePercent - Target volume (0-100)
	 */
	async setVolume(volumePercent: number): Promise<boolean> {
		try {
			// Clamp volume between 0 and 100
			const targetVolume = Math.max(0, Math.min(100, volumePercent));
			
			// Set the new volume
			const response = await this.makeRequest(`/me/player/volume?volume_percent=${targetVolume}`, {
				method: "PUT",
			});

			return response.ok || response.status === 204;
		} catch (error) {
			console.error("Error setting volume:", error);
			return false;
		}
	}

	/**
	 * Get user's playlists
	 */
	async getUserPlaylists(): Promise<Array<{ id: string; name: string; uri: string }>> {
		try {
			const response = await this.makeRequest("/me/playlists?limit=50");
			
			if (!response.ok) {
				console.error("Failed to get user playlists");
				return [];
			}

			const data = await response.json() as any;
			return data.items.map((playlist: any) => ({
				id: playlist.id,
				name: playlist.name,
				uri: playlist.uri
			}));
		} catch (error) {
			console.error("Error getting user playlists:", error);
			return [];
		}
	}

	/**
	 * Get current tokens for persistence
	 */
	getTokens(): SpotifyTokens {
		return {
			accessToken: this.accessToken,
			refreshToken: this.refreshToken,
			expiresAt: this.expiresAt,
		};
	}
}

