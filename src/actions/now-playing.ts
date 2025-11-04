import streamDeck, { action, KeyAction, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { SpotifyAPI, SpotifyAuthSettings } from "../services/spotify-api";
import { globalSettings } from "../services/global-settings";
import https from "https";
import http from "http";

/**
 * Action that displays the currently playing track on Spotify
 */
@action({ UUID: "com.jan-blmacher.spotifyremote.now-playing" })
export class NowPlaying extends SingletonAction<SpotifyAuthSettings> {
	private updateIntervals = new Map<string, NodeJS.Timeout>();
	private marqueeIntervals = new Map<string, NodeJS.Timeout>();
	private trackData = new Map<string, { trackName: string; artistName: string; albumArtUrl?: string; scrollPosition: number; trackUri: string }>();

	override async onWillAppear(ev: WillAppearEvent<SpotifyAuthSettings>): Promise<void> {
		const action = ev.action as KeyAction<SpotifyAuthSettings>;
		const actionId = ev.action.id;
		
		await this.updateDisplay(action);
		
		// Set up interval to update track info every 5 seconds
		if (this.updateIntervals.has(actionId)) {
			clearInterval(this.updateIntervals.get(actionId)!);
		}
		
		const interval = setInterval(async () => {
			streamDeck.logger.info('[NowPlaying] 5-second interval triggered, updating display...');
			await this.updateDisplay(action);
		}, 5000);
		
		this.updateIntervals.set(actionId, interval);
		
		// Set up marquee interval to scroll text every 500ms
		if (this.marqueeIntervals.has(actionId)) {
			clearInterval(this.marqueeIntervals.get(actionId)!);
		}
		
		const marqueeInterval = setInterval(() => {
			this.updateMarquee(action, actionId);
		}, 500);
		
		this.marqueeIntervals.set(actionId, marqueeInterval);
	}

	override async onWillDisappear(ev: WillDisappearEvent<SpotifyAuthSettings>): Promise<void> {
		const actionId = ev.action.id;
		
		// Clear update interval
		const interval = this.updateIntervals.get(actionId);
		if (interval) {
			clearInterval(interval);
			this.updateIntervals.delete(actionId);
		}
		
		// Clear marquee interval
		const marqueeInterval = this.marqueeIntervals.get(actionId);
		if (marqueeInterval) {
			clearInterval(marqueeInterval);
			this.marqueeIntervals.delete(actionId);
		}
		
		// Clear track data
		this.trackData.delete(actionId);
	}

	private async updateDisplay(action: KeyAction<SpotifyAuthSettings>): Promise<void> {
		try {
			// Get settings from GLOBAL settings (shared across all actions)
			const settings = await globalSettings.getSettings();
			console.log('[NowPlaying] Retrieved settings:', { 
				hasClientId: !!settings.clientId, 
				hasClientSecret: !!settings.clientSecret,
				hasAccessToken: !!settings.accessToken, 
				hasRefreshToken: !!settings.refreshToken 
			});
			
			if (!settings.clientId || !settings.clientSecret || !settings.accessToken || !settings.refreshToken) {
				console.log('[NowPlaying] Missing required settings');
				await action.setTitle("Not Configured");
				await action.setImage("");
				this.trackData.delete(action.id);
				return;
			}

			console.log('[NowPlaying] Initializing Spotify API...');
			const spotify = new SpotifyAPI(settings);
			await spotify.initialize(settings);

			console.log('[NowPlaying] Getting currently playing track...');
			const currentlyPlaying = await spotify.getCurrentlyPlaying();

			if (!currentlyPlaying) {
				console.log('[NowPlaying] API returned no data');
				await action.setTitle("Error");
				await action.setImage("");
				this.trackData.delete(action.id);
				return;
			}

			if (!currentlyPlaying.track) {
				console.log('[NowPlaying] No track currently playing');
				await action.setTitle("No Track\nPlaying");
				await action.setImage("");
				this.trackData.delete(action.id);
				return;
			}

			const track = currentlyPlaying.track;
			
			// Check if this is a new song or if we need to update the data
			const existingData = this.trackData.get(action.id);
			streamDeck.logger.info(`[NowPlaying] Current track URI: ${track.uri}`);
			streamDeck.logger.info(`[NowPlaying] Stored track URI: ${existingData?.trackUri || 'none'}`);
			const isNewSong = !existingData || existingData.trackUri !== track.uri;
			streamDeck.logger.info(`[NowPlaying] Is new song: ${isNewSong}`);
			
			if (isNewSong) {
				streamDeck.logger.info(`[NowPlaying] New song detected: ${track.name}`);
				streamDeck.logger.info(`[NowPlaying] Album art URL: ${track.albumArtUrl}`);
				
				// Store track data for marquee (reset scroll position for new song)
				this.trackData.set(action.id, {
					trackName: track.name,
					artistName: track.artists.join(", "),
					albumArtUrl: track.albumArtUrl,
					trackUri: track.uri,
					scrollPosition: 0
				});
				
				// Set album art as background image FIRST
				if (track.albumArtUrl) {
					streamDeck.logger.info('[NowPlaying] Fetching album art from URL...');
					streamDeck.logger.info('[NowPlaying] URL:', track.albumArtUrl);
					
					try {
						// Fetch and convert to base64
						const base64Image = await this.fetchImageAsBase64(track.albumArtUrl);
						streamDeck.logger.info('[NowPlaying] Image converted to base64, length:', base64Image.length);
						
						// Clear title first to ensure image shows
						await action.setTitle("");
						await action.setImage(base64Image);
						streamDeck.logger.info('[NowPlaying] Album art set successfully');
					} catch (imageError) {
						streamDeck.logger.error('[NowPlaying] Failed to fetch/set album art:', imageError);
						await action.setImage("");
					}
				} else {
					streamDeck.logger.warn('[NowPlaying] No album art available');
					await action.setImage("");
				}
				
				// Then set the title with marquee (after a tiny delay to ensure image loads)
				await new Promise(resolve => setTimeout(resolve, 50));
				this.updateMarquee(action, action.id);
			} else {
				streamDeck.logger.trace('[NowPlaying] Same song, keeping marquee position');
				// Just update the album art in case it changed, but keep scroll position
				if (track.albumArtUrl && track.albumArtUrl !== existingData.albumArtUrl) {
					streamDeck.logger.info('[NowPlaying] Album art changed, updating...');
					try {
						const base64Image = await this.fetchImageAsBase64(track.albumArtUrl);
						await action.setImage(base64Image);
						existingData.albumArtUrl = track.albumArtUrl;
					} catch (imageError) {
						streamDeck.logger.error('[NowPlaying] Failed to update album art:', imageError);
					}
				}
			}
		} catch (error) {
			console.error('[NowPlaying] Error updating display:', error);
			await action.setTitle("Error");
			await action.setImage("");
			this.trackData.delete(action.id);
		}
	}

	/**
	 * Fetch an image from a URL and convert it to a base64 data URI
	 */
	private async fetchImageAsBase64(imageUrl: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const client = imageUrl.startsWith('https') ? https : http;
			
			client.get(imageUrl, (response) => {
				if (response.statusCode !== 200) {
					reject(new Error(`Failed to fetch image: ${response.statusCode}`));
					return;
				}
				
				const chunks: any[] = [];
				
				response.on('data', (chunk: any) => {
					chunks.push(chunk);
				});
				
				response.on('end', () => {
					const buffer = Buffer.concat(chunks);
					const base64 = buffer.toString('base64');
					const mimeType = response.headers['content-type'] || 'image/jpeg';
					const dataUri = `data:${mimeType};base64,${base64}`;
					resolve(dataUri);
				});
			}).on('error', (error) => {
				reject(error);
			});
		});
	}

	private updateMarquee(action: KeyAction<SpotifyAuthSettings>, actionId: string): void {
		const data = this.trackData.get(actionId);
		if (!data) {
			return;
		}

		const { trackName, artistName, scrollPosition } = data;
		const fullText = `${artistName} - ${trackName}`;
		
		// If text is 7 characters or less, just show it
		if (fullText.length <= 7) {
			action.setTitle(fullText).catch(console.error);
			return;
		}

		// Add 5 spaces at the end for smooth loop and visual separation
		const paddedText = fullText + "     ";
		const visibleText = paddedText.substring(scrollPosition, scrollPosition + 7);
		
		// Update scroll position
		data.scrollPosition = (scrollPosition + 1) % paddedText.length;
		
		// Update the title
		action.setTitle(visibleText).catch(console.error);
	}
}

