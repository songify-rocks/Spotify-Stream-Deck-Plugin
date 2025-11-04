#!/bin/bash

# Installation script for Spotify Stream Deck Plugin
# This script helps install the plugin to the Stream Deck plugins directory

echo "Spotify Stream Deck Plugin - Installation Script"
echo "================================================"
echo ""

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLUGIN_DIR="$HOME/Library/Application Support/com.elgato.StreamDeck/Plugins"
    echo "Detected macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLUGIN_DIR="$HOME/.config/com.elgato.StreamDeck/Plugins"
    echo "Detected Linux"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    PLUGIN_DIR="$APPDATA/Elgato/StreamDeck/Plugins"
    echo "Detected Windows"
else
    echo "Unknown OS: $OSTYPE"
    exit 1
fi

PLUGIN_NAME="com.spotify.streamdeck.sdPlugin"
TARGET_DIR="$PLUGIN_DIR/$PLUGIN_NAME"

echo "Target directory: $TARGET_DIR"
echo ""

# Check if Stream Deck plugins directory exists
if [ ! -d "$PLUGIN_DIR" ]; then
    echo "Error: Stream Deck plugins directory not found!"
    echo "Please make sure Stream Deck is installed."
    exit 1
fi

# Create plugin directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Copy files
echo "Installing plugin files..."
cp -r manifest.json "$TARGET_DIR/"
cp -r package.json "$TARGET_DIR/"
cp -r plugin "$TARGET_DIR/"
cp -r actions "$TARGET_DIR/"
cp -r oauth-server.js "$TARGET_DIR/"

# Copy other files if they exist
[ -f LICENSE ] && cp LICENSE "$TARGET_DIR/"
[ -f README.md ] && cp README.md "$TARGET_DIR/"
[ -f .gitignore ] && cp .gitignore "$TARGET_DIR/"

echo ""
echo "Plugin installed successfully!"
echo ""
echo "Next steps:"
echo "1. Install dependencies: cd \"$TARGET_DIR\" && npm install"
echo "2. Start the OAuth server: node oauth-server.js"
echo "3. Restart Stream Deck application"
echo "4. Add a Spotify action to your deck and configure it"
echo ""
echo "Note: You'll need to add icon images. See ICONS.md for details."
