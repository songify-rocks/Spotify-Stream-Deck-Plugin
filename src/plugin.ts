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

// Finally, connect to the Stream Deck.
streamDeck.connect();
