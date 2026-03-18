// AI Gateway 服务 - 统一的API调用接口
// 使用 /v1/docs-json?model={id} 动态获取每个模型的 API Schema
// 所有异步轮询统一使用 /v1/jobs/{job_id}
import { getModelSchema, validateRequestWithSchema, getApiToken } from './modelService';

const isDevelopment = (import.meta as any).env?.DEV || false;
const API_BASE_URL = isDevelopment 
    ? '/ai-gateway/v1'
    : 'https://ai-gateway.eyewind.com/v1';

// === 通用辅助 ===

/** 构建带认证的请求头 */
const buildHeaders = async (): Promise<HeadersInit> => {
    const token = await getApiToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

/** 转换相对路径为完整URL */
const toFullUrl = (path: string): string => {
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
    if (path.startsWith('/uploads/') || path.startsWith('uploads/')) {
        return `${window.location.origin}${path.startsWith('/') ? '' : '/'}${path}`;
    }
    return path;
};

/** 从 schema 参数中找到最接近的有效枚举值 */
const findClosestEnumValue = (value: any, enumValues: any[]): any => {
    if (!enumValues || enumValues.length === 0) return value;
    const exact = enumValues.find(e => e === value || String(e) === String(value));
    if (exact !== undefined) return exact;
    const numVal = Number(value);
    if (!isNaN(numVal)) {
        const numEnums = enumValues.map(Number).filter(n => !isNaN(n));
        if (numEnums.length > 0) {
            return numEnums.reduce((prev, curr) => 
                Math.abs(curr - numVal) < Math.abs(prev - numVal) ? curr : prev
            );
        }
    }
    return enumValues[0];
};

// === 视频生成 ===

export const generateVideoViaGateway = async (params: {
    model: string;
    prompt: string;
    aspectRatio?: string;
    resolution?: string;
    duration?: number;
    referenceImage?: string;
    startImage?: string;
    endImage?: string;
}): Promise<string> => {
    try {
        console.log('[AI Gateway] Video input:', params);
        const headers = await buildHeaders();

        // 获取该模型的 API Schema
        const schema = await getModelSchema(params.model);
        const apiParams = schema?.api_schema?.parameters || [];
        // 视频端点统一使用 /v1/videos/generations，忽略 schema 返回的端点
        const endpoint = '/v1/videos/generations';

        console.log('[AI Gateway] Video schema:', { endpoint, paramCount: apiParams.length });

        // 构建请求体 - 基于 schema 参数动态构建
        let requestBody: any = {
            model: params.model,
            prompt: params.prompt,
            async_mode: true, // 视频生成始终使用异步模式
        };

        const paramMap = new Map(apiParams.map(p => [p.name, p]));

        // aspect_ratio
        if (params.aspectRatio) {
            requestBody.aspect_ratio = params.aspectRatio;
        } else if (paramMap.has('aspect_ratio')) {
            requestBody.aspect_ratio = paramMap.get('aspect_ratio')!.default || '16:9';
        }

        // resolution
        if (params.resolution) {
            requestBody.resolution = params.resolution;
        } else if (paramMap.has('resolution')) {
            requestBody.resolution = paramMap.get('resolution')!.default || '720p';
        }

        // duration
        if (params.duration) {
            requestBody.duration = params.duration;
        } else if (paramMap.has('duration')) {
            requestBody.duration = paramMap.get('duration')!.default || 5;
        }

        // cfg_scale
        if (paramMap.has('cfg_scale')) {
            requestBody.cfg_scale = paramMap.get('cfg_scale')!.default ?? 0.5;
        }

        // negative_prompt
        if (paramMap.has('negative_prompt')) {
            requestBody.negative_prompt = '';
        }

        // 处理图片输入
        const imageUrl = params.startImage || params.referenceImage;
        if (imageUrl) {
            const fullUrl = toFullUrl(imageUrl);
            if (paramMap.has('image_url')) {
                requestBody.image_url = fullUrl;
            } else if (paramMap.has('reference_image')) {
                requestBody.reference_image = fullUrl;
            } else {
                requestBody.image_url = fullUrl;
            }
        } else {
            const imageUrlParam = paramMap.get('image_url');
            if (imageUrlParam?.required) {
                throw new Error('该模型需要输入图片（image_url 为必填项）。请连接一个图片节点作为起始帧，或选择 text-to-video 类型的模型。');
            }
        }

        if (params.endImage) {
            const endUrl = toFullUrl(params.endImage);
            if (imageUrl) {
                requestBody.keyframes = {
                    frame0: { type: 'image', url: requestBody.image_url || toFullUrl(imageUrl) },
                    frame1: { type: 'image', url: endUrl }
                };
            } else {
                requestBody.image_url = endUrl;
            }
        }

        // 验证请求体
        if (schema) {
            const validation = validateRequestWithSchema(requestBody, schema);
            if (!validation.valid) {
                console.warn('[AI Gateway] Video validation warnings:', validation.errors);
            }
        }

        console.log('[AI Gateway] Video request:', requestBody);

        // 发送请求 - 使用 schema endpoint
        const apiPath = endpoint.replace(/^\/v1/, '');
        const response = await fetch(`${API_BASE_URL}${apiPath}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Video generation failed: ${response.status} ${errorData.error?.message || JSON.stringify(errorData) || response.statusText}`);
        }

        const data = await response.json();
        const jobId = data.job_id || data.id || data.generation_id;
        
        // 有 jobId → 统一用 /v1/jobs/{job_id} 轮询
        if (jobId) {
            console.log('[AI Gateway] Video job created:', jobId);
            return await pollJob(jobId, 'video_url');
        }
        
        // 同步模式 - 直接从响应取结果
        if (data.video_url) return data.video_url;
        if (data.url) return data.url;
        if (data.data?.[0]?.url) return data.data[0].url;
        
        throw new Error('No video URL or job ID returned');
    } catch (error) {
        console.error('[AI Gateway] Video error:', error);
        throw error;
    }
};

