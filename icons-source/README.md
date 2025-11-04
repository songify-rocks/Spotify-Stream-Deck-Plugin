# Icon Source Files

Place your SVG icon files in this folder with the following naming convention:

## Naming Convention

- `now-playing.svg` → Now Playing action
- `next.svg` → Next track action
- `previous.svg` → Previous track action
- `play-pause.svg` → Play/Pause toggle action
- `play-playlist.svg` → Play Playlist action
- `toggle-shuffle.svg` → Toggle Shuffle action
- `repeat-mode.svg` → Set Repeat Mode action
- `like-song.svg` → Like Song (Save to Library) action
- `volume-up.svg` → Volume Up action
- `volume-down.svg` → Volume Down action
- `category-icon.svg` → Plugin category icon
- `marketplace.svg` → Marketplace icon

## How to Use

1. Place your SVG files in this folder with the correct names
2. Run: `npm run convert-icons`
3. The script will automatically:
   - Convert each SVG to PNG in all required sizes
   - Place them in the correct action folders
   - Create both regular and @2x versions

## Required Sizes (automatically generated per Elgato guidelines)

**Action Icons:**
- `icon.png` - 20×20px (for actions list)
- `icon@2x.png` - 40×40px (for actions list @2x)
- `key.png` - 72×72px (for Stream Deck button)
- `key@2x.png` - 144×144px (for Stream Deck button @2x)

**Plugin Icons:**
- `category-icon.png` - 28×28px
- `category-icon@2x.png` - 46×46px (high DPI)
- `marketplace.png` - 256×256px (plugin icon)
- `marketplace@2x.png` - 512×512px (plugin icon, high DPI)

## Tips (Per Elgato Guidelines)

- **Use white (#FFFFFF)** for action list icons with transparent background
- **Monochromatic color scheme** - no colors for action list icons
- Use simple, clear icons that work well at small sizes
- Ensure SVGs have a square viewBox for best results
- Use solid fills rather than strokes when possible
- Test how they look at 72×72 size (the Stream Deck button size)
- **SVG is recommended** over PNG for best scaling

Reference: https://docs.elgato.com/guidelines/streamdeck/plugins/images-and-layouts

