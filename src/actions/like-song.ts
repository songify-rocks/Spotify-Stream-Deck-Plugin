import streamDeck, { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { SpotifyAPI, SpotifyAuthSettings } from "../services/spotify-api";
import { globalSettings } from "../services/global-settings";

/**
 * Action to save the currently playing track to the user's library (Like Song)
 */
@action({ UUID: "com.jan-blmacher.spotifyremote.like-song" })
export class LikeSong extends SingletonAction<SpotifyAuthSettings> {
	override async onKeyDown(ev: KeyDownEvent<SpotifyAuthSettings>): Promise<void> {
		try {
			// Get settings from GLOBAL settings (shared across all actions)
			const settings = await globalSettings.getSettings();
			
			if (!settings.clientId || !settings.clientSecret || !settings.accessToken || !settings.refreshToken) {
				streamDeck.logger.warn('[LikeSong] Missing required settings');
				return;
			}

			const spotify = new SpotifyAPI(settings);
			await spotify.initialize(settings);
			
			// Get currently playing track
			const currentTrack = await spotify.getCurrentlyPlaying();
			
			if (!currentTrack || !currentTrack.track) {
				streamDeck.logger.warn('[LikeSong] No track currently playing');
				return;
			}
			
			// Extract track ID from URI (spotify:track:ID)
			const trackId = currentTrack.track.uri.split(':')[2];
			
			// Save the track
			await spotify.saveTrack(trackId);
			
			streamDeck.logger.info('[LikeSong] Track saved to library:', currentTrack.track.name);
		} catch (error) {
			streamDeck.logger.error('[LikeSong] Error saving track:', error);
		}
	}
}

