// AI Gateway 服务 - 统一的API调用接口
import { getEndpointSchema, validateAndCompleteRequest } from './apiSpecService';

// 在开发环境使用代理，生产环境使用直接URL
const isDevelopment = (import.meta as any).env?.DEV || false;
const API_BASE_URL = isDevelopment 
    ? '/ai-gateway/v1'  // 开发环境使用代理
    : 'https://ai-gateway.eyewind.com/v1';  // 生产环境直接访问

// 缓存API token
let cachedApiToken: string | null = null;

/**
 * 从 API Spec 获取 API Token
 */
const getApiToken = async (): Promise<string> => {
    if (cachedApiToken) {
        return cachedApiToken || '';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api-spec`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            console.warn('[AI Gateway] Failed to fetch API spec, using without token');
            return '';
        }

        const spec = await response.json();
        cachedApiToken = spec.api_token || '';
        
        if (cachedApiToken) {
            console.log('[AI Gateway] API token retrieved successfully');
        }
        
        return cachedApiToken || '';
    } catch (error) {
        console.error('[AI Gateway] Error fetching API token:', error);
        return '';
    }
};

/**
 * 视频生成
 */
export const generateVideoViaGateway = async (params: {
    model: string;
    prompt: string;
    aspectRatio?: string;
    resolution?: string;
    duration?: number;
    referenceImage?: string;  // 添加参考图片支持
}): Promise<string> => {
    try {
        const apiToken = await getApiToken();
        
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        
        if (apiToken) {
            headers['Authorization'] = `Bearer ${apiToken}`;
        }

        // 获取 API 规范中的 schema
        const schema = await getEndpointSchema('/v1/videos/generations', 'post');
        
        console.log('[AI Gateway] Schema properties:', schema?.properties);
        
        // 根据不同模型调整 duration 值
        let adjustedDuration: number | string = params.duration || 5;
        
        // 如果有 schema，使用 schema 中的枚举值
        if (schema?.properties?.duration?.enum) {
            const validDurations = schema.properties.duration.enum;
            console.log('[AI Gateway] Valid durations from API spec:', validDurations);
            console.log('[AI Gateway] Original duration:', params.duration);
            
            // 将 duration 转换为字符串（API 可能要求字符串格式）
            const durationStr = String(adjustedDuration);
            
            // 检查是否在有效列表中
            if (!validDurations.includes(durationStr) && !validDurations.includes(adjustedDuration)) {
                // 找到最接近的有效值
                const numericDurations = validDurations.map((d: any) => typeof d === 'string' ? parseInt(d) : d);
                const currentDuration = typeof adjustedDuration === 'string' ? parseInt(adjustedDuration) : adjustedDuration;
                const closestDuration = numericDurations.reduce((prev: number, curr: number) => {
                    return Math.abs(curr - currentDuration) < Math.abs(prev - currentDuration) ? curr : prev;
                });
                
                // 使用原始格式（字符串或数字）
                adjustedDuration = validDurations.find((d: any) => 
                    (typeof d === 'string' ? parseInt(d) : d) === closestDuration
                ) || closestDuration;
            } else if (validDurations.includes(durationStr)) {
                adjustedDuration = durationStr;
            }
            
            console.log(`[AI Gateway] Adjusted duration to: ${adjustedDuration} (type: ${typeof adjustedDuration})`);
        }

        // 根据 schema 调整 resolution 值
        let adjustedResolution = params.resolution;
        
        if (schema?.properties?.resolution?.enum && params.resolution) {
            const validResolutions = schema.properties.resolution.enum;
            console.log('[AI Gateway] Valid resolutions from API spec:', validResolutions);
            console.log('[AI Gateway] Original resolution:', params.resolution);
            
            // 检查当前值是否有效（不区分大小写）
            const resolutionLower = params.resolution.toLowerCase();
            const validResolution = validResolutions.find((r: string) => 
                String(r).toLowerCase() === resolutionLower
            );
            
            if (validResolution) {
                adjustedResolution = validResolution;
            } else {
                // 如果不在有效列表中，选择最接近的
                // 优先级: 1080p > 720p > 480p
                const findResolution = (pattern: string) => 
                    validResolutions.find((r: string) => String(r).toLowerCase().includes(pattern));
                
                if (resolutionLower.includes('1080')) {
                    adjustedResolution = findResolution('1080') || findResolution('720') || findResolution('480') || validResolutions[0];
                } else if (resolutionLower.includes('720')) {
                    adjustedResolution = findResolution('720') || findResolution('480') || validResolutions[0];
                } else if (resolutionLower.includes('480')) {
                    adjustedResolution = findResolution('480') || findResolution('720') || validResolutions[0];
                } else {
                    // 使用第一个有效值
                    adjustedResolution = validResolutions[0];
                }
            }
            
            console.log(`[AI Gateway] Adjusted resolution to: ${adjustedResolution}`);
        }

        // 构建请求体
        let requestBody: any = {
            model: params.model,
            prompt: params.prompt,
        };
        
        // 添加可选字段
        if (params.aspectRatio) {
            requestBody.aspect_ratio = params.aspectRatio;
        }
        if (adjustedResolution) {
            requestBody.resolution = adjustedResolution;
        }
        if (adjustedDuration) {
            requestBody.duration = adjustedDuration;
        }
        if (params.referenceImage) {
            requestBody.reference_image = params.referenceImage;
        }

        // 使用 schema 验证和补全请求体
        if (schema) {
            const validation = validateAndCompleteRequest(requestBody, schema);
            
            if (!validation.valid) {
                console.error('[AI Gateway] Request validation errors:', validation.errors);
                throw new Error(`Invalid request: ${validation.errors.join(', ')}`);
            }
            
            requestBody = validation.completed;
            console.log('[AI Gateway] Request validated and completed:', requestBody);
        }

        console.log('[AI Gateway] Generating video:', requestBody);

        const response = await fetch(`${API_BASE_URL}/videos/generations`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || JSON.stringify(errorData) || response.statusText;
            throw new Error(`Video generation failed: ${response.status} ${errorMessage}`);
        }

        const data = await response.json();
        
        // 处理异步任务 - 支持 job_id 或 id 字段
        const jobId = data.job_id || data.id;
        if (jobId) {
            console.log('[AI Gateway] Video generation job created:', jobId);
            return await pollVideoJob(jobId, apiToken);
        }
        
        // 直接返回结果
        if (data.video_url) {
            return data.video_url;
        }
        
        throw new Error('No video URL or job ID returned from API');
    } catch (error) {
        console.error('[AI Gateway] Video generation error:', error);
        throw error;
    }
};

/**
 * 轮询视频生成任务状态
 */
const pollVideoJob = async (jobId: string, apiToken: string, maxAttempts = 60): Promise<string> => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    
    if (apiToken) {
        headers['Authorization'] = `Bearer ${apiToken}`;
    }

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒

        try {
            const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
                method: 'GET',
                headers
            });

            if (!response.ok) {
                throw new Error(`Failed to check job status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status === 'completed' && data.result?.video_url) {
                console.log('[AI Gateway] Video generation completed');
                return data.result.video_url;
            }
            
            if (data.status === 'failed') {
                throw new Error(data.error || 'Video generation failed');
            }
            
            console.log(`[AI Gateway] Job ${jobId} status: ${data.status} (${data.progress || 0}%)`);
        } catch (error) {
            console.error('[AI Gateway] Error polling job:', error);
            throw error;
        }
    }
    
    throw new Error('Video generation timed out');
};

