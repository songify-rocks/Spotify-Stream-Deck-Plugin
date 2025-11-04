/**
 * Icon Conversion Script
 * 
 * Converts SVG icons to PNG files in all required sizes for Stream Deck
 * Place SVG files in icons-source/ folder with the correct naming
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Define icon mappings: source filename -> destination folder
const actionIcons = {
    'now-playing.svg': 'com.jan-blmacher.spotifyremote.sdPlugin/imgs/actions/now-playing',
    'next.svg': 'com.jan-blmacher.spotifyremote.sdPlugin/imgs/actions/next',
    'previous.svg': 'com.jan-blmacher.spotifyremote.sdPlugin/imgs/actions/previous',
    'play-pause.svg': 'com.jan-blmacher.spotifyremote.sdPlugin/imgs/actions/play-pause',
    'play-playlist.svg': 'com.jan-blmacher.spotifyremote.sdPlugin/imgs/actions/play-playlist',
    'toggle-shuffle.svg': 'com.jan-blmacher.spotifyremote.sdPlugin/imgs/actions/toggle-shuffle',
    'repeat-mode.svg': 'com.jan-blmacher.spotifyremote.sdPlugin/imgs/actions/repeat-mode',
    'like-song.svg': 'com.jan-blmacher.spotifyremote.sdPlugin/imgs/actions/like-song',
    'volume-up.svg': 'com.jan-blmacher.spotifyremote.sdPlugin/imgs/actions/volume-up',
    'volume-down.svg': 'com.jan-blmacher.spotifyremote.sdPlugin/imgs/actions/volume-down',
    'sliders.svg': 'com.jan-blmacher.spotifyremote.sdPlugin/imgs/actions/set-volume'
};

const pluginIcons = {
    'category-icon.svg': 'com.jan-blmacher.spotifyremote.sdPlugin/imgs/plugin/category-icon',
    'marketplace.svg': 'com.jan-blmacher.spotifyremote.sdPlugin/imgs/plugin/marketplace'
};

// Required sizes for action icons
const actionSizes = [
    { name: 'icon.png', size: 20 },
    { name: 'icon@2x.png', size: 40 },
    { name: 'key.png', size: 72 },
    { name: 'key@2x.png', size: 144 }
];

// Required sizes for plugin icons (per Elgato guidelines)
const pluginIconSizes = {
    'category-icon': [
        { name: 'category-icon.png', size: 28 },
        { name: 'category-icon@2x.png', size: 46 }  // Fixed: 46×46 per guidelines, not 56
    ],
    'marketplace': [
        { name: 'marketplace.png', size: 256 },  // Fixed: 256×256 per guidelines
        { name: 'marketplace@2x.png', size: 512 }  // Fixed: 512×512 per guidelines
    ]
};

const sourceFolder = 'icons-source';

async function convertIcon(svgPath, outputPath, size, filename) {
    try {
        // Read SVG content and replace black/dark colors with white
        let svgContent = fs.readFileSync(svgPath, 'utf8');
        
        // Replace common dark colors with white in SVG
        svgContent = svgContent
            .replace(/fill="[^"]*(?:black|#000000|#000|rgb\(0,0,0\)|currentColor)"/gi, 'fill="#FFFFFF"')
            .replace(/stroke="[^"]*(?:black|#000000|#000|rgb\(0,0,0\)|currentColor)"/gi, 'stroke="#FFFFFF"')
            // Also handle styles
            .replace(/fill:\s*(?:black|#000000|#000|rgb\(0,0,0\)|currentColor)/gi, 'fill:#FFFFFF')
            .replace(/stroke:\s*(?:black|#000000|#000|rgb\(0,0,0\)|currentColor)/gi, 'stroke:#FFFFFF');
        
        // Convert modified SVG to PNG
        await sharp(Buffer.from(svgContent))
            .resize(size, size, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toFile(path.join(outputPath, filename));
        
        console.log(`✓ Created ${filename} (${size}x${size}) in white`);
    } catch (error) {
        console.error(`✗ Failed to create ${filename}:`, error.message);
    }
}

async function processActionIcons() {
    console.log('\n📦 Processing Action Icons...\n');
    
    for (const [svgFile, destFolder] of Object.entries(actionIcons)) {
        const svgPath = path.join(sourceFolder, svgFile);
        
        if (!fs.existsSync(svgPath)) {
            console.log(`⚠ Skipping ${svgFile} (not found)`);
            continue;
        }
        
        console.log(`🎨 Converting ${svgFile}...`);
        
        // Ensure destination folder exists
        if (!fs.existsSync(destFolder)) {
            fs.mkdirSync(destFolder, { recursive: true });
        }
        
        // Convert to all required sizes
        for (const { name, size } of actionSizes) {
            await convertIcon(svgPath, destFolder, size, name);
        }
        
        console.log('');
    }
}

async function processPluginIcons() {
    console.log('\n📦 Processing Plugin Icons...\n');
    
    for (const [svgFile, basePath] of Object.entries(pluginIcons)) {
        const svgPath = path.join(sourceFolder, svgFile);
        
        if (!fs.existsSync(svgPath)) {
            console.log(`⚠ Skipping ${svgFile} (not found)`);
            continue;
        }
        
        console.log(`🎨 Converting ${svgFile}...`);
        
        const iconType = svgFile.replace('.svg', '');
        const destFolder = path.dirname(basePath);
        
        // Ensure destination folder exists
        if (!fs.existsSync(destFolder)) {
            fs.mkdirSync(destFolder, { recursive: true });
        }
        
        // Convert to all required sizes
        for (const { name, size } of pluginIconSizes[iconType]) {
            await convertIcon(svgPath, destFolder, size, name);
        }
        
        console.log('');
    }
}

async function main() {
    console.log('🚀 Stream Deck Icon Converter\n');
    console.log('================================\n');
    
    // Check if icons-source folder exists
    if (!fs.existsSync(sourceFolder)) {
        console.error(`❌ Error: ${sourceFolder} folder not found!`);
        console.log(`\nPlease create the folder and add your SVG files.`);
        process.exit(1);
    }
    
    // Check if sharp is installed
    try {
        require.resolve('sharp');
    } catch (e) {
        console.error('❌ Error: sharp package not installed!');
        console.log('\nInstalling sharp...\n');
        const { execSync } = require('child_process');
        execSync('npm install sharp', { stdio: 'inherit' });
        console.log('\n✓ sharp installed successfully!\n');
    }
    
    await processActionIcons();
    await processPluginIcons();
    
    console.log('================================\n');
    console.log('✅ Icon conversion complete!\n');
    console.log('Your icons are ready to use. Rebuild the plugin with: npm run build\n');
}

main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});

