const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcImage = path.resolve(__dirname, '../src/assets/images/green_forklift_full_bleed_1788155786836.jpg');
const publicDir = path.resolve(__dirname, '../public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function buildIcons() {
  console.log('Generating icons from:', srcImage);

  // 192x192 PNG
  await sharp(srcImage)
    .resize(192, 192, { fit: 'cover' })
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'icon-192.png'));

  // 512x512 PNG
  await sharp(srcImage)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'icon-512.png'));

  // 180x180 Apple Touch Icon
  await sharp(srcImage)
    .resize(180, 180, { fit: 'cover' })
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 64x64 and 32x32 Favicons
  await sharp(srcImage)
    .resize(64, 64, { fit: 'cover' })
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'favicon.png'));

  await sharp(srcImage)
    .resize(32, 32, { fit: 'cover' })
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  await sharp(srcImage)
    .resize(16, 16, { fit: 'cover' })
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'favicon-16x16.png'));

  // Maskable icon with safe zone padding
  await sharp(srcImage)
    .resize(410, 410, { fit: 'cover' })
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: '#163820' // deep green matching the background
    })
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'icon-maskable-512.png'));

  await sharp(srcImage)
    .resize(154, 154, { fit: 'cover' })
    .extend({
      top: 19,
      bottom: 19,
      left: 19,
      right: 19,
      background: '#163820'
    })
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'icon-maskable-192.png'));

  console.log('Icons generated successfully in /public');
}

buildIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
