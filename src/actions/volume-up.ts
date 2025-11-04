import streamDeck, { action, KeyAction, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { SpotifyAPI, SpotifyAuthSettings } from "../services/spotify-api";
import { globalSettings } from "../services/global-settings";

/**
 * Settings for Volume Up action
 */
interface VolumeUpSettings extends SpotifyAuthSettings {
	volumeStep?: number; // Percentage to increase volume (default 10)
}

/**
 * Action to increase Spotify volume by a configurable percentage
 */
@action({ UUID: "com.jan-blmacher.spotifyremote.volume-up" })
export class VolumeUp extends SingletonAction<VolumeUpSettings> {
	private updateIntervals = new Map<string, NodeJS.Timeout>();

	override async onWillAppear(ev: WillAppearEvent<VolumeUpSettings>): Promise<void> {
		const action = ev.action as KeyAction<VolumeUpSettings>;
		const actionId = ev.action.id;

		// Set default volume step if not configured
		const settings = await ev.action.getSettings();
		if (settings.volumeStep === undefined) {
			settings.volumeStep = 10;
			await ev.action.setSettings(settings);
		}

		// Update volume display immediately
		await this.updateVolumeDisplay(action);

		// Set up interval to update volume every 2 seconds
		if (this.updateIntervals.has(actionId)) {
			clearInterval(this.updateIntervals.get(actionId)!);
		}

		const interval = setInterval(async () => {
			await this.updateVolumeDisplay(action);
		}, 2000); // Update every 2 seconds to sync with player state manager

		this.updateIntervals.set(actionId, interval);
	}

	override async onWillDisappear(ev: WillDisappearEvent<VolumeUpSettings>): Promise<void> {
		const actionId = ev.action.id;
		const interval = this.updateIntervals.get(actionId);
		if (interval) {
			clearInterval(interval);
			this.updateIntervals.delete(actionId);
		}
	}

	private async updateVolumeDisplay(action: KeyAction<VolumeUpSettings>): Promise<void> {
		try {
			const authSettings = await globalSettings.getSettings();
			
			if (!authSettings.clientId || !authSettings.clientSecret || !authSettings.accessToken || !authSettings.refreshToken) {
				await action.setTitle("Not\nConfigured");
				return;
			}

			const spotify = new SpotifyAPI(authSettings);
			await spotify.initialize(authSettings);
			const volume = await spotify.getCurrentVolume();

			if (volume !== null) {
				await action.setTitle(`${volume}%`);
			} else {
				await action.setTitle("--");
			}
		} catch (error) {
			streamDeck.logger.error('[VolumeUp] Error updating display:', error);
			await action.setTitle("Error");
		}
	}

	override async onKeyDown(ev: KeyDownEvent<VolumeUpSettings>): Promise<void> {
		const action = ev.action as KeyAction<VolumeUpSettings>;
		
		try {
			// Get settings from GLOBAL settings (shared across all actions)
			const authSettings = await globalSettings.getSettings();
			
			if (!authSettings.clientId || !authSettings.clientSecret || !authSettings.accessToken || !authSettings.refreshToken) {
				streamDeck.logger.warn('[VolumeUp] Missing required settings');
				return;
			}

			// Get action-specific volume step
			const actionSettings = await ev.action.getSettings();
			const volumeStep = actionSettings.volumeStep || 10;

			const spotify = new SpotifyAPI(authSettings);
			await spotify.initialize(authSettings);
			await spotify.adjustVolume(volumeStep);
			
			streamDeck.logger.info(`[VolumeUp] Increased volume by ${volumeStep}%`);

			// Update display immediately after adjusting
			setTimeout(async () => {
				await this.updateVolumeDisplay(action);
			}, 500);
		} catch (error) {
			streamDeck.logger.error('[VolumeUp] Error adjusting volume:', error);
		}
	}
}

