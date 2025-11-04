const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Icon sizes needed
const sizes = {
  icon: 20,      // Property Inspector
  key: 72,       // Stream Deck button
  keyRetina: 144 // High-DPI variant
};

// Root icon sizes
const rootSizes = {
  icon: 72,
  iconRetina: 144
};

// Action folders to process
const actionFolders = [
  'currently-playing',
  'next',
  'previous',
  'volume-up',
  'volume-down',
  'play-playlist',
  'like-song',
  'repeat-mode',
  'play-pause'
];

async function convertSvgToPng(svgPath, outputPath, size) {
  try {
    await sharp(svgPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(outputPath);
    console.log(`  ✓ ${path.basename(outputPath)} (${size}x${size})`);
    return true;
  } catch (error) {
    console.error(`  ✗ Error converting ${path.basename(svgPath)}:`, error.message);
    return false;
  }
}

async function findSvgFiles(folderPath) {
  // Look for multiple SVG files (for play-pause)
  const files = fs.readdirSync(folderPath);
  const svgFiles = files.filter(f => f.toLowerCase().endsWith('.svg'));
  
  return svgFiles.map(f => path.join(folderPath, f));
}

async function findSvgFile(folderPath) {
  // Look for common SVG filenames
  const possibleNames = ['icon.svg', 'key.svg', 'source.svg', 'image.svg'];
  
  for (const name of possibleNames) {
    const svgPath = path.join(folderPath, name);
    if (fs.existsSync(svgPath)) {
      return svgPath;
    }
  }
  
  // If no common name found, look for any .svg file
  const files = fs.readdirSync(folderPath);
  const svgFiles = files.filter(f => f.toLowerCase().endsWith('.svg'));
  
  if (svgFiles.length > 0) {
    return path.join(folderPath, svgFiles[0]);
  }
  
  return null;
}

async function processActionFolder(folderName) {
  const folderPath = path.join('actions', folderName);
  
  if (!fs.existsSync(folderPath)) {
    console.log(`⚠ Skipping ${folderName} (folder not found)`);
    return;
  }

  // Special handling for play-pause (needs two SVG files)
  if (folderName === 'play-pause') {
    await processPlayPauseFolder(folderPath);
    return;
  }
  
  const svgPath = await findSvgFile(folderPath);
  
  if (!svgPath) {
    console.log(`⚠ ${folderName}: No SVG file found`);
    return;
  }
  
  console.log(`\n📁 Processing ${folderName}...`);
  console.log(`   Source: ${path.basename(svgPath)}`);
  
  // Convert to icon.png (20x20)
  await convertSvgToPng(
    svgPath,
    path.join(folderPath, 'icon.png'),
    sizes.icon
  );
  
  // Convert to key.png (72x72)
  await convertSvgToPng(
    svgPath,
    path.join(folderPath, 'key.png'),
    sizes.key
  );
  
  // Convert to key@2x.png (144x144) for high-DPI
  await convertSvgToPng(
    svgPath,
    path.join(folderPath, 'key@2x.png'),
    sizes.keyRetina
  );
}

async function processPlayPauseFolder(folderPath) {
  console.log(`\n📁 Processing play-pause...`);
  
  // Find play and pause SVG files
  const svgFiles = await findSvgFiles(folderPath);
  let playSvg = null;
  let pauseSvg = null;
  
  for (const svgFile of svgFiles) {
    const name = path.basename(svgFile).toLowerCase();
    if (name.includes('play') && !name.includes('pause')) {
      playSvg = svgFile;
    } else if (name.includes('pause')) {
      pauseSvg = svgFile;
    }
  }
  
  // If not found by name, use first two SVGs
  if (!playSvg || !pauseSvg) {
    if (svgFiles.length >= 2) {
      playSvg = playSvg || svgFiles[0];
      pauseSvg = pauseSvg || svgFiles[1];
    } else if (svgFiles.length === 1) {
      // Use same SVG for both (not ideal but works)
      playSvg = svgFiles[0];
      pauseSvg = svgFiles[0];
      console.log(`   ⚠ Only one SVG found, using same file for both states`);
    } else {
      console.log(`   ⚠ No SVG files found`);
      return;
    }
  }
  
  console.log(`   Play icon: ${path.basename(playSvg)}`);
  console.log(`   Pause icon: ${path.basename(pauseSvg)}`);
  
  // Convert play icon
  await convertSvgToPng(playSvg, path.join(folderPath, 'icon.png'), sizes.icon);
  await convertSvgToPng(playSvg, path.join(folderPath, 'key-play.png'), sizes.key);
  await convertSvgToPng(playSvg, path.join(folderPath, 'key-play@2x.png'), sizes.keyRetina);
  
  // Convert pause icon
  await convertSvgToPng(pauseSvg, path.join(folderPath, 'key-pause.png'), sizes.key);
  await convertSvgToPng(pauseSvg, path.join(folderPath, 'key-pause@2x.png'), sizes.keyRetina);
}

async function convertRootIcons() {
  const rootSvgs = await findSvgFile('.');
  
  if (rootSvgs) {
    const svgName = path.basename(rootSvgs);
    console.log(`\n📁 Processing root icons...`);
    console.log(`   Source: ${svgName}`);
    
    // Convert to icon.png (72x72)
    await convertSvgToPng(rootSvgs, 'icon.png', rootSizes.icon);
    
    // Convert to icon@2x.png (144x144) for high-DPI
    await convertSvgToPng(rootSvgs, 'icon@2x.png', rootSizes.iconRetina);
    
    // Also create category.png if it doesn't exist
    if (!fs.existsSync('category.png')) {
      await convertSvgToPng(rootSvgs, 'category.png', rootSizes.icon);
    }
  } else {
    console.log(`\n⚠ No root SVG found (looking for icon.svg, source.svg, or any .svg)`);
  }
}

async function main() {
  console.log('🎨 Converting SVG icons to PNG...');
  console.log('📝 Place a single SVG file in each action folder');
  console.log('   (Accepted names: icon.svg, key.svg, source.svg, or any .svg file)\n');
  
  // Process root icons
  await convertRootIcons();
  
  // Process action folders
  let successCount = 0;
  for (const folder of actionFolders) {
    const folderPath = path.join('actions', folder);
    const svgPath = await findSvgFile(folderPath);
    if (svgPath) {
      await processActionFolder(folder);
      successCount++;
    } else {
      console.log(`⚠ ${folder}: No SVG file found`);
    }
  }
  
  console.log(`\n✨ Conversion complete!`);
  console.log(`   Processed ${successCount} action folders`);
  console.log(`\n📋 Generated files:`);
  console.log(`   - icon.png (20x20) - Property Inspector`);
  console.log(`   - key.png (72x72) - Stream Deck button`);
  console.log(`   - key@2x.png (144x144) - High-DPI variant`);
}

main().catch(console.error);
