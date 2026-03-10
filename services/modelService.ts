// 模型服务 - 从 AI Gateway 动态获取模型列表
// 接口文档: GET /v1/models (无需认证)
// 接口文档: GET /v1/docs-json?model={model_id} (无需认证)

const isDevelopment = (import.meta as any).env?.DEV || false;
const API_BASE_URL = isDevelopment 
    ? '/ai-gateway/v1'
    : 'https://ai-gateway.eyewind.com/v1';

// === 类型定义 ===

export interface ModelInfo {
    name: string;
    developer: string;
    description?: string;
    context_length?: number;
    docs_url?: string;
    url?: string;
}

export interface AIModel {
    id: string;
    provider: string;
    type: string;           // API 原始类型: Chat, Image, Video, TTS, Audio, Embedding, Other
    info: ModelInfo;
    tags?: string[];
    aliases?: string[];
    // 内部使用的标准化字段
    normalizedType?: 'video' | 'audio' | 'image' | 'text';
    label?: string;
    object?: string;
    owned_by?: string;
    name?: string;
    description?: string;
}

export interface ModelSchema {
    model_id: string;
    name: string;
    type: string;
    developer?: string;
    provider?: string;
    api_schema: {
        endpoint: string;
        method: string;
        async_flow?: {
            submit_endpoint: string;
            poll_endpoint: string;
            poll_method: string;
        };
        parameters: ModelParameter[];
        example_request?: any;
    };
    capabilities?: Record<string, any>;
}

export interface ModelParameter {
    name: string;
    type: string;
    required: boolean;
    enum?: (string | number)[];
    default?: any;
    minimum?: number;
    maximum?: number;
    maxLength?: number;
    description?: string;
    format?: string;
}

interface ModelsResponse {
    object: string;
    data: AIModel[];
}

// === 缓存 ===

