/**
 * A small, deterministic acoustic signature for host-uploaded sounds.
 *
 * This is an RMS/zero-crossing envelope, not a deep semantic embedding. It lets
 * us store a real numeric signature without pretending to run CLAP/YAMNet, and
 * it can be replaced by a provider adapter later.
 */
export async function computeAudioSignature(file) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return { embedding: [], durationMs: 0, model: 'unsupported' };
  const context = new AudioContextClass();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    const samples = buffer.getChannelData(0);
    const durationMs = Math.round(buffer.duration * 1000);
    const bands = 24;
    const size = Math.max(1, Math.floor(samples.length / bands));
    const embedding = [];
    for (let band = 0; band < bands; band += 1) {
      let sum = 0;
      let crossings = 0;
      let previous = 0;
      const start = band * size;
      const end = Math.min(samples.length, start + size);
      for (let i = start; i < end; i += 1) {
        const value = samples[i];
        sum += value * value;
        if (i > start && (value >= 0) !== (previous >= 0)) crossings += 1;
        previous = value;
      }
      const rms = Math.sqrt(sum / Math.max(1, end - start));
      embedding.push(Math.round((rms * 0.7 + (crossings / Math.max(1, end - start)) * 0.3) * 10000) / 10000);
    }
    return { embedding, durationMs, model: 'paw-acoustic-v1' };
  } catch {
    return { embedding: [], durationMs: 0, model: 'unreadable' };
  } finally {
    await context.close().catch(() => {});
  }
}
