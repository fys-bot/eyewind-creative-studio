// 模型服务 - 从 AI Gateway 动态获取模型列表

// 在开发环境使用代理，生产环境使用直接URL
const isDevelopment = (import.meta as any).env?.DEV || false;
const API_BASE_URL = isDevelopment 
    ? '/ai-gateway/v1'  // 开发环境使用代理
    : 'https://ai-gateway.eyewind.com/v1';  // 生产环境直接访问

export interface AIModel {
    id: string;
    object: string;
    created?: number;
    owned_by?: string;
    // 自定义字段
    type?: 'video' | 'audio' | 'image' | 'text';
    provider?: string;
    label?: string;
}

interface ModelsResponse {
    object: string;
    data: AIModel[];
}

interface ApiSpec {
    api_token?: string;
    components?: any;
}

// 缓存模型列表
let cachedModels: AIModel[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 缓存API token
let cachedApiToken: string | null = null;

/**
 * 从 API Spec 获取 API Token
 */
const getApiToken = async (): Promise<string> => {
    if (cachedApiToken) {
        return cachedApiToken;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api-spec`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            console.warn('[Model Service] Failed to fetch API spec, using without token');
            return '';
        }

        const spec: ApiSpec = await response.json();
        cachedApiToken = spec.api_token || '';
        
        if (cachedApiToken) {
            console.log('[Model Service] API token retrieved successfully');
        }
        
        return cachedApiToken;
    } catch (error) {
        console.error('[Model Service] Error fetching API token:', error);
        return '';
    }
}

/**
 * 从 AI Gateway 获取模型列表
 */
export const fetchModelsFromGateway = async (): Promise<AIModel[]> => {
    // 检查缓存
    const now = Date.now();
    if (cachedModels && (now - lastFetchTime) < CACHE_DURATION) {
        return cachedModels;
    }

    try {
        // 获取API token
        const apiToken = await getApiToken();
        
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        
        // 如果有token，添加到请求头
        if (apiToken) {
            headers['Authorization'] = `Bearer ${apiToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/models`, {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
        }

        const data: ModelsResponse = await response.json();
        
        // 处理和分类模型
        const models = data.data.map(model => {
            // 根据模型ID推断类型
            const modelId = model.id.toLowerCase();
            let type: 'video' | 'audio' | 'image' | 'text' = 'text';
            let provider = model.owned_by || 'Unknown';
            let label = model.id;

            // 视频模型识别
            if (modelId.includes('veo') || 
                modelId.includes('video') || 
                modelId.includes('gen-3') || 
                modelId.includes('runway') ||
                modelId.includes('kling') ||
                modelId.includes('seedance') ||
                modelId.includes('motion')) {
                type = 'video';
            }
            // 音频模型识别
            else if (modelId.includes('tts') || 
                     modelId.includes('audio') || 
                     modelId.includes('speech') ||
                     modelId.includes('whisper')) {
                type = 'audio';
            }
            // 图像模型识别
            else if (modelId.includes('dall-e') || 
                     modelId.includes('imagen') || 
                     modelId.includes('midjourney') ||
                     modelId.includes('stable-diffusion') ||
                     modelId.includes('flux')) {
                type = 'image';
            }

            // 生成友好的标签
            if (modelId.includes('veo')) {
                if (modelId.includes('fast')) {
                    label = 'Veo Fast (Preview)';
                    provider = 'Google';
                } else if (modelId.includes('hq') || modelId.includes('high')) {
                    label = 'Veo High Quality';
                    provider = 'Google';
                }
            } else if (modelId.includes('gen-3') || modelId.includes('runway')) {
                label = 'Gen-3 Alpha';
                provider = 'Runway';
            } else if (modelId.includes('kling')) {
                label = 'Kling 1.5';
                provider = 'Kling AI';
            } else if (modelId.includes('seedance')) {
                label = 'Doubao Seedance 1.5 Pro';
                provider = 'Volcengine';
            } else if (modelId.includes('motion') && modelId.includes('turbo')) {
                label = 'Motion Turbo';
                provider = 'Eyewind';
            } else if (modelId.includes('gpt')) {
                label = model.id.toUpperCase();
                provider = 'OpenAI';
            } else if (modelId.includes('claude')) {
                label = 'Claude ' + modelId.split('-').slice(-2).join(' ');
                provider = 'Anthropic';
            }

            return {
                ...model,
                type,
                provider,
                label
            };
        });

        // 去重：使用模型ID作为唯一标识
        const uniqueModels = Array.from(
            new Map(models.map(m => [m.id, m])).values()
        );

        // 调试日志：显示去重前后的模型
        if (models.length !== uniqueModels.length) {
            console.log(`[Model Service] Removed ${models.length - uniqueModels.length} duplicate models`);
            
            // 找出重复的模型ID
            const modelIds = models.map(m => m.id);
            const duplicates = modelIds.filter((id, index) => modelIds.indexOf(id) !== index);
            if (duplicates.length > 0) {
                console.log('[Model Service] Duplicate model IDs:', [...new Set(duplicates)]);
            }
        }

        cachedModels = uniqueModels;
        lastFetchTime = now;
        
        console.log(`[Model Service] Fetched ${uniqueModels.length} unique models from gateway (${models.length} total)`);
        return uniqueModels;
    } catch (error) {
        console.error('[Model Service] Failed to fetch models:', error);
        
        // 返回空数组，让应用使用本地默认模型
        return [];
    }
};

/**
 * 获取特定类型的模型
 */
export const getModelsByType = async (type: 'video' | 'audio' | 'image' | 'text'): Promise<AIModel[]> => {
    const models = await fetchModelsFromGateway();
    return models.filter(m => m.type === type);
};

/**
 * 获取视频模型列表
 */
export const getVideoModels = async (): Promise<AIModel[]> => {
    return getModelsByType('video');
};

/**
 * 获取音频模型列表
 */
export const getAudioModels = async (): Promise<AIModel[]> => {
    return getModelsByType('audio');
};

/**
 * 获取图像模型列表
 */
export const getImageModels = async (): Promise<AIModel[]> => {
    return getModelsByType('image');
};

/**
 * 获取文本模型列表
 */
export const getTextModels = async (): Promise<AIModel[]> => {
    return getModelsByType('text');
};

/**
 * 清除缓存
 */
export const clearModelCache = () => {
    cachedModels = null;
    lastFetchTime = 0;
    cachedApiToken = null;
    console.log('[Model Service] Cache cleared');
};
