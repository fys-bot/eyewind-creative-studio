
import { ConnectorConfig } from '../types';

const CONNECTED_PROVIDERS_KEY = 'enexus_connected_providers';

const getOpenAIApiKey = (): string => {
    try {
        const stored = localStorage.getItem(CONNECTED_PROVIDERS_KEY);
        if (!stored) throw new Error("No connected providers found");
        
        const configs = JSON.parse(stored);
        const openaiConfig = configs['openai'] as ConnectorConfig;
        
        if (!openaiConfig || !openaiConfig.apiKey) {
            throw new Error("OpenAI API Key not found. Please connect in settings.");
        }
        
        return openaiConfig.apiKey;
    } catch (e) {
        throw new Error("OpenAI Configuration Error: " + (e as Error).message);
    }
};

export const openaiGenerateText = async (params: { 
    model: string, 
    prompt: string, 
    systemPrompt?: string,
    temperature?: number,
    baseUrl?: string,
    apiKey?: string
}): Promise<string> => {
    const apiKey = params.apiKey || getOpenAIApiKey();
    // Default base URL without trailing slash
    const baseUrl = (params.baseUrl || 'https://ai-gateway.eyewind.com/v1').replace(/\/$/, '');
    
    // Support for O1 models which don't support system messages in some versions or have different constraints
    // For simplicity, we treat them as standard chat models unless specific O1 logic is needed
    const isO1 = params.model.startsWith('o1');

    const messages = [];
    if (params.systemPrompt && !isO1) {
        messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push({ role: 'user', content: params.prompt });

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: params.model,
            messages: messages,
            temperature: isO1 ? 1 : (params.temperature ?? 0.7), // O1 often has fixed temp
            max_completion_tokens: isO1 ? undefined : 2048 // O1 uses max_completion_tokens, others max_tokens
        })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API Error (${response.status}): ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
};

export const openaiGenerateImage = async (params: {
    model: string,
    prompt: string,
    size?: string,
    quality?: 'standard' | 'hd',
    baseUrl?: string,
    apiKey?: string
}): Promise<string> => {
    const apiKey = params.apiKey || getOpenAIApiKey();
    // Default base URL without trailing slash
    let baseUrl = (params.baseUrl || 'https://ai-gateway.eyewind.com/v1').replace(/\/$/, '');

    // Proxy handling for CORS (Browser -> Vite Proxy -> Volcengine)
    // If we are in browser environment and using the default Volcengine host
    if (typeof window !== 'undefined' && baseUrl.includes('ark.cn-beijing.volces.com')) {
        // Replace the host with our local proxy path
        baseUrl = baseUrl.replace('https://ark.cn-beijing.volces.com', '/ark-api');
    }

    // Map resolution to OpenAI supported sizes
    let size = "1024x1024";
    
    // Volcengine uses specific string literals like "2K", "4K"
    // OpenAI uses "1024x1024", "1024x1792"
    
    if (baseUrl.includes('ark') || params.model.includes('doubao')) {
        // Force 2K for Volcengine Doubao-Seedream if standard size is passed
        // The error message "image size must be at least 3686400 pixels" implies it wants higher res (2K/4K)
        // 1024x1024 = 1,048,576 pixels (Too small for Seedream 4.5?)
        // 2K usually maps to something larger.
        
        // If user selected standard sizes, map them to "2K" to be safe, or pass the string literal "2K"
        if (params.size === '2K' || params.size === '4K') {
             size = params.size;
        } else {
             // Default fallback for Volcengine if "1024x1024" or undefined was passed
             size = "2K";
        }
    } else {
        // Standard OpenAI logic
        if (params.size === 'landscape' || params.size === '16:9') size = "1792x1024";
        if (params.size === 'portrait' || params.size === '9:16') size = "1024x1792";
    }

    const body: any = {
        model: params.model,
        prompt: params.prompt,
        n: 1,
        size: size,
        response_format: 'url', // Explicitly set format
    };

    // Add extra_body parameters for Volcengine compatibility
    if (baseUrl.includes('ark') || params.model.includes('doubao')) {
        // Volcengine specific: watermark
        // In OpenAI SDK this is passed as 'extra_body', in raw REST API we merge it to root
        body['watermark'] = true;
    }

    const response = await fetch(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI Image API Error (${response.status}): ${errData.error?.message || response.statusText}. Request id: ${errData.request_id || 'unknown'}`);
    }

    const data = await response.json();
    
    // Handle URL response (for Volcengine/Standard OpenAI)
    if (data.data?.[0]?.url) {
        return data.data[0].url;
    }

    // Handle Base64 response (Fallback or DALL-E default)
    const b64 = data.data?.[0]?.b64_json;
    if (b64) {
        return `data:image/png;base64,${b64}`;
    }
    
    throw new Error("No image data returned from API");
};

export const openaiGenerateSpeech = async (params: {
    model: string,
    text: string,
    voice: string
}): Promise<string> => {
    const apiKey = getOpenAIApiKey();
    
    const response = await fetch('https://ai-gateway.eyewind.com/v1/audio/speech', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: params.model || 'tts-1',
            input: params.text,
            voice: params.voice || 'alloy'
        })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI TTS Error (${response.status}): ${errData.error?.message || response.statusText}`);
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// Verification Helper
export const verifyOpenAIKey = async (apiKey: string): Promise<boolean> => {
    const response = await fetch('https://ai-gateway.eyewind.com/v1/models', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        }
    });
    
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || "Invalid API Key");
    }
    
    return true;
};
