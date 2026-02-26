
import { GoogleGenAI } from "@google/genai";
import { getLocalApiKey } from "./storageService";
import { addWavHeader, base64ToUint8Array, cleanBase64 } from "../utils/mediaUtils";

// --- Provider 层: 只负责与 Google API 通信，不包含复杂的业务 Prompt 逻辑 ---

// 安全密钥获取逻辑
const getEffectiveApiKey = async (): Promise<string> => {
    // 1. 本地存储
    const localKey = getLocalApiKey();
    if (localKey) return localKey;

    // 2. 环境变量
    if (process.env.API_KEY) return process.env.API_KEY;

    // 3. AI Studio 检查
    // @ts-ignore
    if (window.aistudio) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey && process.env.API_KEY) return process.env.API_KEY;
    }

    throw new Error("API_KEY_MISSING");
};

// 暴露给外部 (UI层) 显式请求权限
export const requestApiKey = async (): Promise<boolean> => {
  // @ts-ignore
  if (window.aistudio) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      return true;
  }
  return false;
};

// 辅助：从 DataURL 解析 MIME 和 Base64 (Robust Version)
const parseDataUrl = async (dataUrl: string) => {
    try {
        let mimeType = 'image/png';
        let data = dataUrl;

        // Check if it's a remote URL (http/https) instead of a Data URL
        if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
             try {
                 const response = await fetch(dataUrl);
                 if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
                 const blob = await response.blob();
                 // Convert Blob to Base64 Data URL
                 const base64Url = await blobToDataURL(blob);
                 // Recurse to parse the new Data URL
                 return parseDataUrl(base64Url);
             } catch (fetchErr) {
                 console.error("Failed to fetch remote image for processing", fetchErr);
                 throw fetchErr;
             }
        }

        // 1. Split Header and Data
        if (dataUrl.includes(',')) {
            const parts = dataUrl.split(',');
            const header = parts[0]; 
            data = parts[1];
            
            const mimeMatch = header.match(/:(.*?);/);
            if (mimeMatch) {
                mimeType = mimeMatch[1];
            }
        }

        // 2. Clean Base64 Data (Remove newlines, spaces which cause API 400 errors)
        data = data.replace(/[\r\n\s]/g, '');

        // 3. Normalize MIME types
        if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
        
        return { mimeType, data };
    } catch (e) {
        console.error("Failed to parse Data URL", e);
        // Fallback
        return { mimeType: 'image/png', data: dataUrl };
    }
};

// 辅助：将 Blob 转换为 Data URL (Base64)
const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// --- Retry Logic ---

const MAX_RETRIES = 2; // Reduced slightly as we now have fallback logic
const INITIAL_BACKOFF = 1500;

async function callWithRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            const msg = error.message?.toLowerCase() || '';
            const status = error.status || 0;

            // Check if retryable: 429 (Too Many Requests), 503 (Service Unavailable)
            // Note: If "quota" is specifically mentioned, it might be a hard limit, but sometimes 429 is just rate limit.
            // We will try a couple of times.
            const isQuota = status === 429 || msg.includes('quota') || msg.includes('limit') || msg.includes('resource has been exhausted');
            const isServer = status === 503 || status === 500 || msg.includes('overloaded');

            if ((isQuota || isServer) && attempt < MAX_RETRIES - 1) {
                const delay = INITIAL_BACKOFF * Math.pow(2, attempt); 
                console.warn(`${operationName} failed (Attempt ${attempt + 1}/${MAX_RETRIES}). Retrying in ${delay}ms...`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            break;
        }
    }

    // Format error for UI
    let friendlyMessage = lastError.message || "Unknown API Error";
    if (friendlyMessage.toLowerCase().includes('quota') || friendlyMessage.includes('429')) {
        friendlyMessage = "API 配额已耗尽，请稍后再试或使用付费 Key。";
    } else if (friendlyMessage.includes('API_KEY_MISSING')) {
        friendlyMessage = "未检测到 API Key，请在设置中配置。";
    } else if (friendlyMessage.includes('safety')) {
        friendlyMessage = "内容被安全策略拦截，请修改提示词。";
    }

    // Attach original error props for fallback logic checks
    const enhancedError: any = new Error(friendlyMessage);
    enhancedError.originalMessage = lastError.message;
    enhancedError.status = lastError.status;
    throw enhancedError;
}

