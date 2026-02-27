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
}): Promise<string> => {
    try {
        const apiToken = await getApiToken();
        
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        
        if (apiToken) {
            headers['Authorization'] = `Bearer ${apiToken}`;
        }

        // 根据不同模型调整 duration 值
        // aimlapi 的某些模型只支持 4, 6, 8 秒
        let adjustedDuration = params.duration || 4;
        
        // 如果模型包含特定关键词，映射到支持的值
        const modelLower = params.model.toLowerCase();
        if (modelLower.includes('veo') || modelLower.includes('runway') || modelLower.includes('kling')) {
            // 这些模型可能只支持 4, 6, 8
            if (adjustedDuration <= 4) adjustedDuration = 4;
            else if (adjustedDuration <= 6) adjustedDuration = 6;
            else adjustedDuration = 8;
        }

        const requestBody: any = {
            model: params.model,
            prompt: params.prompt,
        };
        
        // 只在有值时添加可选字段
        if (params.aspectRatio) {
            requestBody.aspect_ratio = params.aspectRatio;
        }
        if (params.resolution) {
            requestBody.resolution = params.resolution;
        }
        if (adjustedDuration) {
            requestBody.duration = adjustedDuration;
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

        // 确保文本至少 10 个字符
        let textContent = params.text;
        if (textContent.length < 10) {
            textContent = textContent + '，请为我生成这段音频内容。';
        }

        const requestBody: any = {
            model: params.model,
            prompt: textContent,
            lyrics: textContent,  // lyrics 也需要至少 10 个字符
        };
        
        if (params.voice) {
            requestBody.voice = params.voice;
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
        
        // 处理异步任务
        if (data.job_id) {
            console.log('[AI Gateway] Audio generation job created:', data.job_id);
            return await pollAudioJob(data.job_id, apiToken);
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
