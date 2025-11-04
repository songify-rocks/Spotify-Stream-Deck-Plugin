import streamDeck, { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { SpotifyAPI, SpotifyAuthSettings } from "../services/spotify-api";
import { globalSettings } from "../services/global-settings";

/**
 * Action to skip to the next track on Spotify
 */
@action({ UUID: "com.jan-blmacher.spotifyremote.next" })
export class NextTrack extends SingletonAction<SpotifyAuthSettings> {
	override async onKeyDown(ev: KeyDownEvent<SpotifyAuthSettings>): Promise<void> {
		try {
			// Get settings from GLOBAL settings (shared across all actions)
			const settings = await globalSettings.getSettings();
			
			if (!settings.clientId || !settings.clientSecret || !settings.accessToken || !settings.refreshToken) {
				streamDeck.logger.warn('[NextTrack] Missing required settings');
				return;
			}

			const spotify = new SpotifyAPI(settings);
			await spotify.initialize(settings);
			await spotify.nextTrack();
			
			streamDeck.logger.info('[NextTrack] Skipped to next track');
		} catch (error) {
			streamDeck.logger.error('[NextTrack] Error skipping track:', error);
		}
	}
}