// === 图像生成 ===

export const generateImageViaGateway = async (params: {
    model: string;
    prompt: string;
    size?: string;
    aspectRatio?: string;
    resolution?: string;
    referenceImages?: string[];
}): Promise<string> => {
    try {
        console.log('[AI Gateway] Image input:', {
            model: params.model,
            promptLen: params.prompt?.length,
            referenceImages: params.referenceImages?.length || 0,
            refPreview: params.referenceImages?.[0]?.substring(0, 50) || 'none'
        });
        const headers = await buildHeaders();

        // 获取该模型的 API Schema
        const schema = await getModelSchema(params.model);
        const apiParams = schema?.api_schema?.parameters || [];
        const endpoint = schema?.api_schema?.endpoint || '/v1/images/generations';

        const paramMap = new Map(apiParams.map(p => [p.name, p]));

        // 收集参考图
        const refImages = params.referenceImages || [];
        const base64Refs = refImages.filter(img => img.startsWith('data:image'));
        const urlRefs = refImages.filter(img => img.startsWith('http'));
        const allRefs = [...base64Refs, ...urlRefs];
        
        console.log('[AI Gateway] 参考图统计:', { base64: base64Refs.length, url: urlRefs.length, total: allRefs.length });

        // ========== 有参考图时：使用 chat completions 端点（vision 模式） ==========
        if (allRefs.length > 0) {
            console.log('[AI Gateway] 使用 chat completions 模式传递参考图');
            
            // 构建 multimodal content
            const userContent: any[] = [];
            
            // 添加参考图
            for (const ref of allRefs) {
                if (ref.startsWith('data:image')) {
                    // base64 格式
                    userContent.push({
                        type: 'image_url',
                        image_url: { url: ref }
                    });
                } else {
                    // URL 格式
                    userContent.push({
                        type: 'image_url',
                        image_url: { url: ref }
                    });
                }
            }
            
            // 添加文本提示
            userContent.push({
                type: 'text',
                text: params.prompt
            });

            // 尺寸参数
            const sizeInfo: string[] = [];
            if (params.aspectRatio) sizeInfo.push(`aspect ratio: ${params.aspectRatio}`);
            if (params.resolution) sizeInfo.push(`resolution: ${params.resolution}`);
            if (params.size) sizeInfo.push(`size: ${params.size}`);

            const requestBody: any = {
                model: params.model,
                messages: [
                    {
                        role: 'user',
                        content: userContent
                    }
                ],
            };

            // 添加图片生成相关参数
            if (paramMap.has('aspect_ratio')) {
                requestBody.aspect_ratio = params.aspectRatio || paramMap.get('aspect_ratio')!.default || '1:1';
            }
            if (paramMap.has('resolution')) {
                requestBody.resolution = params.resolution || paramMap.get('resolution')!.default || '1K';
            }

            console.log('[AI Gateway] Chat completions request:', {
                model: requestBody.model,
                messageContentTypes: userContent.map(c => c.type),
                hasAspectRatio: !!requestBody.aspect_ratio,
            });

            const response = await fetch(`${API_BASE_URL}/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Image edit failed: ${response.status} ${errorData.error?.message || JSON.stringify(errorData) || response.statusText}`);
            }

            const data = await response.json();
            console.log('[AI Gateway] Chat completions response keys:', Object.keys(data));
            
            // 从 chat completions 响应中提取图片
            // 格式1: choices[0].message.content 包含图片 URL 或 base64
            const content = data.choices?.[0]?.message?.content;
            if (content) {
                // 如果 content 是字符串，可能直接是 URL 或 base64
                if (typeof content === 'string') {
                    if (content.startsWith('http') || content.startsWith('data:image')) {
                        return content;
                    }
                    // 尝试从 markdown 格式提取图片 URL: ![...](url)
                    const mdMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
                    if (mdMatch) return mdMatch[1];
                    
                    // 尝试从文本中提取 URL
                    const urlMatch = content.match(/(https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp)[^\s"'<>]*)/i);
                    if (urlMatch) return urlMatch[1];
                }
                // 如果 content 是数组（multimodal response）
                if (Array.isArray(content)) {
                    for (const part of content) {
                        if (part.type === 'image_url' && part.image_url?.url) {
                            return part.image_url.url;
                        }
                        if (part.type === 'image' && part.image?.url) {
                            return part.image.url;
                        }
                    }
                }
            }
            
            // 格式2: 某些模型在 data 字段返回
            if (data.data?.[0]?.url) return data.data[0].url;
            if (data.data?.[0]?.b64_json) return `data:image/png;base64,${data.data[0].b64_json}`;
            
            // 格式3: job_id 异步模式
            const jobId = data.job_id || data.id;
            if (jobId && !data.choices) {
                return await pollJob(jobId, 'image_url');
            }
            
            console.error('[AI Gateway] 无法从响应中提取图片:', JSON.stringify(data).substring(0, 500));
            throw new Error('No image returned from chat completions response');
        }

        // ========== 无参考图时：使用标准 images/generations 端点 ==========
        let finalPrompt = params.prompt;

        let requestBody: any = {
            model: params.model,
            prompt: finalPrompt,
        };

        // n / num_images
        if (paramMap.has('n')) {
            requestBody.n = 1;
        } else if (paramMap.has('num_images')) {
            requestBody.num_images = 1;
        }

        // aspect_ratio
        if (paramMap.has('aspect_ratio')) {
            const p = paramMap.get('aspect_ratio')!;
            requestBody.aspect_ratio = params.aspectRatio || p.default || '1:1';
        }

        // resolution (1K/2K/4K)
        if (paramMap.has('resolution')) {
            const p = paramMap.get('resolution')!;
            requestBody.resolution = params.resolution || p.default || '1K';
        }

        // size (像素尺寸)
        if (paramMap.has('size')) {
            const p = paramMap.get('size')!;
            const val = params.size || p.default || '1024x1024';
            requestBody.size = p.enum ? findClosestEnumValue(val, p.enum) : val;
        } else if (paramMap.has('image_size')) {
            // 部分模型用 image_size 而非 size
            const p = paramMap.get('image_size')!;
            const val = params.size || p.default || '1024x1024';
            requestBody.image_size = p.enum ? findClosestEnumValue(val, p.enum) : val;
        } else if (!paramMap.has('aspect_ratio') && params.size) {
            requestBody.size = params.size;
        }

        // quality
        if (paramMap.has('quality')) {
            requestBody.quality = paramMap.get('quality')!.default || 'standard';
        }

        // style
        if (paramMap.has('style')) {
            requestBody.style = paramMap.get('style')!.default || 'vivid';
        }

        // async_mode
        if (paramMap.has('async_mode')) {
            requestBody.async_mode = true;
        }

        // 验证
        if (schema) {
            const validation = validateRequestWithSchema(requestBody, schema);
            if (!validation.valid) {
                console.warn('[AI Gateway] Image validation warnings:', validation.errors);
            }
        }

        console.log('[AI Gateway] Image request:', {
            model: requestBody.model,
            promptLen: requestBody.prompt?.length,
            hasImage: !!requestBody.image,
            hasReferenceImage: !!requestBody.reference_image,
            hasReferenceImages: !!requestBody.reference_images,
            size: requestBody.size || requestBody.image_size,
            aspectRatio: requestBody.aspect_ratio,
            resolution: requestBody.resolution,
        });

        const apiPath = endpoint.replace(/^\/v1/, '');
        const response = await fetch(`${API_BASE_URL}${apiPath}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Image generation failed: ${response.status} ${errorData.error?.message || JSON.stringify(errorData) || response.statusText}`);
        }

        const data = await response.json();
        const jobId = data.job_id || data.id || data.generation_id;
        
        // 有 jobId 且没有直接数据 → 统一用 /v1/jobs/{job_id} 轮询
        if (jobId && !data.data) {
            console.log('[AI Gateway] Image job created:', jobId);
            return await pollJob(jobId, 'image_url');
        }
        
        // 同步模式 - 直接返回
        if (data.data?.[0]?.url) return data.data[0].url;
        if (data.data?.[0]?.b64_json) return `data:image/png;base64,${data.data[0].b64_json}`;
        if (data.image_url || data.url) return data.image_url || data.url;
        
        throw new Error('No image URL or job ID returned');
    } catch (error) {
        console.error('[AI Gateway] Image error:', error);
        throw error;
    }
};

