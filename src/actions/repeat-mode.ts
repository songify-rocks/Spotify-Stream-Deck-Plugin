import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { SpotifyAPI, SpotifyAuthSettings } from "../services/spotify-api";
import { globalSettings } from "../services/global-settings";

/**
 * Settings for repeat mode action
 */
type RepeatModeSettings = SpotifyAuthSettings & {
	repeatMode?: "off" | "track" | "context";
};

/**
 * Action to set repeat mode
 */
@action({ UUID: "com.jan-blmacher.spotifyremote.repeat-mode" })
export class RepeatMode extends SingletonAction<RepeatModeSettings> {
	override async onKeyDown(ev: KeyDownEvent<RepeatModeSettings>): Promise<void> {
		// Get auth settings from global settings
		const authSettings = await globalSettings.getSettings();
		// Get repeat mode from action settings
		const actionSettings = ev.payload.settings;
		
		// Merge them
		const settings = { ...authSettings, repeatMode: actionSettings.repeatMode };
		
		if (!settings.clientId || !settings.clientSecret || !settings.accessToken || !settings.refreshToken) {
			await ev.action.showAlert();
			return;
		}

		const mode = settings.repeatMode || "off";

		const spotify = new SpotifyAPI(settings);
		await spotify.initialize(settings);

		const success = await spotify.setRepeatMode(mode);
		if (!success) {
			await ev.action.showAlert();
		} else {
			await ev.action.showOk();
		}
	}
}

