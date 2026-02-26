
export type ResourceType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'mask'
  | 'config'
  | 'dataset'
  | 'json'
  | 'any'; // Debug/Log only

export type ResourceSubtype =
  // text
  | 'prompt' | 'script' | 'lyrics' | 'tts_text'
  // image
  | 'image' | 'ref' | 'first_frame' | 'last_frame' | 'thumb'
  // video
  | 'video' | 'ref_video'
  // audio
  | 'audio' | 'ref_audio' | 'voice'
  // mask
  | 'mask'
  // config
  | 'model' | 'style' | 'ratio' | 'quality' | 'safety' | 'gen_params'
  // json
  | 'meta' | 'payload'
  // dataset
  | 'dataset';

export type Resource = {
  id: string;
  type: ResourceType;
  subtype: ResourceSubtype;
  uri?: string;           // media asset URI
  payload?: any;          // text/config/json payload
  meta?: Record<string, any>;
};
