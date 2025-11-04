import streamDeck, { action, KeyAction, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { SpotifyAPI, SpotifyAuthSettings } from "../services/spotify-api";
import { globalSettings } from "../services/global-settings";

interface SetVolumeSettings {
    targetVolume?: number | string; // Target volume (0-100) - can be string from HTML form
    [key: string]: any; // Index signature for JsonObject compatibility
}

@action({ UUID: "com.jan-blmacher.spotifyremote.set-volume" })
export class SetVolume extends SingletonAction<SetVolumeSettings> {
    private updateIntervals = new Map<string, NodeJS.Timeout>();

    override async onWillAppear(ev: WillAppearEvent<SetVolumeSettings>): Promise<void> {
        const action = ev.action as KeyAction<SetVolumeSettings>;
        const actionId = ev.action.id;
        const settings = await action.getSettings();

        // Set default volume if not configured
        if (settings.targetVolume === undefined) {
            await action.setSettings({
                ...settings,
                targetVolume: 50
            });
        }

        // Update volume display immediately
        await this.updateVolumeDisplay(action);

        // Set up interval to update volume display every 2 seconds
        if (this.updateIntervals.has(actionId)) {
            clearInterval(this.updateIntervals.get(actionId)!);
        }

        const interval = setInterval(async () => {
            await this.updateVolumeDisplay(action);
        }, 2000); // Update every 2 seconds to sync with player state manager

        this.updateIntervals.set(actionId, interval);
    }

    override async onWillDisappear(ev: WillDisappearEvent<SetVolumeSettings>): Promise<void> {
        const actionId = ev.action.id;
        const interval = this.updateIntervals.get(actionId);
        if (interval) {
            clearInterval(interval);
            this.updateIntervals.delete(actionId);
        }
    }

    private async updateVolumeDisplay(action: KeyAction<SetVolumeSettings>): Promise<void> {
        try {
            const settings = await action.getSettings();
            const authSettings = await globalSettings.getSettings();
            
            if (!authSettings.clientId || !authSettings.clientSecret || !authSettings.accessToken || !authSettings.refreshToken) {
                await action.setTitle("Not\nConfigured");
                return;
            }

            const spotify = new SpotifyAPI(authSettings);
            await spotify.initialize(authSettings);
            const currentVolume = await spotify.getCurrentVolume();

            // Display target volume with arrow indicator
            let targetVolume = 50;
            if (settings.targetVolume !== undefined && settings.targetVolume !== null) {
                const parsed = Number(settings.targetVolume);
                if (!isNaN(parsed)) {
                    targetVolume = parsed;
                }
            }
            
            if (currentVolume !== null) {
                await action.setTitle(`→${targetVolume}%\n(${currentVolume}%)`);
            } else {
                await action.setTitle(`→${targetVolume}%`);
            }
        } catch (error) {
            streamDeck.logger.error('[SetVolume] Error updating display:', error);
            await action.setTitle("Error");
        }
    }

    override async onKeyDown(ev: KeyDownEvent<SetVolumeSettings>): Promise<void> {
        const action = ev.action as KeyAction<SetVolumeSettings>;
        const settings = await action.getSettings();
        const authSettings = await globalSettings.getSettings();
        
        if (!authSettings.clientId || !authSettings.clientSecret || !authSettings.accessToken || !authSettings.refreshToken) {
            await action.showAlert();
            return;
        }

        // Handle targetVolume - convert to number and ensure 0 is treated as valid
        let targetVolume: number;
        if (settings.targetVolume !== undefined && settings.targetVolume !== null) {
            const parsed = Number(settings.targetVolume);
            // Check if it's a valid number (including 0)
            if (!isNaN(parsed)) {
                targetVolume = parsed;
            } else {
                targetVolume = 50; // Default if not a valid number
            }
        } else {
            targetVolume = 50; // Default if undefined/null
        }

        const spotify = new SpotifyAPI(authSettings);
        await spotify.initialize(authSettings);

        try {
            // Set volume to target value
            const success = await spotify.setVolume(targetVolume);

            if (success) {
                await action.showOk();
                
                // Update display after short delay
                setTimeout(async () => {
                    await this.updateVolumeDisplay(action);
                }, 500);
            } else {
                streamDeck.logger.error('[SetVolume] Failed to set volume');
                await action.showAlert();
            }
        } catch (error) {
            streamDeck.logger.error('[SetVolume] Error setting volume:', error);
            await action.showAlert();
        }
    }
}