// --- Raw API Calls ---

export const googleGenerateImage = async (params: {
    model: string,
    prompt: string,
    aspectRatio: string,
    imageSize?: string,
    referenceImages?: string[] 
}): Promise<string> => {
    try {
        return await callWithRetry(async () => {
            let modelToUse = params.model;

            // Fallback for 404/Unavailable Imagen 3.0 model
            if (modelToUse === 'imagen-3.0-generate-001') {
                modelToUse = 'gemini-2.5-flash-image';
            }

            const apiKey = await getEffectiveApiKey();
            const ai = new GoogleGenAI({ apiKey });
            
            // Imagen 3/4 专用逻辑
            if (modelToUse.toLowerCase().includes('imagen')) {
                 const response = await ai.models.generateImages({
                    model: modelToUse,
                    prompt: params.prompt,
                    config: {
                        numberOfImages: 1,
                        aspectRatio: params.aspectRatio, 
                        outputMimeType: 'image/jpeg'
                    }
                });
                const base64Image = response.generatedImages?.[0]?.image?.imageBytes;
                if (!base64Image) throw new Error("No image returned from Imagen.");
                return `data:image/jpeg;base64,${base64Image}`;
            }

            // Gemini 3 Pro / Nano Banana 逻辑
            const parts: any[] = [{ text: params.prompt }];
            
            if (params.referenceImages && params.referenceImages.length > 0) {
                for (let i = params.referenceImages.length - 1; i >= 0; i--) {
                    const { mimeType, data } = await parseDataUrl(params.referenceImages[i]);
                    parts.unshift({
                        inlineData: {
                            mimeType: mimeType,
                            data: data
                        }
                    });
                }
            }

            let safeAspectRatio = params.aspectRatio;
            const isPro = modelToUse === 'gemini-3-pro-image-preview';
            
            if (!isPro) {
                // Enforce Flash limits
                const flashValidRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
                if (!flashValidRatios.includes(safeAspectRatio)) {
                    safeAspectRatio = "16:9"; 
                }
            }

            const imageConfig: any = { aspectRatio: safeAspectRatio };
            if (params.imageSize && modelToUse === 'gemini-3-pro-image-preview') {
                imageConfig.imageSize = params.imageSize;
            }

            const response = await ai.models.generateContent({
                model: modelToUse,
                contents: { parts: parts },
                config: { imageConfig }
            });
            
            let base64Image = null;
            let textResponse = null;

            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        base64Image = part.inlineData.data;
                        break;
                    } else if (part.text) {
                        textResponse = part.text;
                    }
                }
            }

            if (!base64Image) {
                if (textResponse) return textResponse;
                const finishReason = response.candidates?.[0]?.finishReason;
                throw new Error(finishReason ? `Image generation failed: ${finishReason}` : "No image generated.");
            }
            return `data:image/png;base64,${base64Image}`;
        }, 'Generate Image');
    } catch (e: any) {
        // Fallback Strategy: If Pro model quota fails, try Flash
        const msg = (e.originalMessage || e.message || '').toLowerCase();
        if ((msg.includes('quota') || msg.includes('429')) && params.model === 'gemini-3-pro-image-preview') {
            console.warn("Pro model quota exceeded. Falling back to Gemini 2.5 Flash Image.");
            return googleGenerateImage({ ...params, model: 'gemini-2.5-flash-image' });
        }
        throw e;
    }
};

