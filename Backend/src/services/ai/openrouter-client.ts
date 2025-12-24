import { config } from "../../config/env.js";
import type { OpenRouterMessage, OpenRouterResponse } from "./types.js";

/**
 * Make a request to OpenRouter API
 */
export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<string | null> {
  const { maxTokens = 4096, temperature = 0.3 } = options;

  if (!config.openrouterApiKey) {
    console.error("OpenRouter API key not configured");
    return null;
  }

  try {
    const response = await fetch(`${config.openrouterBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openrouterApiKey}`,
        "HTTP-Referer": "https://fact-capture.ai",
        "X-Title": "Fact Capture AI",
      },
      body: JSON.stringify({
        model: config.openrouterModel,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API error (${response.status}):`, errorText);
      return null;
    }

    const data = (await response.json()) as OpenRouterResponse;

    if (!data.choices || data.choices.length === 0) {
      console.error("No choices in OpenRouter response");
      return null;
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("OpenRouter API call failed:", error);
    return null;
  }
}

/**
 * Build image message content for vision model
 */
export function buildImageContent(
  prompt: string,
  imageBase64: string
): OpenRouterMessage["content"] {
  // Ensure proper data URL format
  let imageUrl = imageBase64;
  if (!imageBase64.startsWith("data:")) {
    // Try to detect image type from base64 header
    const isJpeg = imageBase64.startsWith("/9j/");
    const isPng = imageBase64.startsWith("iVBOR");
    const mimeType = isJpeg ? "image/jpeg" : isPng ? "image/png" : "image/jpeg";
    imageUrl = `data:${mimeType};base64,${imageBase64}`;
  }

  return [
    {
      type: "text",
      text: prompt,
    },
    {
      type: "image_url",
      image_url: { url: imageUrl },
    },
  ];
}

/**
 * Build text-only message
 */
export function buildTextMessage(
  role: "system" | "user" | "assistant",
  content: string
): OpenRouterMessage {
  return { role, content };
}

/**
 * Build image message for user
 */
export function buildImageMessage(
  prompt: string,
  imageBase64: string
): OpenRouterMessage {
  return {
    role: "user",
    content: buildImageContent(prompt, imageBase64),
  };
}
