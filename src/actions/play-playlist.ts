import streamDeck, { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { SpotifyAPI, SpotifyAuthSettings } from "../services/spotify-api";
import { globalSettings } from "../services/global-settings";

/**
 * Settings for play playlist action
 */
type PlayPlaylistSettings = SpotifyAuthSettings & {
	playlistId?: string;
};

/**
 * Action to play a specific playlist
 */
@action({ UUID: "com.jan-blmacher.spotifyremote.play-playlist" })
export class PlayPlaylist extends SingletonAction<PlayPlaylistSettings> {
	/**
	 * Extract playlist ID from Spotify URL or return the ID as-is
	 * Supports formats:
	 * - https://open.spotify.com/playlist/37i9dQZF1EQpgT26jgbgRI?si=...
	 * - spotify:playlist:37i9dQZF1EQpgT26jgbgRI
	 * - 37i9dQZF1EQpgT26jgbgRI (plain ID)
	 */
	private extractPlaylistId(input: string): string {
		if (!input) return '';

		const trimmed = input.trim();

		// Handle Spotify URL: https://open.spotify.com/playlist/ID or https://open.spotify.com/playlist/ID?si=...
		const urlMatch = trimmed.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
		if (urlMatch) {
			return urlMatch[1];
		}

		// Handle Spotify URI: spotify:playlist:ID
		const uriMatch = trimmed.match(/spotify:playlist:([a-zA-Z0-9]+)/);
		if (uriMatch) {
			return uriMatch[1];
		}

		// Assume it's already just the ID
		return trimmed;
	}

	override async onKeyDown(ev: KeyDownEvent<PlayPlaylistSettings>): Promise<void> {
		try {
			// Get auth settings from global settings
			const authSettings = await globalSettings.getSettings();
			// Get playlist ID/URL from action settings
			const actionSettings = ev.payload.settings;
			
			if (!authSettings.clientId || !authSettings.clientSecret || !authSettings.accessToken || !authSettings.refreshToken) {
				streamDeck.logger.warn('[PlayPlaylist] Missing authentication settings');
				await ev.action.showAlert();
				return;
			}

			const playlistInput = actionSettings.playlistId;
			if (!playlistInput) {
				streamDeck.logger.warn('[PlayPlaylist] No playlist ID/URL configured');
				await ev.action.showAlert();
				return;
			}

			// Extract ID from URL or use as-is
			const playlistId = this.extractPlaylistId(playlistInput);

			if (!playlistId) {
				streamDeck.logger.warn('[PlayPlaylist] Could not extract playlist ID from:', playlistInput);
				await ev.action.showAlert();
				return;
			}

			streamDeck.logger.info('[PlayPlaylist] Playing playlist:', playlistId, 'from input:', playlistInput);

			const spotify = new SpotifyAPI(authSettings);
			await spotify.initialize(authSettings);

			const success = await spotify.playPlaylist(playlistId);
			if (!success) {
				await ev.action.showAlert();
			} else {
				await ev.action.showOk();
			}
		} catch (error) {
			streamDeck.logger.error('[PlayPlaylist] Error playing playlist:', error);
			await ev.action.showAlert();
		}
	}
}

