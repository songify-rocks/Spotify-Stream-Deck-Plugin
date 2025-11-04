# Icon Requirements

This plugin requires icon images for each action. Place the following icon files:

## Required Icons

### Root Level
- `icon.png` - Main plugin icon (72x72 pixels)
- `category.png` - Category icon (72x72 pixels)

### Action Icons (in respective action folders)
Each action folder under `actions/` needs:
- `icon.png` - Action icon (20x20 pixels for Property Inspector)
- `key.png` - Key image (72x72 pixels for Stream Deck button)

### Action Folders
- `actions/currently-playing/`
- `actions/next/`
- `actions/previous/`
- `actions/volume-up/`
- `actions/volume-down/`
- `actions/play-playlist/`
- `actions/like-song/`
- `actions/repeat-mode/`

## Icon Specifications

- **Format**: SVG (recommended) or PNG with transparency
- **Resolution**: 
  - Plugin/Category icons: 72x72px (or 144x144px for high DPI)
  - Action icons: 20x20px (Property Inspector)
  - Key images: 72x72px (or 144x144px for high DPI)
- **Style**: Simple, recognizable icons that match Stream Deck's design language
- **Color**: Monochromatic with white stroke (#FFFFFF) for action list icons
- **Background**: Transparent

### SVG vs PNG

**SVG (Recommended)**:
- Scalable and crisp at any resolution
- Smaller file size
- Better for high-DPI displays
- Use `.svg` extension

**PNG**:
- Raster format (fixed resolution)
- Requires high-DPI variants (2x size) for sharp display
- Use `.png` extension
- Ensure transparency is preserved

## Resources

You can use free icon resources like:
- [Feather Icons](https://feathericons.com/)
- [Heroicons](https://heroicons.com/)
- [Material Icons](https://fonts.google.com/icons)
- [Stream Deck Icons](https://developer.elgato.com/documentation/stream-deck-sdk/creating-your-plugin/)

## Suggested Icons

- **Currently Playing**: Music note or waveform
- **Next**: Skip forward/next arrow
- **Previous**: Skip backward/previous arrow
- **Volume Up**: Speaker with plus/up arrow
- **Volume Down**: Speaker with minus/down arrow
- **Play Playlist**: Playlist/list icon
- **Like Song**: Heart icon
- **Repeat Mode**: Repeat/recycle icon

## Converting SVG to PNG

### Quick Setup (Recommended)

1. **Place a single SVG file** in each action folder (any name works, e.g., `icon.svg`, `source.svg`, or `next.svg`)
2. **Install dependencies**: `npm install`
3. **Run conversion**: `npm run convert-icons`

The script will automatically:
- Find the SVG file in each folder
- Generate `icon.png` (20x20) for Property Inspector
- Generate `key.png` (72x72) for Stream Deck button
- Generate `key@2x.png` (144x144) for high-DPI displays

### Example Structure

```
actions/
  next/
    icon.svg          ← Your single SVG file
    icon.png          ← Generated automatically
    key.png           ← Generated automatically
    key@2x.png        ← Generated automatically
  previous/
    icon.svg          ← Your single SVG file
    ...
```

### Manual Conversion (Alternative)

If you prefer manual conversion:

#### Using ImageMagick (Command Line)
```bash
# Convert SVG to PNG (20x20 for Property Inspector)
magick convert -background none -resize 20x20 icon.svg icon.png

# Convert SVG to PNG (72x72 for Stream Deck button)
magick convert -background none -resize 72x72 icon.svg key.png

# High-DPI version (144x144)
magick convert -background none -resize 144x144 icon.svg key@2x.png
```

#### Using Inkscape (Command Line)
```bash
# 20x20 PNG
inkscape icon.svg --export-type=png --export-width=20 --export-height=20 --export-filename=icon.png

# 72x72 PNG
inkscape icon.svg --export-type=png --export-width=72 --export-height=72 --export-filename=key.png
```

#### Using Online Tools
- [CloudConvert](https://cloudconvert.com/svg-to-png)
- [Convertio](https://convertio.co/svg-png/)
- [SVG to PNG Converter](https://svgtopng.com/)
