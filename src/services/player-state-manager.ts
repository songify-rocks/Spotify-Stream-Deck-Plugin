import streamDeck from "@elgato/streamdeck";
import { SpotifyAPI } from "./spotify-api";
import { globalSettings } from "./global-settings";

/**
 * Centralized manager for Spotify player state
 * Fetches data once and shares it across all actions to reduce API calls
 */
class PlayerStateManager {
    private static instance: PlayerStateManager;
    private currentState: any = null;
    private lastFetchTime: number = 0;
    private fetchInterval: NodeJS.Timeout | null = null;
    private spotifyAPI: SpotifyAPI | null = null;
    private isInitialized: boolean = false;

    private constructor() {}

    static getInstance(): PlayerStateManager {
        if (!PlayerStateManager.instance) {
            PlayerStateManager.instance = new PlayerStateManager();
        }
        return PlayerStateManager.instance;
    }

    /**
     * Initialize the manager and start fetching player state
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        streamDeck.logger.info('[PlayerStateManager] Initializing...');

        // Get settings and create Spotify API instance
        const settings = await globalSettings.getSettings();
        
        if (!settings.clientId || !settings.clientSecret || !settings.accessToken || !settings.refreshToken) {
            streamDeck.logger.warn('[PlayerStateManager] Missing authentication credentials');
            return;
        }

        this.spotifyAPI = new SpotifyAPI(settings);
        await this.spotifyAPI.initialize(settings);

        // Fetch immediately
        await this.fetchPlayerState();

        // Start periodic fetching (every 2 seconds)
        this.fetchInterval = setInterval(async () => {
            await this.fetchPlayerState();
        }, 2000);

        this.isInitialized = true;
        streamDeck.logger.info('[PlayerStateManager] ✓ Initialized and started periodic fetching');
    }

    /**
     * Stop fetching player state
     */
    stop(): void {
        if (this.fetchInterval) {
            clearInterval(this.fetchInterval);
            this.fetchInterval = null;
        }
        this.isInitialized = false;
        streamDeck.logger.info('[PlayerStateManager] Stopped');
    }

    /**
     * Fetch current player state from Spotify
     */
    private async fetchPlayerState(): Promise<void> {
        try {
            if (!this.spotifyAPI) {
                // Re-initialize if needed
                const settings = await globalSettings.getSettings();
                if (settings.clientId && settings.clientSecret && settings.accessToken && settings.refreshToken) {
                    this.spotifyAPI = new SpotifyAPI(settings);
                    await this.spotifyAPI.initialize(settings);
                } else {
                    return;
                }
            }

            // Fetch player state
            const currentlyPlaying = await this.spotifyAPI.getCurrentlyPlaying();
            
            // Update cache
            this.currentState = currentlyPlaying;
            this.lastFetchTime = Date.now();

            streamDeck.logger.trace('[PlayerStateManager] Player state updated:', {
                isPlaying: currentlyPlaying?.isPlaying,
                trackUri: currentlyPlaying?.track?.uri,
                volume: currentlyPlaying?.device?.volume_percent
            });
        } catch (error) {
            streamDeck.logger.error('[PlayerStateManager] Error fetching player state:', error);
            // Don't clear the state on error, keep the last known good state
        }
    }

    /**
     * Get the current cached player state
     * @param maxAge Maximum age in milliseconds before considering data stale (default: 5000ms)
     */
    async getPlayerState(maxAge: number = 5000): Promise<any> {
        // If we don't have any state yet, try to fetch immediately
        if (!this.currentState) {
            await this.fetchPlayerState();
        }

        // Check if data is too old
        const age = Date.now() - this.lastFetchTime;
        if (age > maxAge) {
            streamDeck.logger.warn(`[PlayerStateManager] Cached data is ${age}ms old, consider it stale`);
        }

        return this.currentState;
    }

    /**
     * Get specific track information from cached state
     */
    async getCurrentTrack(): Promise<any> {
        const state = await this.getPlayerState();
        return state?.track || null;
    }

    /**
     * Get playback state (playing/paused)
     */
    async isPlaying(): Promise<boolean> {
        const state = await this.getPlayerState();
        return state?.isPlaying || false;
    }

    /**
     * Get current volume
     */
    async getVolume(): Promise<number | null> {
        const state = await this.getPlayerState();
        return state?.device?.volume_percent ?? null;
    }

    /**
     * Get shuffle state
     */
    async getShuffleState(): Promise<boolean> {
        const state = await this.getPlayerState();
        return state?.shuffleState || false;
    }

    /**
     * Get repeat state
     */
    async getRepeatState(): Promise<string> {
        const state = await this.getPlayerState();
        return state?.repeatState || 'off';
    }

    /**
     * Force a refresh of the player state (useful after performing an action)
     */
    async refresh(): Promise<void> {
        streamDeck.logger.info('[PlayerStateManager] Manual refresh requested');
        await this.fetchPlayerState();
    }

    /**
     * Get the Spotify API instance for performing actions
     * (read operations should use cached state, but write operations need the API)
     */
    getSpotifyAPI(): SpotifyAPI | null {
        return this.spotifyAPI;
    }

    /**
     * Check if the manager is initialized and ready
     */
    isReady(): boolean {
        return this.isInitialized;
    }
}

export const playerStateManager = PlayerStateManager.getInstance();

