
export type CapabilityType = 'text_generation' | 'image_generation' | 'video_generation' | 'speech_generation';

export interface CapabilityBinding {
  id: string;
  capability_id: CapabilityType;
  internal_model_id: string; // e.g., "veo_3_1_fast"
  litellm_model: string; // e.g., "google/veo-3.1-fast"
  priority: number; // Lower is better (1 = primary)
  conditions?: {
    max_cost?: number;
    latency_requirement?: 'low' | 'high';
  };
  param_template?: Record<string, any>; // Default params
}

export interface CapabilityInputs {
  prompt: string;
  system?: string;
  resolution?: string;
  aspectRatio?: string;
  [key: string]: any;
}

export interface LiteLLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices?: {
      index: number;
      message: {
          role: string;
          content: string;
      };
      finish_reason: string;
  }[];
  data?: {
      url?: string;
      b64_json?: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost?: number; // LiteLLM specific field
  };
}
