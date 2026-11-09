import { parseBuffer } from 'music-metadata';

const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac']);
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_MS = 8000;

function extensionFor(mimeType) {
  if (mimeType === 'audio/ogg') return 'ogg';
  if (mimeType === 'audio/wav' || mimeType === 'audio/x-wav') return 'wav';
  if (mimeType === 'audio/mp4' || mimeType === 'audio/x-m4a' || mimeType === 'audio/aac') return 'm4a';
  return 'mp3';
}

export function audioExtension(mimeType) {
  return extensionFor(String(mimeType || '').toLowerCase());
}

export async function analyzeAudio(buffer, mimeType) {
  const type = String(mimeType || '').toLowerCase();
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('Choose an audio file');
  if (buffer.length > MAX_BYTES) throw new Error('Audio must be smaller than 2 MB');
  if (!AUDIO_TYPES.has(type)) throw new Error('Use MP3, OGG, WAV or M4A audio');
  let metadata;
  try {
    metadata = await parseBuffer(buffer, { mimeType: type, size: buffer.length });
  } catch {
    throw new Error('That audio file could not be read');
  }
  const duration = Number(metadata?.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Audio has no readable duration');
  const durationMs = Math.round(duration * 1000);
  if (durationMs > MAX_MS) throw new Error('Keep each sound under 8 seconds');
  if (durationMs < 250) throw new Error('Sound is too short');
  return {
    durationMs,
    mimeType: type,
    extension: extensionFor(type),
    codec: metadata?.format?.codec || '',
    sampleRate: Number(metadata?.format?.sampleRate) || 0,
    bitrate: Number(metadata?.format?.bitrate) || 0,
  };
}

export const AUDIO_LIMIT_BYTES = MAX_BYTES;
export const AUDIO_TYPES_LIST = [...AUDIO_TYPES];
