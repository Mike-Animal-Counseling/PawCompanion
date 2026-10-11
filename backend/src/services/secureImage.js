import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
export async function encodeImage(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > 5 * 1024 * 1024) throw new Error('Invalid image');
  const input = sharp(buffer, { limitInputPixels: 16000000, animated: false });
  const metadata = await input.metadata();
  if (!['jpeg', 'png'].includes(metadata.format) || (metadata.pages || 1) !== 1) throw new Error('Unsupported image');
  // Decode/re-encode: original bytes, metadata, names, and extensions are never served.
  return input.rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
}
export async function storeImage(buffer, owner, directory) {
  if (!/^[a-f\d]{24}$/i.test(owner)) throw new Error('Invalid owner');
  const data = await encodeImage(buffer), filename = `${owner}-${randomUUID()}.jpeg`;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(path.join(directory, filename), data, { flag: 'wx', mode: 0o600 });
  return filename;
}
export function ownsImage(filename, owner) {
  return /^[a-f\d]{24}-[a-f\d-]{36}\.jpeg$/i.test(filename) && filename.startsWith(`${owner}-`);
}
