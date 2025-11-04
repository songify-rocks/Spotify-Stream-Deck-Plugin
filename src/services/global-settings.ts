/**
 * Global settings service to access Spotify auth settings across all actions
 */
import streamDeck from "@elgato/streamdeck";
import { SpotifyAuthSettings } from "./spotify-api";

export class GlobalSettingsService {
	private static instance: GlobalSettingsService;
	private cachedSettings: SpotifyAuthSettings = {};
	private initialized = false;

	private constructor() {
		// Listen for global settings changes
		streamDeck.settings.onDidReceiveGlobalSettings<SpotifyAuthSettings>((ev) => {
			console.log("Global settings received:", ev.settings);
			this.cachedSettings = ev.settings || {};
		});
	}

	static getInstance(): GlobalSettingsService {
		if (!GlobalSettingsService.instance) {
			GlobalSettingsService.instance = new GlobalSettingsService();
		}
		return GlobalSettingsService.instance;
	}

	async getSettings(): Promise<SpotifyAuthSettings> {
		if (!this.initialized) {
			streamDeck.logger.info('[GlobalSettings] First access - requesting global settings...');
			// Request global settings on first access
			await streamDeck.settings.getGlobalSettings();
			this.initialized = true;
			
			// Wait for settings to arrive (with retries)
			let retries = 0;
			while (Object.keys(this.cachedSettings).length === 0 && retries < 10) {
				await new Promise(resolve => setTimeout(resolve, 100));
				retries++;
			}
			
			if (Object.keys(this.cachedSettings).length > 0) {
				streamDeck.logger.info('[GlobalSettings] Settings loaded successfully');
			} else {
				streamDeck.logger.info(`[GlobalSettings] No settings found after ${retries} retries`);
			}
		}

		streamDeck.logger.trace('[GlobalSettings] Returning cached settings');
		return this.cachedSettings;
	}

	getCachedSettings(): SpotifyAuthSettings {
		return this.cachedSettings;
	}

	async setSettings(settings: SpotifyAuthSettings): Promise<void> {
		this.cachedSettings = settings;
		await streamDeck.settings.setGlobalSettings(settings);
	}
}

export const globalSettings = GlobalSettingsService.getInstance();

