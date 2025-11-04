import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { NowPlaying } from "./actions/now-playing";
import { NextTrack } from "./actions/next";
import { PreviousTrack } from "./actions/previous";
import { PlayPause } from "./actions/play-pause";
import { PlayPlaylist } from "./actions/play-playlist";
import { ToggleShuffle } from "./actions/toggle-shuffle";
import { RepeatMode } from "./actions/repeat-mode";
import { LikeSong } from "./actions/like-song";
import { VolumeUp } from "./actions/volume-up";
import { VolumeDown } from "./actions/volume-down";
import { SetVolume } from "./actions/set-volume";
import { oauthServer } from "./services/oauth-server";
import { playerStateManager } from "./services/player-state-manager";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel(LogLevel.TRACE);

// Register all Spotify actions
streamDeck.actions.registerAction(new NowPlaying());
streamDeck.actions.registerAction(new NextTrack());
streamDeck.actions.registerAction(new PreviousTrack());
streamDeck.actions.registerAction(new PlayPause());
streamDeck.actions.registerAction(new PlayPlaylist());
streamDeck.actions.registerAction(new ToggleShuffle());
streamDeck.actions.registerAction(new RepeatMode());
streamDeck.actions.registerAction(new LikeSong());
streamDeck.actions.registerAction(new VolumeUp());
streamDeck.actions.registerAction(new VolumeDown());
streamDeck.actions.registerAction(new SetVolume());

// Listen for OAuth server start request from property inspector
streamDeck.ui.onSendToPlugin(async (ev) => {
	streamDeck.logger.info('[Plugin] Received message from UI:', JSON.stringify(ev.payload));
	
	const payload = ev.payload as any;
	if (payload?.event === 'startOAuthServer') {
		streamDeck.logger.info('[Plugin] ✓ OAuth server start request received');
		const { clientId, clientSecret } = payload.payload;
		
		streamDeck.logger.info(`[Plugin] Client ID: ${clientId?.substring(0, 8)}...`);
		streamDeck.logger.info(`[Plugin] Client Secret: ${clientSecret ? 'provided' : 'MISSING'}`);
		
		try {
			streamDeck.logger.info('[Plugin] Calling oauthServer.start()...');
			await oauthServer.start(clientId, clientSecret);
			streamDeck.logger.info('[Plugin] ✓ OAuth server started successfully!');
		} catch (error) {
			streamDeck.logger.error('[Plugin] ✗ Failed to start OAuth server:', error);
			streamDeck.logger.error('[Plugin] Error details:', JSON.stringify(error));
		}
	} else {
		streamDeck.logger.warn('[Plugin] Received unknown event:', payload?.event);
	}
});

// Finally, connect to the Stream Deck.
streamDeck.connect();

// Initialize the player state manager (will auto-initialize when credentials are available)
setTimeout(async () => {
    streamDeck.logger.info('[Plugin] Initializing player state manager...');
    await playerStateManager.initialize();
}, 1000);
