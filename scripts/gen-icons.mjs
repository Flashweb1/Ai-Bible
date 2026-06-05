import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('public/icon-192.svg', 'utf-8');

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`);
  console.log(`Generated icon-${size}.png`);
}
