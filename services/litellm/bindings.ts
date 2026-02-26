
import { CapabilityBinding } from './types';

export const BINDINGS: CapabilityBinding[] = [
    // Text Generation
    {
        id: 'b_gpt4o',
        capability_id: 'text_generation',
        internal_model_id: 'gpt-4o',
        litellm_model: 'openai/gpt-4o',
        priority: 1
    },
    {
        id: 'b_azure_gpt4o',
        capability_id: 'text_generation',
        internal_model_id: 'azure-gpt-4o',
        litellm_model: 'azure/gpt-4o', // Microsoft Azure OpenAI
        priority: 1
    },
    {
        id: 'b_gemini_pro',
        capability_id: 'text_generation',
        internal_model_id: 'gemini-1.5-pro',
        litellm_model: 'gemini/gemini-1.5-pro',
        priority: 2
    },
    {
        id: 'b_gemini_flash',
        capability_id: 'text_generation',
        internal_model_id: 'gemini-3-flash-preview',
        litellm_model: 'gemini/gemini-1.5-flash',
        priority: 3
    },

    // Image Generation
    {
        id: 'b_dalle3',
        capability_id: 'image_generation',
        internal_model_id: 'dall-e-3',
        litellm_model: 'dall-e-3', // OpenAI DALL-E 3
        priority: 1
    },
    {
        id: 'b_azure_dalle3',
        capability_id: 'image_generation',
        internal_model_id: 'azure-dall-e-3',
        litellm_model: 'azure/dall-e-3', // Azure DALL-E 3
        priority: 1
    },
    {
        id: 'b_gemini_image',
        capability_id: 'image_generation',
        internal_model_id: 'gemini-2.5-flash-image',
        litellm_model: 'gemini/gemini-pro-vision', // Example mapping
        priority: 2
    },

    // Video Generation
    {
        id: 'b_veo_fast',
        capability_id: 'video_generation',
        internal_model_id: 'veo-3.1-fast',
        litellm_model: 'vertex_ai/veo-3.1-fast', // Example
        priority: 1
    },
    
    // Audio Generation
    {
        id: 'b_tts1',
        capability_id: 'speech_generation',
        internal_model_id: 'tts-1',
        litellm_model: 'openai/tts-1',
        priority: 1
    }
];
