# Icons Guide for Spotify Remote Stream Deck Plugin

## Current Status
✅ All folders are created with placeholder icons (from the counter example)
✅ Plugin should now load without icon errors

## Icon Requirements

Stream Deck requires specific icon sizes:

### Action Icons (in each action folder)
- **icon.png**: 20x20px (shown in actions list)
- **icon@2x.png**: 40x40px (shown in actions list @2x resolution)
- **key.png**: 72x72px (shown on Stream Deck button)
- **key@2x.png**: 144x144px (shown on Stream Deck button @2x resolution)

### Plugin Icons (in imgs/plugin folder)
- **category-icon.png**: 28x28px
- **category-icon@2x.png**: 56x56px
- **marketplace.png**: 72x72px
- **marketplace@2x.png**: 144x144px

## Creating Custom Icons

### Option 1: Use Spotify Brand Icons
Download official Spotify brand assets:
- Visit: https://developer.spotify.com/documentation/design
- Use the Spotify green (#1DB954) as the primary color
- Follow Spotify's brand guidelines

### Option 2: Use Free Icon Libraries
- **Font Awesome**: https://fontawesome.com/search?q=music
- **Material Icons**: https://fonts.google.com/icons
- **Heroicons**: https://heroicons.com/

### Option 3: Design Your Own
Recommended tools:
- **Figma** (free, web-based)
- **Inkscape** (free, desktop)
- **Adobe Illustrator** (paid)

### Suggested Icon Designs

**Now Playing** 🎵
- Musical note with equalizer bars
- Album disc icon
- Play icon with waves

**Next** ⏭️
- Forward skip icon (two right triangles with a bar)
- Right double arrow

**Previous** ⏮️
- Backward skip icon (two left triangles with a bar)
- Left double arrow

**Play/Pause** ⏯️
- Play triangle and pause bars combined
- Or create two states (one for play, one for pause)

**Play Playlist** 📋
- List with play button
- Playlist icon with musical notes

**Toggle Shuffle** 🔀
- Crossed arrows
- Random/shuffle icon

**Repeat Mode** 🔁
- Circular arrows (repeat icon)
- Loop icon

## Quick Fix: Use Emojis
For a quick temporary solution, you can create simple icons with emojis:
1. Open Paint or any image editor
2. Set canvas to required size (72x72 or 144x144)
3. Fill with dark background (#1a1a1a or #2d2d2d)
4. Add emoji/symbol in white or Spotify green
5. Save as PNG

## Converting SVG to PNG
If you have SVG icons:
1. Use online converters: https://cloudconvert.com/svg-to-png
2. Or use Inkscape: File → Export PNG Image
3. Set the correct dimensions for each icon type

## Current Placeholder Icons
The plugin currently uses the counter example icons as placeholders.
These work functionally but should be replaced with Spotify-themed icons for a professional look.

## Testing Icons
After replacing icons:
1. Reload the plugin in Stream Deck
2. Check the actions list - icons should appear there
3. Drag actions to Stream Deck - key icons should appear on buttons
4. Icons should be clear and recognizable at small sizes


