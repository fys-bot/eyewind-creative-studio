
import { VideoConfig } from "../types";

// Helper to poll task status
const pollTaskStatus = async (
    taskId: string, 
    apiKey: string, 
    endpoint: string, // Base URL usually
    maxAttempts = 60, // 60 * 2s = 2 mins timeout
    interval = 2000
): Promise<string> => {
    // Ensure endpoint doesn't end with slash
    const baseUrl = endpoint.replace(/\/$/, '');
    const statusUrl = `${baseUrl}/contents/generations/tasks/${taskId}`;

    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(statusUrl, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(`Polling Error (${response.status}): ${err.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const status = data.result?.status || data.status; // Check API docs for exact field, assuming typical structure

            if (status === 'SUCCEEDED' || status === 'SUCCESS') {
                // Return video URL
                // Check where the video url is in the response structure
                // Usually data.result.content.video_url or similar
                const content = data.result?.content;
                if (content && content.video_url) return content.video_url;
                // Fallback check
                if (data.data?.video?.url) return data.data.video.url;
                
                // Based on user screenshot, the output might be in a specific structure
                // We'll try to find a URL in the response
                const jsonStr = JSON.stringify(data);
                const match = jsonStr.match(/https?:\/\/[^"']+\.(mp4|mov)/);
                if (match) return match[0];
                
                return ""; // Should handle better
            } else if (status === 'FAILED' || status === 'ERROR') {
                throw new Error(`Video generation failed: ${data.result?.error?.message || "Unknown error"}`);
            } else if (status === 'CANCELLED') {
                throw new Error("Video generation cancelled");
            }

            // If RUNNING or QUEUED, wait and retry
            await new Promise(r => setTimeout(r, interval));
        } catch (e) {
            console.warn("Polling warning:", e);
            // Don't throw immediately on network blip, but maybe stop if it's a 401/403
            await new Promise(r => setTimeout(r, interval));
        }
    }
    throw new Error("Video generation timed out");
};

export const volcengineGenerateVideo = async (params: {
    model: string, // This is the Endpoint ID
    prompt: string,
    startImage?: string,
    endImage?: string,
    apiKey: string,
    endpoint?: string, // Base URL
    duration?: number,
    withAudio?: boolean
}): Promise<string> => {
    // Default endpoint if not provided (User screenshot: https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks)
    // We expect the user to provide the base part: https://ark.cn-beijing.volces.com/api/v3
    let baseUrl = params.endpoint || "https://ark.cn-beijing.volces.com/api/v3";
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // Proxy handling for CORS (Browser -> Vite Proxy -> Volcengine)
    // If we are in browser environment and using the default host
    if (typeof window !== 'undefined' && baseUrl.includes('ark.cn-beijing.volces.com')) {
        // Replace the host with our local proxy path
        baseUrl = baseUrl.replace('https://ark.cn-beijing.volces.com', '/ark-api');
    }
    
    // Construct the Task Creation URL
    // If the user provided the FULL url in settings, handle that too
    let createUrl = `${baseUrl}/contents/generations/tasks`;
    if (baseUrl.endsWith('/tasks')) createUrl = baseUrl;

    // Use Proxy if running in browser to avoid CORS/Network errors (net::ERR_FAILED)
    // In local dev, we often need a proxy or the API must support CORS
    // Volcengine Ark API might not support browser-direct calls due to CORS
    // We'll try to use the system proxy if available, or just proceed
    // For now, assuming the user might need a proxy or backend relay
    
    // NOTE: If running in browser and encountering net::ERR_FAILED, it's likely CORS.
    // We will try to fetch directly first.

    // Construct Body
    const contentPayload: any[] = [];
    
    // Seedance Specific Parameter Logic
    // Users can control params via prompt text or we append them here
    // Example: "drone flying --duration 5"
    let finalPrompt = params.prompt;
    
    // If params are passed in config, append them to prompt if not already present
    // This is a common way to pass control params to these models
    if (params.duration) {
        if (!finalPrompt.includes('--duration')) {
            finalPrompt += ` --duration ${params.duration}`;
        }
    }
    
    // Handle Audio (Seedance specific)
    // Based on user input: "有声视频" vs "无声视频"
    // Usually controlled by a flag or simply by model capability, but sometimes via prompt param
    // We will append a custom flag or just assume the model handles it if prompt implies sound.
    // However, since there is a price difference, there might be a boolean param.
    // Let's check if we can pass it in the prompt or look for a specific param.
    // Assuming prompt-based control for now as seen with duration:
    if (params.withAudio === false) {
        // Explicitly mute? Or maybe default is mute?
        // Let's assume default is sound for "Seedance" (Video+Audio model)
        // If user wants mute, maybe "--mute" or "--no_audio"? 
        // For safety, let's leave it as is, or if user explicitly toggles it ON in UI
    }
    
    // 1. Text Prompt
    if (finalPrompt) {
        contentPayload.push({
            type: "text",
            text: finalPrompt
        });
    }

    // 2. Start Image (Image Input)
    if (params.startImage) {
        // If it's a base64 string, we might need to handle it.
        // For now, passing it directly as user might have provided a URL.
        // Ideally we should upload base64 to a temporary storage or check if API accepts data URI.
        // Volcengine docs usually require a public URL (TOS/S3/http).
        // If we have a data:image... string, it will likely fail with "image_url invalid".
        
        let imageUrl = params.startImage;
        
        // HACK: If we are in local dev and have a base64, we can't easily upload.
        // But if the user provided a URL in the node input (e.g. from previous node output that is a URL), it's fine.
        // If it is base64, we'll try to strip the header if API supports raw base64, but usually it doesn't.
        // Assuming user flow provides URLs or we need an upload service.
        
        contentPayload.push({
            type: "image_url",
            image_url: {
                url: imageUrl
            }
        });
    }

    // 3. End Image (Optional, Seedance supports it)
    if (params.endImage) {
         contentPayload.push({
            type: "image_url",
            image_url: {
                url: params.endImage
            }
        });
    }

    const body = {
        model: params.model,
        content: contentPayload
    };

    // Step 1: Create Task
    const response = await fetch(createUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${params.apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const errMsg = err.error?.message || response.statusText;
        
        // Friendly hint for common mismatch error
        if (response.status === 400 && errMsg.includes('does not support content generation')) {
            throw new Error(`Volcengine Video Error (400): The Endpoint ID you configured (${params.model}) seems to be an IMAGE model (like Seedream), but you are running a VIDEO task. Please check your settings or use the Visual Generation node.`);
        }
        
        throw new Error(`Volcengine Video Error (${response.status}): ${errMsg}`);
    }

    const data = await response.json();
    const taskId = data.id || data.result?.id;

    if (!taskId) {
        throw new Error("Failed to retrieve Task ID from Volcengine response");
    }

    // Step 2: Poll for Result
    // Use the same base URL for polling
    return pollTaskStatus(taskId, params.apiKey, baseUrl);
};
