
import { CapabilityBinding, CapabilityInputs, CapabilityType } from './types';
import { LiteLLMClient } from './client';
import { BINDINGS } from './bindings';

export class CapabilityResolver {
    private client: LiteLLMClient;

    constructor(baseUrl?: string, apiKey?: string) {
        this.client = new LiteLLMClient(baseUrl, apiKey);
    }

    /**
     * Finds and applies the best matching custom configuration from user settings
     * This allows user-defined Custom API keys to override default behavior
     */
    private resolveRuntimeConfig(modelId: string) {
        try {
            // Check User Custom Connectors (from connectorService)
            // Note: We access localStorage directly here as a simple bridge
            const stored = localStorage.getItem('enexus_user_connectors');
            if (!stored) return null;

            const customConnectors = JSON.parse(stored) as any[];
            
            // 1. Try to match by explicit Model ID (if provided in custom connector)
            let match = customConnectors.find(c => c.userConfig?.modelId === modelId);
            
            // 2. If not found, and modelId implies Azure, look for an Azure connector
            if (!match && modelId.includes('azure')) {
                 match = customConnectors.find(c => c.name.toLowerCase().includes('azure') || c.userConfig?.endpoint?.includes('azure'));
            }

            // 3. If still not found, check if there is a generic "LiteLLM" or "Proxy" connector
            if (!match) {
                match = customConnectors.find(c => c.name.toLowerCase().includes('litellm') || c.name.toLowerCase().includes('proxy'));
            }

            if (match && match.userConfig) {
                return {
                    baseUrl: match.userConfig.endpoint,
                    apiKey: match.userConfig.apiKey
                };
            }
        } catch (e) {
            console.warn("Failed to resolve runtime config", e);
        }
        return null;
    }

    /**
     * Resolves the best binding for the capability and executes it.
     * Implements Cross-Model Fallback.
     */
    async resolveAndExecute(capabilityId: CapabilityType, inputs: CapabilityInputs, preferredModelId?: string) {
        // --- Runtime Config Injection ---
        // If the preferred model has a user-defined custom connector, use that config for this request
        if (preferredModelId) {
             const runtimeConfig = this.resolveRuntimeConfig(preferredModelId);
             if (runtimeConfig) {
                 console.log(`[Resolver] Using Custom Config for ${preferredModelId}:`, runtimeConfig.baseUrl);
                 // Create a temporary client with custom config
                 const tempClient = new LiteLLMClient(runtimeConfig.baseUrl, runtimeConfig.apiKey);
                 // We still need to find the binding to know the mapped model name (e.g. azure/gpt-4o)
                 // Or we might assume the preferredModelId IS the mapped name if it's a raw custom model
             }
        }
        
        // ... (rest of logic) ...
        // 1. Filter bindings for this capability
        let candidates = BINDINGS.filter(b => b.capability_id === capabilityId);
        
        if (candidates.length === 0) {
            throw new Error(`No bindings found for capability: ${capabilityId}`);
        }

        // 2. Sort by priority (asc)
        candidates.sort((a, b) => a.priority - b.priority);

        // 3. If preferred model is requested, try to move it to top
        if (preferredModelId) {
            // Check if it's a "SIMULATION" request (legacy support)
            if (preferredModelId.startsWith('SIMULATION:')) {
                return this.simulateExecution(capabilityId, inputs);
            }

            const preferred = candidates.find(b => b.internal_model_id === preferredModelId);
            if (preferred) {
                // Move preferred to front, keep others as fallback
                candidates = [preferred, ...candidates.filter(b => b.internal_model_id !== preferredModelId)];
            } else {
                console.warn(`[Resolver] Preferred model ${preferredModelId} not found in bindings for ${capabilityId}. Using default.`);
            }
        }

        // 4. Fallback execution loop
        let lastError: Error | null = null;
        
        for (const binding of candidates) {
            try {
                console.log(`[Resolver] Attempting ${binding.internal_model_id} (LiteLLM: ${binding.litellm_model})`);
                
                // Determine Client: Use Custom Config if available for this specific model, else Default
                let activeClient = this.client;
                const runtimeConfig = this.resolveRuntimeConfig(binding.internal_model_id) || this.resolveRuntimeConfig(binding.litellm_model);
                
                if (runtimeConfig) {
                    // Normalize Base URL: Ensure /v1 is present if missing and not a full custom path
                    let safeUrl = runtimeConfig.baseUrl || 'http://localhost:4000/v1';
                    if (!safeUrl.endsWith('/v1') && !safeUrl.includes('/openai/deployments')) {
                         // Heuristic: If it looks like a base root, add /v1. If it looks like azure full path, leave it.
                         safeUrl = safeUrl.replace(/\/$/, '') + '/v1';
                    }
                    activeClient = new LiteLLMClient(safeUrl, runtimeConfig.apiKey);
                }

                // --- Execute ---
                const result = await activeClient.sendRequest(binding.litellm_model, inputs, capabilityId);
                
                // --- Log Usage ---
                this.logUsage(binding, result);
                
                // --- Format Output ---
                return this.formatResult(result, capabilityId);

            } catch (error: any) {
                console.warn(`[Resolver] Failed on ${binding.internal_model_id}: ${error.message}`);
                lastError = error;
                // If it's a client error (400), maybe don't retry? 
                // But for now, we assume transient or provider-specific issues and try next binding.
            }
        }

        throw new Error(`All providers failed for ${capabilityId}. Last error: ${lastError?.message}`);
    }

    private logUsage(binding: CapabilityBinding, result: any) {
        if (result.usage) {
            console.log(`[Cost Log] Model: ${binding.internal_model_id} | Tokens: ${result.usage.total_tokens} | Cost: ${result.usage.cost || 'N/A'}`);
            // TODO: Write to execution_logs DB
        }
    }

    private formatResult(result: any, capability: CapabilityType): string | any {
        if (capability === 'text_generation') {
            return result.choices?.[0]?.message?.content || "";
        }
        if (capability === 'image_generation') {
            return result.data?.[0]?.url || "";
        }
        if (capability === 'speech_generation') {
            // Assuming LiteLLM returns a URL or base64? 
            // Standard OpenAI audio API returns binary. 
            // The LiteLLM client might need to handle binary response if fetch returns blob.
            // For now, assume it returns a URL or we handled it in client.
            return result.data?.[0]?.url || "audio_url_placeholder";
        }
        return result;
    }

    // Legacy Simulation Support
    private async simulateExecution(capabilityId: CapabilityType, inputs: any) {
         return new Promise((resolve) => {
            setTimeout(() => {
                if (capabilityId === 'image_generation') resolve('https://picsum.photos/800/600?random=' + Math.random());
                if (capabilityId === 'video_generation') resolve('https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4');
                if (capabilityId === 'text_generation') resolve("Simulated text response.");
                resolve('');
            }, 1000);
        });
    }
}