/**
 * 图像生成
 */
export const generateImageViaGateway = async (params: {
    model: string;
    prompt: string;
    size?: string;
}): Promise<string> => {
    try {
        const apiToken = await getApiToken();
        
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        
        if (apiToken) {
            headers['Authorization'] = `Bearer ${apiToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/images/generations`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: params.model,
                prompt: params.prompt,
                n: 1,
                size: params.size || '1024x1024'
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Image generation failed: ${response.status} ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.data?.[0]?.url || data.data?.[0]?.b64_json || '';
    } catch (error) {
        console.error('[AI Gateway] Image generation error:', error);
        throw error;
    }
};

/**
 * 音频生成
 */
export const generateAudioViaGateway = async (params: {
    model: string;
    text: string;
    voice?: string;
}): Promise<string> => {
    try {
        const apiToken = await getApiToken();
        
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        
        if (apiToken) {
            headers['Authorization'] = `Bearer ${apiToken}`;
        }

        // 获取 API 规范中的 schema
        const schema = await getEndpointSchema('/v1/audio/generations', 'post');

        // 确保文本至少 10 个字符
        let textContent = params.text;
        if (textContent.length < 10) {
            textContent = textContent + '，请为我生成这段音频内容。';
        }

        // 构建请求体
        let requestBody: any = {
            model: params.model,
            prompt: textContent,
        };
        
        // 如果有 lyrics，添加到请求中（用于音乐生成）
        if (textContent) {
            requestBody.lyrics = textContent;
        }

        // 使用 schema 验证和补全请求体
        if (schema) {
            const validation = validateAndCompleteRequest(requestBody, schema);
            
            if (!validation.valid) {
                console.error('[AI Gateway] Audio request validation errors:', validation.errors);
                throw new Error(`Invalid request: ${validation.errors.join(', ')}`);
            }
            
            requestBody = validation.completed;
            console.log('[AI Gateway] Audio request validated and completed:', requestBody);
        }

        console.log('[AI Gateway] Generating audio:', requestBody);

        const response = await fetch(`${API_BASE_URL}/audio/generations`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || JSON.stringify(errorData) || response.statusText;
            throw new Error(`Audio generation failed: ${response.status} ${errorMessage}`);
        }

        const data = await response.json();
        
        // 处理异步任务 - 支持 job_id 或 id 字段
        const jobId = data.job_id || data.id;
        if (jobId) {
            console.log('[AI Gateway] Audio generation job created:', jobId);
            return await pollAudioJob(jobId, apiToken);
        }
        
        // 直接返回结果
        if (data.audio_url || data.url) {
            return data.audio_url || data.url;
        }
        
        throw new Error('No audio URL or job ID returned from API');
    } catch (error) {
        console.error('[AI Gateway] Audio generation error:', error);
        throw error;
    }
};

/**
 * 轮询音频生成任务状态
 */
const pollAudioJob = async (jobId: string, apiToken: string, maxAttempts = 60): Promise<string> => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    
    if (apiToken) {
        headers['Authorization'] = `Bearer ${apiToken}`;
    }

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒

        try {
            const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
                method: 'GET',
                headers
            });

            if (!response.ok) {
                throw new Error(`Failed to check job status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status === 'completed' && (data.result?.audio_url || data.result?.url)) {
                console.log('[AI Gateway] Audio generation completed');
                return data.result.audio_url || data.result.url;
            }
            
            if (data.status === 'failed') {
                throw new Error(data.error || 'Audio generation failed');
            }
            
            console.log(`[AI Gateway] Job ${jobId} status: ${data.status} (${data.progress || 0}%)`);
        } catch (error) {
            console.error('[AI Gateway] Error polling job:', error);
            throw error;
        }
    }
    
    throw new Error('Audio generation timed out');
};

/**
 * 清除缓存
 */
export const clearGatewayCache = () => {
    cachedApiToken = null;
    console.log('[AI Gateway] Cache cleared');
};
