// AI Gateway 服务 - 统一的API调用接口

// 在开发环境使用代理，生产环境使用直接URL
const isDevelopment = (import.meta as any).env?.DEV || false;
const API_BASE_URL = isDevelopment 
    ? '/ai-gateway/v1'
    : 'https://ai-gateway.eyewind.com/v1';

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
            console.warn('[AI Gateway] Failed to fetch API spec, using without token');
            return '';
        }

        const spec = await response.json();
        cachedApiToken = spec.api_token || '';
        
        if (cachedApiToken) {
            console.log('[AI Gateway] API token retrieved successfully');
        }
        
        return cachedApiToken;
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
}): Promise<string> => {
    try {
        const apiToken = await getApiToken();
        
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        
        if (apiToken) {
            headers['Authorization'] = `Bearer ${apiToken}`;
        }

        const requestBody = {
            model: params.model,
            prompt: params.prompt,
            ...(params.aspectRatio && { aspect_ratio: params.aspectRatio }),
            ...(params.resolution && { resolution: params.resolution }),
            ...(params.duration && { duration: params.duration }),
        };

        console.log('[AI Gateway] Generating video:', requestBody);

        const response = await fetch(`${API_BASE_URL}/videos/generations`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Video generation failed: ${response.status} ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        // 处理异步任务
        if (data.job_id) {
            console.log('[AI Gateway] Video generation job created:', data.job_id);
            return await pollVideoJob(data.job_id, apiToken);
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
 * 清除缓存
 */
export const clearGatewayCache = () => {
    cachedApiToken = null;
    console.log('[AI Gateway] Cache cleared');
};
