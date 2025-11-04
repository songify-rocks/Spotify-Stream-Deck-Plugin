import streamDeck, { action, KeyAction, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { SpotifyAPI, SpotifyAuthSettings } from "../services/spotify-api";
import { globalSettings } from "../services/global-settings";

/**
 * Action to toggle play/pause on Spotify
 * State 0 = Paused (show Play icon)
 * State 1 = Playing (show Pause icon)
 */
@action({ UUID: "com.jan-blmacher.spotifyremote.play-pause" })
export class PlayPause extends SingletonAction<SpotifyAuthSettings> {
	private updateIntervals = new Map<string, NodeJS.Timeout>();

	override async onWillAppear(ev: WillAppearEvent<SpotifyAuthSettings>): Promise<void> {
		const action = ev.action as KeyAction<SpotifyAuthSettings>;
		const actionId = ev.action.id;

		// Update state immediately
		await this.updatePlaybackState(action);

		// Set up interval to update state every 2 seconds
		if (this.updateIntervals.has(actionId)) {
			clearInterval(this.updateIntervals.get(actionId)!);
		}

		const interval = setInterval(async () => {
			await this.updatePlaybackState(action);
		}, 2000);

		this.updateIntervals.set(actionId, interval);
	}

	override async onWillDisappear(ev: WillDisappearEvent<SpotifyAuthSettings>): Promise<void> {
		const actionId = ev.action.id;
		const interval = this.updateIntervals.get(actionId);
		if (interval) {
			clearInterval(interval);
			this.updateIntervals.delete(actionId);
		}
	}

	private async updatePlaybackState(action: KeyAction<SpotifyAuthSettings>): Promise<void> {
		try {
			const settings = await globalSettings.getSettings();
			
			if (!settings.clientId || !settings.clientSecret || !settings.accessToken || !settings.refreshToken) {
				return;
			}

			const spotify = new SpotifyAPI(settings);
			await spotify.initialize(settings);
			const currentlyPlaying = await spotify.getCurrentlyPlaying();

			if (currentlyPlaying) {
				// State 0 = Paused (show Play icon)
				// State 1 = Playing (show Pause icon)
				const newState = currentlyPlaying.isPlaying ? 1 : 0;
				await action.setState(newState);
			}
		} catch (error) {
			streamDeck.logger.error('[PlayPause] Error updating playback state:', error);
		}
	}

	override async onKeyDown(ev: KeyDownEvent<SpotifyAuthSettings>): Promise<void> {
		const action = ev.action as KeyAction<SpotifyAuthSettings>;
		
		try {
			const settings = await globalSettings.getSettings();
			
			if (!settings.clientId || !settings.clientSecret || !settings.accessToken || !settings.refreshToken) {
				await ev.action.showAlert();
				return;
			}

			const spotify = new SpotifyAPI(settings);
			await spotify.initialize(settings);

			const success = await spotify.togglePlayPause();
			if (!success) {
				await ev.action.showAlert();
			} else {
				await ev.action.showOk();
			}

			// Update state immediately after toggling
			setTimeout(async () => {
				await this.updatePlaybackState(action);
			}, 500);
		} catch (error) {
			streamDeck.logger.error('[PlayPause] Error toggling play/pause:', error);
			await ev.action.showAlert();
		}
	}
}
