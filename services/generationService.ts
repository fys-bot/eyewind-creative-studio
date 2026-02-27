
import { VideoConfig, AudioConfig, AspectRatio, Resolution, ImageConfig, ModelType } from "../types";
import { PROMPTS } from "../utils/promptRegistry";
import * as GoogleProvider from "./geminiService";
import * as OpenAIProvider from "./openaiService";
import * as VolcengineProvider from "./volcengineService";
import * as AIGatewayProvider from "./aiGatewayService";
import { capabilityResolver } from "./litellm";

// Helper to get provider config
const getProviderConfig = (providerId: string) => {
    try {
        const stored = localStorage.getItem('enexus_connected_providers');
        if (!stored) return null;
        const configs = JSON.parse(stored);
        return configs[providerId];
    } catch (e) {
        return null;
    }
};

// Helper to resolve model (fallback logic)
const resolveModel = (model: string | undefined, type: 'video' | 'image' | 'text' | 'audio'): string => {
    if (model) {
        // Mock non-Google models to fallback to Google equivalent for demo purposes
        // or return specific string to trigger simulation mode
        if (model.includes('midjourney') || model.includes('runway') || model.includes('kling') || model.includes('eyewind')) {
            console.warn(`Model ${model} is not supported by Gemini API. Switching to Simulation Mode.`);
            return 'SIMULATION:' + model;
        }
        return model;
    }
    // Default fallbacks
    if (type === 'video') return 'veo-3.1-fast-generate-preview';
    if (type === 'image') return 'gemini-2.5-flash-image';
    if (type === 'text') return 'gemini-3-flash-preview';
    if (type === 'audio') return 'gemini-2.5-flash-preview-tts';
    return '';
};

// Explicitly re-export or wrap requestApiKey for usage in App.tsx
export const requestApiKey = async (): Promise<boolean> => {
    return GoogleProvider.requestApiKey();
};

// Simulation Helper
const simulateGeneration = async (model: string, type: 'image' | 'video' | 'audio', prompt: string): Promise<string> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (type === 'image') {
                // Return a placeholder image based on model
                if (model.includes('midjourney')) return resolve('https://picsum.photos/1024/576?random=' + Math.random());
                return resolve('https://picsum.photos/800/600?random=' + Math.random());
            } 
            if (type === 'video') {
                // Return a sample video
                return resolve('https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4');
            }
            if (type === 'audio') {
                 // Return a sample audio
                 return resolve('https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3');
            }
            resolve('');
        }, 2000); // 2s delay
    });
};

