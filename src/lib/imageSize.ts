/**
 * Reads the pixel dimensions out of an image header. Only the few bytes that
 * describe the size are parsed, so this stays cheap and needs no dependency.
 * Returns null if the bytes are not a format we accept.
 */
export type Dimensions = { width: number; height: number };

export function imageSize(buffer: Buffer): Dimensions | null {
  return png(buffer) ?? gif(buffer) ?? webp(buffer) ?? jpeg(buffer);
}

function png(b: Buffer): Dimensions | null {
  // 8-byte signature, then a length + "IHDR" chunk whose first 8 bytes are
  // width and height as big-endian 32-bit integers.
  if (b.length < 24) return null;
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  if (b.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function gif(b: Buffer): Dimensions | null {
  if (b.length < 10) return null;
  if (b.toString("ascii", 0, 3) !== "GIF") return null;
  return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
}

function webp(b: Buffer): Dimensions | null {
  if (b.length < 30) return null;
  if (b.toString("ascii", 0, 4) !== "RIFF") return null;
  if (b.toString("ascii", 8, 12) !== "WEBP") return null;

  const chunk = b.toString("ascii", 12, 16);

  if (chunk === "VP8 ") {
    // Lossy: a 3-byte start code, then 14-bit width and height.
    return {
      width: b.readUInt16LE(26) & 0x3fff,
      height: b.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunk === "VP8L") {
    // Lossless: 14 bits each, packed across four bytes after the signature.
    const bits = b.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  if (chunk === "VP8X") {
    // Extended: 24-bit little-endian values, stored as size minus one.
    const width = b[24] | (b[25] << 8) | (b[26] << 16);
    const height = b[27] | (b[28] << 8) | (b[29] << 16);
    return { width: width + 1, height: height + 1 };
  }

  return null;
}

function jpeg(b: Buffer): Dimensions | null {
  if (b.length < 4 || b.readUInt16BE(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 9 < b.length) {
    if (b[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = b[offset + 1];

    // Start-of-frame markers carry the dimensions; C4/C8/CC are other tables.
    const isFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;

    if (isFrame) {
      return {
        height: b.readUInt16BE(offset + 5),
        width: b.readUInt16BE(offset + 7),
      };
    }

    // Standalone markers carry no length field.
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }

    const length = b.readUInt16BE(offset + 2);
    if (length < 2) return null;
    offset += 2 + length;
  }

  return null;
}
