
import { VideoConfig, AudioConfig, ImageConfig } from "../types";
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
    if (model) return model;
    // Default fallbacks - 使用 AI Gateway 模型
    if (type === 'video') return 'veo-3.1-i2v';
    if (type === 'image') return 'flux-1.1-pro';
    if (type === 'text') return 'gemini-3-flash-preview';
    if (type === 'audio') return 'gpt-4o-audio-preview';
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

    // Volcengine / Doubao Video Routing - 仅当用户已配置 Volcengine API Key 时
    if ((actualModel.includes('doubao') || actualModel.includes('seedance')) && getProviderConfig('volcengine')?.apiKey) {
        const volcConfig = getProviderConfig('volcengine');
        
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
            prompt: config.prompt,
            startImage: config.startImage,
            endImage: config.endImage,
            apiKey: cleanApiKey,
            endpoint: volcConfig.endpoint,
            duration: config.durationSeconds,
            // @ts-ignore
            withAudio: config.withAudio
        });
    }

    // 默认使用 AI Gateway - 所有视频模型（包括 veo, runway, kling 等）
    console.log('[Generation Service] Using AI Gateway for video model:', actualModel);
    console.log('[Generation Service] Video config:', {
        model: actualModel,
        aspectRatio: config.aspectRatio,
        resolution: config.resolution,
        duration: config.durationSeconds || 4,
        hasStartImage: !!config.startImage,
        hasEndImage: !!config.endImage,
    });
    
    return AIGatewayProvider.generateVideoViaGateway({
        model: actualModel,
        prompt: config.prompt,
        aspectRatio: config.aspectRatio,
        resolution: config.resolution,
        duration: config.durationSeconds || 4,
        startImage: config.startImage,
        endImage: config.endImage
    });
};

export const generateImage = async (config: ImageConfig): Promise<string> => {
    const actualModel = resolveModel(config.model, 'image');

    if (actualModel.startsWith('SIMULATION:')) {
        return simulateGeneration(actualModel, 'image', config.prompt);
    }

    // Basic prompt logic, can be enhanced
    const finalPrompt = config.prompt;
    
    // 确定使用的尺寸：优先使用 size，否则使用 resolution
    const imageSize = config.size || config.resolution || '1024x1024';

    // Azure DALL-E (LiteLLM Path)
    if (actualModel === 'azure-dall-e-3' || actualModel.includes('azure')) {
        try {
            const binding = await capabilityResolver.resolveAndExecute('image_generation', {
                prompt: finalPrompt,
                resolution: imageSize
            }, actualModel);
            return binding; // resolveAndExecute returns the URL string for images
        } catch (e) {
            console.error("LiteLLM Azure Generation Failed:", e);
            throw e;
        }
    }

    // Volcengine / Doubao Routing - 仅当用户已配置 Volcengine API Key 时
    if ((actualModel.includes('doubao') || actualModel.includes('volcengine') || actualModel.includes('seedance')) && getProviderConfig('volcengine')?.apiKey) {
        const volcConfig = getProviderConfig('volcengine');
        
        // Sanitize API Key
        const cleanApiKey = volcConfig.apiKey.trim().replace(/^Bearer\s+/i, '');
        
        const modelToUse = volcConfig.modelId || actualModel;

        // Special Case: User wants to use Seedance (Video) in Image Node (Visual Gen)
        if (actualModel.includes('seedance')) {
             return VolcengineProvider.volcengineGenerateVideo({
                model: modelToUse,
                prompt: finalPrompt,
                startImage: config.referenceImages?.[0],
                apiKey: cleanApiKey,
                endpoint: volcConfig.endpoint
            });
        }

        // Standard Text-to-Image (Doubao-Seedream, etc.)
        return OpenAIProvider.openaiGenerateImage({
            model: modelToUse,
            prompt: finalPrompt,
            size: imageSize,
            baseUrl: volcConfig.endpoint || "https://ark.cn-beijing.volces.com/api/v3",
            apiKey: cleanApiKey
        });
    }

    // 默认使用 AI Gateway - 所有图片模型（包括 dall-e, flux, stable-diffusion, gemini 等）
    console.log('[Generation Service] Using AI Gateway for image model:', actualModel);
    return AIGatewayProvider.generateImageViaGateway({
        model: actualModel,
        prompt: finalPrompt,
        size: imageSize,
        aspectRatio: config.aspectRatio,
        resolution: config.resolution,
        referenceImages: config.referenceImages
    });
};

export const generateCharacterReference = async (description: string): Promise<string> => {
    // Uses a specific prompt for char sheets
    return AIGatewayProvider.generateImageViaGateway({
        model: 'flux-1.1-pro', // AI Gateway 默认图片模型
        prompt: PROMPTS.CHARACTER_SHEET(description),
        size: '1024x1024'
    });
};

export const generateScript = async (concept: string, model?: string, role?: string): Promise<string[]> => {
    const actualModel = resolveModel(model || 'gemini-3-flash-preview', 'text');
    
    // 业务逻辑：应用 Agent Prompt (带角色)
    const finalPrompt = PROMPTS.SCRIPT_AGENT(concept, role);

    let text = "";

    // Volcengine / Doubao Routing - 仅当用户已配置 Volcengine API Key 时
    if ((actualModel.includes('doubao') || actualModel.includes('volcengine')) && getProviderConfig('volcengine')?.apiKey) {
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
        // 默认使用 AI Gateway - 所有聊天模型（包括 gemini, gpt, claude 等）
        console.log('[Generation Service] Using AI Gateway for text model:', actualModel);
        text = await AIGatewayProvider.generateTextViaGateway({
            model: actualModel,
            prompt: finalPrompt,
            systemPrompt: role ? `You are a ${role}.` : undefined,
            temperature: 0.7
        });
    }

    // 业务逻辑：后处理拆解
    // 移除 markdown 格式，清理空白
    const lines = text.split('\n')
        .map(line => line.replace(/^\*\*.*?\*\*\s*/, '').trim()) // 移除 **bold** 前缀
        .filter(line => line.length > 5); // 过滤太短的行
    
    // 优先提取列表项或带冒号的行
    const structured = lines
        .filter(line => /^\d+[\.\):]|^[-*•]/.test(line.trim()) || line.includes(':'))
        .map(line => line.replace(/^[-*•\d\.\):]+\s*/, '').trim())
        .filter(line => line.length > 5);
    
    // 如果严格过滤后有结果就用，否则回退到所有非空行
    const result = structured.length >= 2 ? structured.slice(0, 3) : lines.slice(0, 3);
    
    // 兜底：如果后处理全部过滤掉了，直接返回原文
    if (result.length === 0 && text.trim()) {
        return [text.trim()];
    }
    
    return result;
    
};

export const generateSpeech = async (config: AudioConfig): Promise<string> => {
    const actualModel = resolveModel(config.model, 'audio');

    if (actualModel.startsWith('SIMULATION:')) {
        return simulateGeneration(actualModel, 'audio', config.text);
    }

    // 默认使用 AI Gateway - 所有音频模型
    console.log('[Generation Service] Using AI Gateway for audio model:', actualModel);
    return AIGatewayProvider.generateAudioViaGateway({
        model: actualModel,
        text: config.text,
        voice: config.voice
    });
};
