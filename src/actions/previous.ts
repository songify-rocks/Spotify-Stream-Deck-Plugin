import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { SpotifyAPI, SpotifyAuthSettings } from "../services/spotify-api";
import { globalSettings } from "../services/global-settings";

/**
 * Action to go to the previous track
 */
@action({ UUID: "com.jan-blmacher.spotifyremote.previous" })
export class PreviousTrack extends SingletonAction<SpotifyAuthSettings> {
	override async onKeyDown(ev: KeyDownEvent<SpotifyAuthSettings>): Promise<void> {
		const settings = await globalSettings.getSettings();
		
		if (!settings.clientId || !settings.clientSecret || !settings.accessToken || !settings.refreshToken) {
			await ev.action.showAlert();
			return;
		}

		const spotify = new SpotifyAPI(settings);
		await spotify.initialize(settings);

		const success = await spotify.previousTrack();
		if (!success) {
			await ev.action.showAlert();
		} else {
			await ev.action.showOk();
		}
	}
}