export const googleGenerateVideo = async (params: {
    model: string,
    prompt?: string,
    aspectRatio: string,
    resolution: string,
    durationSeconds: number,
    startImage?: string,
    endImage?: string
}): Promise<string> => {
    try {
        return await callWithRetry(async () => {
            const apiKey = await getEffectiveApiKey();
            const ai = new GoogleGenAI({ apiKey });

            // Allow more aspect ratios for Veo
            let safeAspectRatio = '16:9';
            const validRatios = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];
            
            if (validRatios.includes(params.aspectRatio)) {
                safeAspectRatio = params.aspectRatio;
            } else {
                // Fallback logic if needed, but for now default to 16:9 is safe
                // or we could try to find the closest match
            }

            const videoConfig: any = {
                numberOfVideos: 1,
                resolution: params.resolution || '720p',
                aspectRatio: safeAspectRatio,
            };

            if (params.endImage) {
                const { mimeType, data } = await parseDataUrl(params.endImage);
                videoConfig.lastFrame = { imageBytes: data, mimeType: mimeType };
            }

            const callParams: any = {
                model: params.model,
                config: videoConfig
            };

            if (params.prompt && params.prompt.trim().length > 0) {
                callParams.prompt = params.prompt.trim(); 
            }

            if (params.startImage) {
                const { mimeType, data } = await parseDataUrl(params.startImage);
                callParams.image = { imageBytes: data, mimeType: mimeType };
            }

            if (!callParams.prompt) {
                 callParams.prompt = "Cinematic, high quality video.";
            }

            let operation = await ai.models.generateVideos(callParams);
            
            let attempts = 0;
            while (!operation.done && attempts < 60) {
              await new Promise(resolve => setTimeout(resolve, 10000));
              operation = await ai.operations.getVideosOperation({ operation: operation });
              attempts++;
            }

            if (!operation.done) throw new Error("Video generation timed out.");
            if (operation.error) throw new Error((operation.error as any).message || "Video generation failed.");

            // 1. Check for Safety Filters
            // @ts-ignore
            if (operation.response?.raiMediaFilteredCount && operation.response.raiMediaFilteredCount > 0) {
                 // @ts-ignore
                 const reasons = operation.response.raiMediaFilteredReasons?.join(', ') || 'Unknown Safety Reasons';
                 console.warn(`Video generation filtered by safety settings: ${reasons}`);
                 throw new Error(`Video blocked by safety filters: ${reasons}`);
            }

            const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
            
            if (!videoUri) {
                 console.error("Video generation response missing video data:", JSON.stringify(operation.response, null, 2));
                 throw new Error("Generation completed but no video returned. Check console for details.");
            }

            const downloadUrl = `${videoUri}&key=${apiKey}`;
            const response = await fetch(downloadUrl);
            if (!response.ok) throw new Error(`Download failed: ${response.status}`);
            const blob = await response.blob();
            return await blobToDataURL(blob);
        }, 'Generate Video');
    } catch (e: any) {
        // Fallback Strategy for Video
        const msg = (e.originalMessage || e.message || '').toLowerCase();
        if ((msg.includes('quota') || msg.includes('429')) && params.model === 'veo-3.1-generate-preview') {
             console.warn("Veo HQ quota exceeded. Falling back to Veo Fast.");
             return googleGenerateVideo({ ...params, model: 'veo-3.1-fast-generate-preview' });
        }
        throw e;
    }
};

export const googleGenerateText = async (params: { model: string, prompt: string }): Promise<string> => {
    try {
        return await callWithRetry(async () => {
            const apiKey = await getEffectiveApiKey();
            const ai = new GoogleGenAI({ apiKey });
            
            const response = await ai.models.generateContent({
                model: params.model,
                contents: [{ parts: [{ text: params.prompt }] }],
                config: { temperature: 0.7 }
            });

            return response.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }, 'Generate Text');
    } catch (e: any) {
        // Fallback Strategy for Text
        const msg = (e.originalMessage || e.message || '').toLowerCase();
        if ((msg.includes('quota') || msg.includes('429')) && params.model === 'gemini-3-pro-preview') {
             console.warn("Gemini 3 Pro quota exceeded. Falling back to Flash.");
             return googleGenerateText({ ...params, model: 'gemini-3-flash-preview' });
        }
        throw e;
    }
};

export const googleGenerateSpeech = async (params: { model: string, text: string, voice: string }): Promise<string> => {
    return callWithRetry(async () => {
        const apiKey = await getEffectiveApiKey();
        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: params.model,
            contents: [{ parts: [{ text: params.text }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: params.voice }
                    }
                }
            }
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data returned.");
        
        const pcmBytes = base64ToUint8Array(base64Audio);
        const wavBuffer = addWavHeader(pcmBytes, 24000);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        return await blobToDataURL(blob);
    }, 'Generate Speech');
};
