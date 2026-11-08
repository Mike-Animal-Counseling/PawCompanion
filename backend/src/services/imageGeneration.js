import { providerFetch } from './providerFetch.js';

export function extractTextAndImagePrompt(response) {
  if (!response || typeof response !== 'string') return { text: '', imagePrompt: null };
  const match = response.match(/^([\s\S]*?)\{([^}]+)\}\s*$/);
  if (match && match[2]?.trim()) {
    return { text: match[1].trim(), imagePrompt: match[2].trim() };
  }
  return { text: response.trim(), imagePrompt: null };
}

export function cleanImagePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') return null;
  const cleaned = prompt
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/[\n\r]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 500)
    .trim();
  return cleaned || null;
}

/**
 * Optional image generation. Disabled unless ENABLE_AI=true and a Hugging Face
 * key is present; a failure always resolves to null so chat still works.
 */
export async function generateImage(prompt, config) {
  const cleaned = cleanImagePrompt(prompt);
  if (!cleaned || !config?.ai?.enabled || !config?.ai?.apiKey) return null;

  try {
    const response = await providerFetch(
      `https://router.huggingface.co/hf-inference/models/${config.ai.imageModel}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.ai.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'image/jpeg',
        },
        body: JSON.stringify({
          inputs: cleaned,
          parameters: { negative_prompt: 'text, watermark, blurry, low quality, distorted' },
        }),
      },
      2 * 1024 * 1024,
    );
    const type = response.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      imageUrl: `data:${type};base64,${buffer.toString('base64')}`,
      source: 'huggingface',
      prompt: cleaned,
    };
  } catch {
    return null;
  }
}