let cachedModels: AIModel[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟

// 模型 Schema 缓存 (per model)
const schemaCache = new Map<string, { data: ModelSchema; time: number }>();
const SCHEMA_CACHE_DURATION = 10 * 60 * 1000; // 10分钟

// API Token 缓存
let cachedApiToken: string | null = null;

// === 类型映射 ===

/** 将 API 返回的 type 字段映射为内部标准化类型 */
const normalizeModelType = (apiType: string): 'video' | 'audio' | 'image' | 'text' => {
    const t = apiType.toLowerCase();
    if (t === 'video') return 'video';
    if (t === 'image') return 'image';
    if (t === 'audio' || t === 'tts' || t === 'stt') return 'audio';
    // Chat, Embedding, Other, language 等都归为 text
    return 'text';
};

/** 标准化 provider/developer 名称 */
const normalizeDeveloper = (developer: string): string => {
    const d = developer.toLowerCase();
    if (d.includes('open ai') || d.includes('openai')) return 'OpenAI';
    if (d.includes('google')) return 'Google';
    if (d.includes('anthropic')) return 'Anthropic';
    if (d.includes('meta')) return 'Meta';
    if (d.includes('runway')) return 'Runway';
    if (d.includes('kuaishou') || d.includes('kling')) return 'Kling AI';
    if (d.includes('bytedance') || d.includes('volcengine')) return 'ByteDance';
    if (d.includes('eyewind')) return 'Eyewind';
    if (d.includes('luma')) return 'Luma';
    if (d.includes('minimax')) return 'MiniMax';
    if (d.includes('alibaba') || d.includes('qwen')) return 'Alibaba';
    if (d.includes('stability') || d.includes('stable')) return 'Stability AI';
    if (d.includes('black forest') || d.includes('flux')) return 'Black Forest Labs';
    if (d.includes('deepseek')) return 'DeepSeek';
    if (d.includes('mistral')) return 'Mistral';
    if (d.includes('tencent') || d.includes('hunyuan')) return 'Tencent';
    if (d.includes('baidu')) return 'Baidu';
    if (d.includes('zhipu')) return 'Zhipu AI';
    if (d.includes('x ai') || d.includes('xai') || d.includes('grok')) return 'X AI';
    if (d.includes('microsoft')) return 'Microsoft';
    if (d.includes('nvidia')) return 'Nvidia';
    if (d.includes('cohere')) return 'Cohere';
    if (d.includes('elevenlabs')) return 'ElevenLabs';
    if (d.includes('recraft')) return 'Recraft AI';
    if (d.includes('reve')) return 'Reve AI';
    if (d.includes('pixverse')) return 'Pixverse';
    if (d.includes('sber')) return 'Sber AI';
    if (d.includes('hume')) return 'Hume AI';
    if (d.includes('together')) return 'Together AI';
    if (d.includes('perplexity')) return 'Perplexity';
    if (d.includes('xiaomi')) return 'Xiaomi';
    if (d.includes('topaz')) return 'Topaz Labs';
    if (d.includes('krea')) return 'Krea';
    if (d.includes('veed')) return 'VEED';
    if (d.includes('tripo')) return 'Tripo AI';
    if (d.includes('magic')) return 'Magic Inc';
    if (d.includes('inworld')) return 'Inworld AI';
    if (d.includes('assemblyai')) return 'AssemblyAI';
    if (d.includes('deepgram')) return 'Deepgram';
    return developer;
};

// === API Token ===

// 默认 fallback token（当 /v1/api-spec 不可用时使用）
const FALLBACK_API_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3Njk1MDI5MTMsImV4cCI6MTg2NDExMDkxMywiYXBwaWQiOiJkZXYiLCJ0eXAiOiJhcGkifQ.SMnJiua1U_Z7VYpqG9yO-DAGox4nMQZsW53TeM3Ea3s';

/**
 * 获取 API Token（用于生成请求的认证）
 * 优先: 缓存 > window全局 > /v1/api-spec > fallback
 */
export const getApiToken = async (): Promise<string> => {
    if (cachedApiToken) return cachedApiToken;

    // 检查全局缓存
    try {
        if ((window as any).__ai_gateway_token) {
            cachedApiToken = (window as any).__ai_gateway_token;
            return cachedApiToken!;
        }
    } catch {}

    // 尝试从 api-spec 获取 token
    try {
        const response = await fetch(`${API_BASE_URL}/api-spec`, { method: 'GET' });
        if (response.ok) {
            const spec = await response.json();
            if (spec.api_token) {
                cachedApiToken = spec.api_token;
                (window as any).__ai_gateway_token = cachedApiToken;
                console.log('[Model Service] API token retrieved from api-spec');
                return cachedApiToken!;
            }
        }
    } catch (error) {
        console.warn('[Model Service] Could not fetch API token from api-spec:', error);
    }

    // 使用 fallback token
    console.warn('[Model Service] Using fallback API token');
    cachedApiToken = FALLBACK_API_TOKEN;
    (window as any).__ai_gateway_token = cachedApiToken;
    return cachedApiToken;
};

// === 模型列表 ===

/**
 * 从 AI Gateway 获取模型列表
 * GET /v1/models (无需认证)
 */
export const fetchModelsFromGateway = async (): Promise<AIModel[]> => {
    const now = Date.now();
    if (cachedModels && (now - lastFetchTime) < CACHE_DURATION) {
        return cachedModels;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/models`, { method: 'GET' });

        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
        }

        const data: ModelsResponse = await response.json();
        
        const models = data.data.map(model => {
            // 使用 API 返回的 info.name 作为显示标签
            const label = model.info?.name || model.id;
            const developer = model.info?.developer || model.provider || 'Unknown';
            const normalizedType = normalizeModelType(model.type || 'Other');
            const normalizedDev = normalizeDeveloper(developer);

            return {
                ...model,
                normalizedType,
                label,
                // 兼容旧字段
                name: model.info?.name,
                description: model.info?.description,
                owned_by: normalizedDev,
                provider: normalizedDev,
            };
        });

        // 按 model.id 去重
        const uniqueModels = Array.from(
            new Map(models.map(m => [m.id, m])).values()
        );

        cachedModels = uniqueModels;
        lastFetchTime = now;
        
        console.log(`[Model Service] Fetched ${uniqueModels.length} models (${models.length} total)`);
        return uniqueModels;
    } catch (error) {
        console.error('[Model Service] Failed to fetch models:', error);
        return cachedModels || [];
    }
};

// === 模型 Schema (docs-json) ===

/**
 * 获取指定模型的 API Schema
 * GET /v1/docs-json?model={model_id} (无需认证)
 */
export const getModelSchema = async (modelId: string): Promise<ModelSchema | null> => {
    // 检查缓存
    const cached = schemaCache.get(modelId);
    if (cached && (Date.now() - cached.time) < SCHEMA_CACHE_DURATION) {
        console.log(`[Model Service] Schema cache hit for ${modelId}`);
        return cached.data;
    }

    const url = `${API_BASE_URL}/docs-json?model=${encodeURIComponent(modelId)}`;
    console.log(`[Model Service] Fetching schema: ${url}`);

    try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`[Model Service] Model schema not found: ${modelId}`);
                return null;
            }
            const errorText = await response.text().catch(() => '');
            throw new Error(`Failed to fetch model schema: ${response.status} ${errorText}`);
        }

        const schema: ModelSchema = await response.json();
        schemaCache.set(modelId, { data: schema, time: Date.now() });
        
        console.log(`[Model Service] Schema loaded for ${modelId}: endpoint=${schema.api_schema?.endpoint}, params=[${schema.api_schema?.parameters?.map(p => p.name).join(', ')}]`);
        return schema;
    } catch (error) {
        console.error(`[Model Service] Failed to fetch schema for ${modelId}:`, error);
        
        // 如果是开发环境代理失败，尝试直接请求生产地址
        if (isDevelopment) {
            try {
                const directUrl = `https://ai-gateway.eyewind.com/v1/docs-json?model=${encodeURIComponent(modelId)}`;
                console.log(`[Model Service] Retrying with direct URL: ${directUrl}`);
                const response = await fetch(directUrl, { method: 'GET' });
                if (response.ok) {
                    const schema: ModelSchema = await response.json();
                    schemaCache.set(modelId, { data: schema, time: Date.now() });
                    console.log(`[Model Service] Schema loaded (direct) for ${modelId}: endpoint=${schema.api_schema?.endpoint}`);
                    return schema;
                }
            } catch (directError) {
                console.error(`[Model Service] Direct fetch also failed for ${modelId}:`, directError);
            }
        }
        
        return null;
    }
};

