
import { LiteLLMResponse, CapabilityType, CapabilityInputs } from './types';

export class LiteLLMClient {
  private baseUrl: string;
  private apiKey: string;

  // Defaults to localhost:4000 where LiteLLM Proxy is typically running
  // Use v1 prefix for standard OpenAI compatibility which LiteLLM adheres to
  constructor(baseUrl: string = 'http://localhost:4000/v1', apiKey: string = 'sk-1234') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  /**
   * Sends a unified request to LiteLLM Proxy.
   * Handles format conversion based on capability type.
   */
  async sendRequest(model: string, inputs: CapabilityInputs, capability: CapabilityType): Promise<LiteLLMResponse> {
    let endpoint = '/chat/completions'; // Default to Chat API
    let body: any = { 
        model: model,
        ...inputs.params // Allow passthrough of extra params
    };

    // --- Request Transformation ---
    if (capability === 'text_generation') {
        endpoint = '/chat/completions';
        body.messages = [{ role: 'user', content: inputs.prompt }];
        if (inputs.system) {
            body.messages.unshift({ role: 'system', content: inputs.system });
        }
    } 
    else if (capability === 'image_generation') {
        endpoint = '/images/generations';
        body.prompt = inputs.prompt;
        body.n = 1;
        body.size = inputs.resolution || '1024x1024';
        // LiteLLM supports standard OpenAI image params
    }
    else if (capability === 'video_generation') {
        // Assuming LiteLLM has a custom endpoint or uses OpenAI format for video extensions
        // Or if using Vertex AI pass-through
        endpoint = '/video/generations'; // Hypothetical endpoint or specific to provider
        // If LiteLLM doesn't support standard video endpoint yet, we might use a specific route
        // For now, assume a standard-like structure
        body.prompt = inputs.prompt;
        body.duration_seconds = inputs.duration || 5;
    }
    else if (capability === 'speech_generation') {
        endpoint = '/audio/speech';
        body.input = inputs.text || inputs.prompt;
        body.voice = inputs.voice || 'alloy';
    }

    // --- Azure Compatibility Handling ---
    const isAzure = this.baseUrl.includes('azure.com');
    const apiVersion = '2024-02-15-preview'; // Default or extract from URL?

    if (isAzure) {
        // Azure structure: BASE_URL/openai/deployments/{deployment}/...
        // If baseUrl already ends with /deployments/{deployment}, we just append operation
        // But we need to ensure api-version is present
        
        let url = `${this.baseUrl}${endpoint}`;
        if (!url.includes('api-version')) {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}api-version=${apiVersion}`;
        }
        
        // Azure uses 'api-key' header instead of Bearer
        const headers: any = {
            'Content-Type': 'application/json',
            'api-key': this.apiKey
        };

        try {
            console.log(`[LiteLLM Client] POST ${url} (Azure Mode)`);
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });
            // ... handle response
            if (!response.ok) {
                 const errorText = await response.text();
                 throw new Error(`Azure Error (${response.status}): ${errorText}`);
            }
            // ... same response handling ...
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json() as LiteLLMResponse;
            } else {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                return {
                    id: 'binary-' + Date.now(),
                    object: 'binary',
                    created: Date.now(),
                    model: model,
                    data: [{ url: url }]
                } as any;
            }
        } catch (error) {
             throw error;
        }
    }

    try {
        console.log(`[LiteLLM Client] POST ${this.baseUrl}${endpoint} (Model: ${model})`);
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;
            try {
                errorJson = JSON.parse(errorText);
            } catch (e) {
                errorJson = { error: { message: errorText } };
            }
            throw new Error(`LiteLLM Proxy Error (${response.status}): ${errorJson.error?.message || response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            return data as LiteLLMResponse;
        } else {
            // Handle Binary / Stream (e.g. Audio/Image)
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            // Wrap in LiteLLMResponse structure
            return {
                id: 'binary-' + Date.now(),
                object: 'binary',
                created: Date.now(),
                model: model,
                data: [{ url: url }]
            } as any;
        }
    } catch (error: any) {
        console.error("[LiteLLM Client] Request Failed:", error);
        throw error;
    }
  }
}
