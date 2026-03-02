// services/imageGeneration.js
/**
 * Text-to-Image Generation Service
 * Extracts image prompts from LLM responses and generates images
 */

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_IMAGE_MODEL =
  process.env.HF_IMAGE_MODEL || "stabilityai/stable-diffusion-xl-base-1.0";

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;

/**
 * Extract text and image prompt from LLM response
 * Format: "response text here{image prompt in braces}"
 *
 * @param {string} llmResponse - Full LLM response
 * @returns {Object} { text: string, imagePrompt: string | null }
 */
export function extractTextAndImagePrompt(llmResponse) {
  if (!llmResponse || typeof llmResponse !== "string") {
    return { text: "", imagePrompt: null };
  }

  // Match {} at the end of the response
  // Pattern: any text followed by {content} at the very end
  const match = llmResponse.match(/^([\s\S]*?)\{([^}]+)\}\s*$/);

  if (match && match[2]?.trim()) {
    return {
      text: match[1].trim(),
      imagePrompt: match[2].trim(),
    };
  }

  // No {} found, return original text
  return {
    text: llmResponse.trim(),
    imagePrompt: null,
  };
}

/**
 * Clean and validate image prompt
 * @param {string} prompt - Raw image prompt
 * @returns {string | null} Cleaned prompt or null if invalid
 */
export function cleanImagePrompt(prompt) {
  if (!prompt || typeof prompt !== "string") return null;

  const cleaned = prompt
    .replace(/^["\s]+|["\s]+$/g, "") // Remove leading/trailing quotes and spaces
    .replace(/[\n\r]/g, " ") // Convert newlines to spaces
    .replace(/\s+/g, " ") // Convert multiple spaces to single space
    .slice(0, 500) // Max 500 characters
    .trim();

  return cleaned || null;
}

async function generateImageHF(prompt) {
  if (!HF_API_KEY) {
    console.warn("HF_API_KEY not set, skipping HF image generation");
    return null;
  }

  const cleanedPrompt = cleanImagePrompt(prompt);
  if (!cleanedPrompt) return null;

  const url = `https://router.huggingface.co/hf-inference/models/${HF_IMAGE_MODEL}`;

  try {
    console.log("Generating image with HF:", cleanedPrompt);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json", // REQUIRED
        Accept: "image/jpeg", // single type
      },
      body: JSON.stringify({
        inputs: cleanedPrompt,
        parameters: {
          negative_prompt: "ugly, blurry, low quality, distorted",
        },
      }),
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      // log real error from HF (often JSON)
      let detail = "";
      try {
        if (contentType.includes("application/json")) {
          detail = JSON.stringify(await response.json());
        } else {
          detail = await response.text();
        }
      } catch {
        detail = "";
      }
      console.error("HF image generation failed:", response.status, detail);
      return null;
    }

    // Standard fetch binary handling
    const ab = await response.arrayBuffer();
    const base64 = Buffer.from(ab).toString("base64");

    const mime = contentType.startsWith("image/") ? contentType : "image/jpeg";
    const imageUrl = `data:${mime};base64,${base64}`;

    return {
      imageUrl,
      source: "huggingface",
      prompt: cleanedPrompt,
      timestamp: Date.now(),
    };
  } catch (err) {
    console.error("HF image generation error:", err.message);
    return null;
  }
}

/**
 * Generate image with fallback strategy
 * Try Replicate first (if available), then HF
 * @param {string} prompt - Image prompt
 * @returns {Promise<Object | null>} Image data or null if all failed
 */
export async function generateImage(prompt) {
  if (!prompt) return null;

  // Try Replicate first (higher quality)
  if (REPLICATE_API_KEY) {
    const replicateResult = await generateImageReplicate(prompt);
    if (replicateResult) return replicateResult;
  }

  // Fallback to HF
  const hfResult = await generateImageHF(prompt);
  if (hfResult) return hfResult;

  console.warn("All image generation APIs failed for prompt:", prompt);
  return null;
}