// === 音频生成 ===

export const generateAudioViaGateway = async (params: {
    model: string;
    text: string;
    voice?: string;
}): Promise<string> => {
    try {
        console.log('[AI Gateway] Audio input:', params);
        const headers = await buildHeaders();

        // 获取该模型的 API Schema
        const schema = await getModelSchema(params.model);
        const apiParams = schema?.api_schema?.parameters || [];
        const endpoint = schema?.api_schema?.endpoint || '/v1/audio/completions';

        const paramMap = new Map(apiParams.map(p => [p.name, p]));

        // 确保文本至少 10 个字符
        let textContent = params.text;
        if (textContent.length < 10) {
            textContent = textContent + '，请为我生成这段音频内容。';
        }

        // 构建请求体
        let requestBody: any = {
            model: params.model,
        };

        // 将文本内容设置到所有 schema 中存在的文本字段
        // 确保 required 的文本字段不会为 undefined
        if (paramMap.has('prompt')) {
            requestBody.prompt = textContent;
        }
        if (paramMap.has('lyrics')) {
            requestBody.lyrics = textContent;
        }
        if (paramMap.has('text')) {
            requestBody.text = textContent;
        }
        if (paramMap.has('input')) {
            requestBody.input = textContent;
        }
        
        // 如果 schema 没有任何已知文本字段，默认用 prompt
        if (!paramMap.has('prompt') && !paramMap.has('lyrics') && !paramMap.has('text') && !paramMap.has('input')) {
            requestBody.prompt = textContent;
        }

        // 确保所有 required 字段都有值（用文本内容填充 required 的 string 字段）
        for (const param of apiParams) {
            if (param.required && !(param.name in requestBody)) {
                if (param.type === 'string') {
                    // required string 字段如果还没设置，用文本内容填充
                    requestBody[param.name] = param.default !== undefined ? param.default : textContent;
                }
            }
        }

        // voice
        if (paramMap.has('voice') && params.voice) {
            requestBody.voice = params.voice;
        }

        // async_mode
        if (paramMap.has('async_mode')) {
            requestBody.async_mode = true;
        }

        // format
        if (paramMap.has('format')) {
            requestBody.format = paramMap.get('format')!.default || 'mp3';
        }

        // 验证
        if (schema) {
            const validation = validateRequestWithSchema(requestBody, schema);
            if (!validation.valid) {
                console.warn('[AI Gateway] Audio validation warnings:', validation.errors);
            }
            requestBody = validation.completed;
        }

        console.log('[AI Gateway] Audio request:', requestBody);

        const apiPath = endpoint.replace(/^\/v1/, '');
        const response = await fetch(`${API_BASE_URL}${apiPath}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Audio generation failed: ${response.status} ${errorData.error?.message || JSON.stringify(errorData) || response.statusText}`);
        }

        const data = await response.json();
        const jobId = data.job_id || data.id || data.generation_id;
        
        // 有 jobId → 统一用 /v1/jobs/{job_id} 轮询
        if (jobId) {
            console.log('[AI Gateway] Audio job created:', jobId);
            return await pollJob(jobId, 'audio_url');
        }
        
        // 同步模式 - 直接返回
        if (data.audio_url || data.url) return data.audio_url || data.url;
        
        throw new Error('No audio URL or job ID returned');
    } catch (error) {
        console.error('[AI Gateway] Audio error:', error);
        throw error;
    }
};

