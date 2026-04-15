// scripts/create-icons.js
const fs = require('fs');
const path = require('path');

function createIco() {
  const size = 256;
  const bmpSize = size * size * 4 + 54;
  const bmp = Buffer.alloc(bmpSize);
  
  // BMP header
  bmp.writeUInt16LE(19778, 0); // "BM"
  bmp.writeUInt32LE(bmpSize, 2); // file size
  bmp.writeUInt32LE(54, 10); // offset to pixel data
  
  // DIB header (BITMAPINFOHEADER)
  bmp.writeUInt32LE(40, 14); // header size
  bmp.writeInt32LE(size, 18); // width
  bmp.writeInt32LE(size, 22); // height (negative for top-down)
  bmp.writeUInt16LE(1, 26); // planes
  bmp.writeUInt16LE(32, 28); // bits per pixel
  bmp.writeUInt32LE(0, 30); // compression (none)
  bmp.writeUInt32LE(size * size * 4, 34); // image size
  
  // Pixel data (BGRA format, bottom-up)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = 54 + (y * size + x) * 4;
      const cx = x - size / 2;
      const cy = y - size / 2;
      const d = Math.sqrt(cx * cx + cy * cy);
      
      if (d < size / 3) {
        // Inner circle - indigo
        bmp[i] = 180; // B
        bmp[i + 1] = 100; // G
        bmp[i + 2] = 90; // R
        bmp[i + 3] = 255; // A
      } else if (d < size / 2 - 5) {
        // Middle ring - dark slate
        bmp[i] = 69; // B
        bmp[i + 1] = 27; // G
        bmp[i + 2] = 30; // R
        bmp[i + 3] = 255; // A
      } else {
        // Outer - transparent
        bmp[i] = 0;
        bmp[i + 1] = 0;
        bmp[i + 2] = 0;
        bmp[i + 3] = 0;
      }
    }
  }
  
  // ICO file format
  const ico = Buffer.alloc(22 + bmp.length);
  ico.writeUInt16LE(0, 0); // reserved
  ico.writeUInt16LE(1, 2); // type (1 = ICO)
  ico.writeUInt16LE(1, 4); // count
  ico[5] = 32; // width (0 = 256)
  ico[6] = 32; // height (0 = 256)
  ico[7] = 0; // color palette
  ico[8] = 0; // reserved
  ico.writeUInt16LE(1, 10); // color planes
  ico.writeUInt16LE(32, 12); // bits per pixel
  ico.writeUInt32LE(bmp.length, 14); // size
  ico.writeUInt32LE(22, 18); // offset
  
  bmp.copy(ico, 22);
  
  return ico;
}

const ico = createIco();
fs.writeFileSync(path.join(__dirname, '../build/icon.ico'), ico);
fs.writeFileSync(path.join(__dirname, '../build/icon-server.ico'), ico);
console.log('Icons created successfully!');