export const generateVideo = async (config: VideoConfig & { characterNames?: string[] }): Promise<string> => {
    const actualModel = resolveModel(config.model, 'video');

    if (actualModel.startsWith('SIMULATION:')) {
        return simulateGeneration(actualModel, 'video', config.prompt);
    }

    // 检查是否应该使用 AI Gateway
    // 策略：如果模型ID包含特定的provider标识，使用对应的provider
    // 否则，默认使用 AI Gateway（因为模型是从gateway动态获取的）
    
    // Volcengine / Doubao Video Routing
    if (actualModel.includes('doubao') || actualModel.includes('seedance')) {
        const volcConfig = getProviderConfig('volcengine');
        if (!volcConfig || !volcConfig.apiKey) {
            throw new Error("Volcengine API Key not found. Please connect in settings.");
        }
        
        // Sanitize API Key: Trim whitespace and remove 'Bearer ' prefix if user pasted it
        const cleanApiKey = volcConfig.apiKey.trim().replace(/^Bearer\s+/i, '');

        // Validation: Ark API Key should be a UUID-like string, NOT an AK (starts with AKLT/AKTP)
        if (cleanApiKey.startsWith('AKLT') || cleanApiKey.startsWith('AKTP') || cleanApiKey.length < 20) {
            throw new Error(`Invalid API Key Format. You seem to be using an Access Key (AK) or a short token. 
            Please use the Ark API Key (UUID format, e.g. c384...) from the Volcengine Console -> Ark -> API Key.`);
        }

        const modelToUse = volcConfig.modelId || actualModel;

        return VolcengineProvider.volcengineGenerateVideo({
            model: modelToUse,
            prompt: config.prompt, // Original prompt, enhancement happens inside if needed or before
            startImage: config.startImage,
            endImage: config.endImage,
            apiKey: cleanApiKey,
            endpoint: volcConfig.endpoint,
            duration: config.durationSeconds,
            // @ts-ignore
            withAudio: config.withAudio // We need to ensure VideoConfig has this or pass via cast
        });
    }

    // Google Veo 路由 - 仅当模型明确包含 'veo' 且包含 'google' 或 'gemini' 时
    if (actualModel.includes('veo') && (actualModel.includes('google') || actualModel.includes('gemini'))) {
        // 业务逻辑：Prompt 增强
        const finalPrompt = PROMPTS.VIDEO_GENERATION(config.prompt, config.characterNames || []);

        return GoogleProvider.googleGenerateVideo({
            model: actualModel,
            prompt: finalPrompt,
            aspectRatio: config.aspectRatio,
            resolution: config.resolution,
            durationSeconds: config.durationSeconds || 5,
            startImage: config.startImage,
            endImage: config.endImage
        });
    }

    // 默认使用 AI Gateway - 所有其他模型（包括从gateway获取的veo, runway, kling等）
    console.log('[Generation Service] Using AI Gateway for model:', actualModel);
    return AIGatewayProvider.generateVideoViaGateway({
        model: actualModel,
        prompt: config.prompt,
        aspectRatio: config.aspectRatio,
        resolution: config.resolution,
        duration: config.durationSeconds || 4
    });
};

export const generateImage = async (config: ImageConfig): Promise<string> => {
    const actualModel = resolveModel(config.model, 'image');

    if (actualModel.startsWith('SIMULATION:')) {
        return simulateGeneration(actualModel, 'image', config.prompt);
    }

    // Basic prompt logic, can be enhanced
    const finalPrompt = config.prompt; 

    // Azure DALL-E (LiteLLM Path)
    if (actualModel === 'azure-dall-e-3' || actualModel.includes('azure')) {
        try {
            const binding = await capabilityResolver.resolveAndExecute('image_generation', {
                prompt: finalPrompt,
                resolution: config.resolution
            }, actualModel);
            return binding; // resolveAndExecute returns the URL string for images
        } catch (e) {
            console.error("LiteLLM Azure Generation Failed:", e);
            throw e;
        }
    }

    // OpenAI Routing
    if (actualModel.includes('dall-e')) {
        return OpenAIProvider.openaiGenerateImage({
            model: actualModel,
            prompt: finalPrompt,
            size: config.resolution
        });
    }

    // Volcengine / Doubao Routing
    if (actualModel.includes('doubao') || actualModel.includes('volcengine') || actualModel.includes('seedance')) {
        const volcConfig = getProviderConfig('volcengine');
        if (!volcConfig || !volcConfig.apiKey) {
            throw new Error("Volcengine API Key not found. Please connect in settings.");
        }
        
        // Sanitize API Key
        const cleanApiKey = volcConfig.apiKey.trim().replace(/^Bearer\s+/i, '');
        
        // Use the configured Endpoint ID (modelId) if available, otherwise fallback to the model name
        // Ark API expects the Endpoint ID as the 'model' parameter
        const modelToUse = volcConfig.modelId || actualModel;

        // Special Case: User wants to use Seedance (Video) in Image Node (Visual Gen)
        // We route this to the Video generation logic
        if (actualModel.includes('seedance')) {
             return VolcengineProvider.volcengineGenerateVideo({
                model: modelToUse,
                prompt: finalPrompt,
                startImage: config.referenceImages?.[0], // Map first ref image to start image
                apiKey: cleanApiKey,
                endpoint: volcConfig.endpoint
            });
        }

        // Standard Text-to-Image (Doubao-Seedream, etc.)
        // Uses OpenAI compatible /v1/images/generations endpoint structure but on Ark host
        return OpenAIProvider.openaiGenerateImage({
            model: modelToUse,
            prompt: finalPrompt,
            size: config.resolution, // Will be mapped inside or passed through
            baseUrl: volcConfig.endpoint || "https://ark.cn-beijing.volces.com/api/v3", // Ensure default endpoint
            apiKey: cleanApiKey
        });
    }

    return GoogleProvider.googleGenerateImage({
        model: actualModel,
        prompt: finalPrompt,
        aspectRatio: config.aspectRatio,
        imageSize: config.resolution,
        referenceImages: config.referenceImages
    });
};