// === 文本/聊天生成 ===

export const generateTextViaGateway = async (params: {
    model: string;
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
}): Promise<string> => {
    try {
        console.log('[AI Gateway] Text input:', { model: params.model, promptLen: params.prompt.length });
        const headers = await buildHeaders();

        // 获取该模型的 API Schema
        const schema = await getModelSchema(params.model);
        const endpoint = schema?.api_schema?.endpoint || '/v1/chat/completions';

        // 构建 messages
        const messages: { role: string; content: string }[] = [];
        if (params.systemPrompt) {
            messages.push({ role: 'system', content: params.systemPrompt });
        }
        messages.push({ role: 'user', content: params.prompt });

        const requestBody: any = {
            model: params.model,
            messages,
            temperature: params.temperature ?? 0.7,
        };

        console.log('[AI Gateway] Text request:', { model: params.model, endpoint, messageCount: messages.length });

        const apiPath = endpoint.replace(/^\/v1/, '');
        const response = await fetch(`${API_BASE_URL}${apiPath}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Text generation failed: ${response.status} ${errorData.error?.message || JSON.stringify(errorData) || response.statusText}`);
        }

        const data = await response.json();
        
        // 标准 OpenAI chat completions 格式
        const text = data.choices?.[0]?.message?.content || '';
        if (text) return text;
        
        // fallback: 其他格式
        if (data.text) return data.text;
        if (data.content) return data.content;
        if (data.result) return typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
        
        throw new Error('No text content returned');
    } catch (error) {
        console.error('[AI Gateway] Text error:', error);
        throw error;
    }
};