/**
 * 根据模型 Schema 验证和补全请求参数
 */
export const validateRequestWithSchema = (
    requestBody: any, 
    schema: ModelSchema
): { valid: boolean; completed: any; errors: string[] } => {
    const errors: string[] = [];
    const completed = { ...requestBody };
    const params = schema.api_schema?.parameters || [];

    // 检查必需字段
    for (const param of params) {
        if (param.required && !(param.name in completed)) {
            errors.push(`Missing required field: ${param.name}`);
        }
    }

    // 添加默认值 & 验证枚举
    for (const param of params) {
        const key = param.name;
        
        // 添加默认值
        if (!(key in completed) && param.default !== undefined) {
            completed[key] = param.default;
        }

        // 验证枚举值
        if (key in completed && param.enum && param.enum.length > 0) {
            const val = completed[key];
            // 同时检查原始值和字符串/数字转换
            const isValid = param.enum.some(e => 
                e === val || String(e) === String(val)
            );
            if (!isValid) {
                errors.push(`Invalid value for ${key}: ${val}. Must be one of: ${param.enum.join(', ')}`);
            }
        }

        // 验证数值范围
        if (key in completed && typeof completed[key] === 'number') {
            if (param.minimum !== undefined && completed[key] < param.minimum) {
                errors.push(`${key} must be >= ${param.minimum}`);
            }
            if (param.maximum !== undefined && completed[key] > param.maximum) {
                errors.push(`${key} must be <= ${param.maximum}`);
            }
        }

        // 验证字符串长度
        if (key in completed && typeof completed[key] === 'string' && param.maxLength) {
            if (completed[key].length > param.maxLength) {
                errors.push(`${key} exceeds max length of ${param.maxLength}`);
            }
        }
    }

    return { valid: errors.length === 0, completed, errors };
};

/**
 * 根据模型 Schema 生成请求示例
 */
export const generateExampleRequest = (schema: ModelSchema): any => {
    if (schema.api_schema?.example_request) {
        return schema.api_schema.example_request;
    }

    const example: any = {};
    for (const param of schema.api_schema?.parameters || []) {
        if (param.required || param.default !== undefined) {
            if (param.default !== undefined) {
                example[param.name] = param.default;
            } else if (param.enum && param.enum.length > 0) {
                example[param.name] = param.enum[0];
            } else if (param.type === 'string') {
                example[param.name] = param.description || `example_${param.name}`;
            } else if (param.type === 'integer' || param.type === 'number') {
                example[param.name] = param.minimum || 1;
            } else if (param.type === 'boolean') {
                example[param.name] = false;
            } else if (param.type === 'array') {
                example[param.name] = [];
            }
        }
    }
    return example;
};

// === 按类型筛选 ===

export const getModelsByType = async (type: 'video' | 'audio' | 'image' | 'text'): Promise<AIModel[]> => {
    const models = await fetchModelsFromGateway();
    return models.filter(m => m.normalizedType === type);
};

export const getVideoModels = async (): Promise<AIModel[]> => getModelsByType('video');
export const getAudioModels = async (): Promise<AIModel[]> => getModelsByType('audio');
export const getImageModels = async (): Promise<AIModel[]> => getModelsByType('image');
export const getTextModels = async (): Promise<AIModel[]> => getModelsByType('text');

// === 缓存管理 ===

export const clearModelCache = () => {
    cachedModels = null;
    lastFetchTime = 0;
    cachedApiToken = null;
    schemaCache.clear();
    console.log('[Model Service] Cache cleared');
};