export const generateCharacterReference = async (description: string): Promise<string> => {
    // Uses a specific prompt for char sheets
    const prompt = PROMPTS.CHARACTER_SHEET(description);
    return GoogleProvider.googleGenerateImage({
        model: 'gemini-2.5-flash-image', // Fast model for iteration
        prompt: prompt,
        aspectRatio: '1:1', // Standard for char sheets
        imageSize: '1K' 
    });
};

export const generateScript = async (concept: string, model?: string, role?: string): Promise<string[]> => {
    const actualModel = resolveModel(model || 'gemini-3-flash-preview', 'text');
    
    // 业务逻辑：应用 Agent Prompt (带角色)
    const finalPrompt = PROMPTS.SCRIPT_AGENT(concept, role);

    let text = "";

    // OpenAI Routing
    if (actualModel.startsWith('gpt') || actualModel.startsWith('o1')) {
         text = await OpenAIProvider.openaiGenerateText({
             model: actualModel,
             prompt: finalPrompt,
             systemPrompt: role ? `You are a ${role}.` : undefined
         });
    } else if (actualModel.includes('doubao') || actualModel.includes('volcengine')) {
        const volcConfig = getProviderConfig('volcengine');
        if (!volcConfig || !volcConfig.apiKey) {
           throw new Error("Volcengine API Key not found.");
       }
       const modelToUse = volcConfig.modelId || actualModel;
       
       text = await OpenAIProvider.openaiGenerateText({
           model: modelToUse,
           prompt: finalPrompt,
           systemPrompt: role ? `You are a ${role}.` : undefined,
           baseUrl: volcConfig.endpoint,
           apiKey: volcConfig.apiKey
       });
    } else {
        text = await GoogleProvider.googleGenerateText({
            model: actualModel,
            prompt: finalPrompt
        });
    }

    // 业务逻辑：后处理拆解
    // 移除 markdown 格式，清理空白
    return text.split('\n')
        .filter(line => line.trim().length > 5) // 过滤太短的行
        .filter(line => /^\d+\.|^[-*•]/.test(line.trim()) || line.includes(':')) // 尝试只保留列表项或带冒号的行
        .map(line => line.replace(/^[-*•\d\.]+\s*/, '').trim()) // 移除序号
        .slice(0, 3); // 强制取前3条
    
};

export const generateSpeech = async (config: AudioConfig): Promise<string> => {
    const actualModel = resolveModel(config.model, 'audio');

    if (actualModel.startsWith('SIMULATION:')) {
        return simulateGeneration(actualModel, 'audio', config.text);
    }

    // OpenAI TTS Routing
    if (actualModel.startsWith('tts-1')) {
        return OpenAIProvider.openaiGenerateSpeech({
            model: actualModel,
            text: config.text,
            voice: config.voice
        });
    }

    // Google TTS Routing - 仅当模型明确包含 'gemini' 或 'google' 时
    if (actualModel.includes('gemini') || actualModel.includes('google')) {
        return GoogleProvider.googleGenerateSpeech({
            model: actualModel,
            text: config.text,
            voice: config.voice
        });
    }

    // 默认使用 AI Gateway - 所有其他音频模型
    console.log('[Generation Service] Using AI Gateway for audio model:', actualModel);
    return AIGatewayProvider.generateAudioViaGateway({
        model: actualModel,
        text: config.text,
        voice: config.voice
    });
};