// === 轮询取消管理 ===

/** 当前活跃的轮询 AbortController 集合 */
const activePolls = new Map<string, AbortController>();

/** 取消指定 jobId 的轮询 */
export const cancelPoll = (jobId: string) => {
    const controller = activePolls.get(jobId);
    if (controller) {
        controller.abort();
        activePolls.delete(jobId);
        console.log(`[AI Gateway] Poll cancelled: ${jobId}`);
    }
};

/** 取消所有正在进行的轮询 */
export const cancelAllPolls = () => {
    for (const [jobId, controller] of activePolls) {
        controller.abort();
        console.log(`[AI Gateway] Poll cancelled: ${jobId}`);
    }
    activePolls.clear();
};

/** 获取当前活跃的轮询 jobId 列表 */
export const getActivePolls = (): string[] => {
    return Array.from(activePolls.keys());
};

// === 通用轮询 ===

/**
 * 统一轮询异步任务状态
 * 所有异步任务统一使用 GET /v1/jobs/{job_id} 轮询
 * 非 200 响应立即停止，支持通过 cancelPoll(jobId) 取消
 */
const pollJob = async (
    jobId: string, 
    resultUrlField: string
): Promise<string> => {
    const headers = await buildHeaders();
    let attemptCount = 0;
    
    const abortController = new AbortController();
    activePolls.set(jobId, abortController);
    
    // 统一轮询端点: /v1/jobs/{job_id}
    const pollPath = `/jobs/${jobId}`;
    
    console.log(`[AI Gateway] Starting poll: GET ${API_BASE_URL}${pollPath}`);
    
    try {
        while (!abortController.signal.aborted) {
            await new Promise((resolve, reject) => {
                const timer = setTimeout(resolve, 5000);
                abortController.signal.addEventListener('abort', () => {
                    clearTimeout(timer);
                    reject(new DOMException('Poll cancelled', 'AbortError'));
                }, { once: true });
            });
            
            attemptCount++;

            const response = await fetch(`${API_BASE_URL}${pollPath}`, {
                method: 'GET',
                headers,
                signal: abortController.signal
            });

            // 非 200 立即停止
            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                throw new Error(`Poll failed: ${response.status} ${response.statusText}${errorText ? ' - ' + errorText : ''}`);
            }

            const data = await response.json();
            console.log(`[AI Gateway] Job ${jobId}: status=${data.status}, attempt=${attemptCount}, progress=${data.progress || 0}%`);
            console.log(`[AI Gateway] Full response data:`, JSON.stringify(data, null, 2));
            
            // 失败
            if (data.status === 'failed' || data.status === 'error') {
                let errorMsg = 'Generation failed';
                if (data.error) {
                    if (typeof data.error === 'string') {
                        errorMsg = data.error;
                    } else if (data.error.message) {
                        errorMsg = data.error.message;
                        if (data.error.data && Array.isArray(data.error.data)) {
                            const details = data.error.data.map((d: any) => `${d.path?.join('.')}: ${d.message}`).join('; ');
                            errorMsg += ` (${details})`;
                        }
                    } else {
                        errorMsg = JSON.stringify(data.error);
                    }
                }
                if (typeof errorMsg === 'string' && errorMsg.includes('"message"')) {
                    try {
                        const parsed = JSON.parse(errorMsg);
                        if (parsed.error?.message) errorMsg = parsed.error.message;
                    } catch {}
                }
                throw new Error(errorMsg);
            }
            
            // 完成 - 尝试多种结果字段和状态值
            if (data.status === 'completed' || data.status === 'succeed' || data.status === 'success' || data.status === 'done') {
                const result = data.result || data.output || data;
                const url = result[resultUrlField] 
                    || result.url 
                    || result.video_url 
                    || result.image_url 
                    || result.audio_url
                    || result.data?.[0]?.url
                    || data.url
                    || data.video_url
                    || data.image_url
                    || data.audio_url;
                
                if (url) {
                    console.log(`[AI Gateway] Job ${jobId} completed, URL:`, url);
                    return url;
                }
                
                console.warn(`[AI Gateway] Job ${jobId} marked as completed but no URL found in response:`, data);
                throw new Error('Generation completed but no result URL found');
            }
            
            // 继续轮询
        }
        throw new Error('Poll was cancelled');
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error(`Generation cancelled (job: ${jobId})`);
        }
        throw error;
    } finally {
        activePolls.delete(jobId);
    }
};

// === 缓存管理 ===

export const clearGatewayCache = () => {
    console.log('[AI Gateway] Cache cleared');
};
