# Play/Pause Action Icons

## Simple Setup

1. **Place TWO SVG files** in this folder:
   - `icon-play.svg` - Play icon (for paused state)
   - `icon-pause.svg` - Pause icon (for playing state)
   - Or name them `play.svg` and `pause.svg` - the script will find them

2. **Run the conversion**:
   ```bash
   npm run convert-icons
   ```

This will automatically generate:
- `icon.png` - 20x20 pixels (Property Inspector icon)
- `key-play.png` - 72x72 pixels (Play button - shown when paused)
- `key-pause.png` - 72x72 pixels (Pause button - shown when playing)
- `key-play@2x.png` & `key-pause@2x.png` - High-DPI variants

## Icon Behavior

- **State 0** (Playing): Shows pause icon
- **State 1** (Paused): Shows play icon

The icon automatically updates based on Spotify playback state.

## Suggested Icons

- **Play**: Play/right arrow icon
- **Pause**: Pause/two bars icon
