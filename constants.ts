import { AspectRatio, ModelType, Resolution, WorkflowTemplate } from "./types";

export const MODELS = [
  // --- 视频模型 ---
  { id: ModelType.VEO_FAST, name: 'Google Veo Fast', label: 'Veo Fast (Preview)', type: 'video', provider: 'Google' },
  { id: ModelType.VEO_HQ, name: 'Google Veo HQ', label: 'Veo High Quality', type: 'video', provider: 'Google' },
  { id: ModelType.EYEWIND_VIDEO, name: 'Eyewind Motion Turbo', label: 'Motion Turbo', type: 'video', provider: 'Enterprise' },
  { id: ModelType.RUNWAY_GEN3, name: 'Runway Gen-3 Alpha', label: 'Gen-3 Alpha', type: 'video', provider: 'Industry' },
  { id: ModelType.KLING, name: 'Kling 1.5', label: 'Kling 1.5', type: 'video', provider: 'Industry' },
  { id: ModelType.DOUBAO_VIDEO, name: 'Doubao Seedance', label: 'Doubao Seedance 1.5 Pro', type: 'video', provider: 'Industry' }, // 新增
  { id: ModelType.DOUBAO_VIDEO, name: 'Doubao Seedance', label: 'Doubao Seedance 1.5 Pro', type: 'image', provider: 'Industry' }, // 新增: 允许在视觉生成节点选择

  // --- 图像模型 ---
  { id: ModelType.GEMINI_FLASH_IMAGE, name: 'Gemini 2.5 Flash', label: 'Gemini 2.5 Flash', type: 'image', provider: 'Google' },
  // { id: ModelType.IMAGEN_3, name: 'Google Imagen 3', label: 'Imagen 3', type: 'image', provider: 'Google' }, // Temporarily disabled due to API 404
  { id: ModelType.GEMINI_PRO_IMAGE, name: 'Gemini 3 Pro', label: 'Gemini 3 Pro Vision', type: 'image', provider: 'Google' },
  { id: ModelType.DALL_E_3, name: 'DALL·E 3', label: 'DALL·E 3', type: 'image', provider: 'OpenAI' },
  { id: ModelType.EYEWIND_IMAGE, name: 'Eyewind Vision XL', label: 'Vision XL (Flux)', type: 'image', provider: 'Enterprise' },
  { id: ModelType.MIDJOURNEY_V6, name: 'Midjourney v6.1', label: 'Midjourney v6.1', type: 'image', provider: 'Industry' },
  { id: ModelType.DOUBAO_IMAGE, name: 'Doubao Image', label: 'Doubao Image', type: 'image', provider: 'Industry' }, // 新增：豆包文生图

  // --- 文本模型 ---
  { id: ModelType.GEMINI_FLASH, name: 'Gemini 3 Flash', label: 'Gemini 3 Flash', type: 'text', provider: 'Google' },
  { id: ModelType.GEMINI_PRO, name: 'Gemini 3 Pro', label: 'Gemini 3 Pro', type: 'text', provider: 'Google' },
  { id: ModelType.DOUBAO_PRO, name: 'Doubao Pro', label: 'Doubao Pro', type: 'text', provider: 'Industry' }, // 新增
  { id: ModelType.DOUBAO_LITE, name: 'Doubao Lite', label: 'Doubao Lite', type: 'text', provider: 'Industry' }, // 新增
  { id: ModelType.EYEWIND_TEXT, name: 'Eyewind Text Pro', label: 'Text Pro (Legacy)', type: 'text', provider: 'Enterprise' },
  { id: ModelType.GPT4_O, name: 'GPT-4o', label: 'GPT-4o', type: 'text', provider: 'OpenAI' },
  { id: ModelType.AZURE_GPT4O, name: 'Azure GPT-4o', label: 'Azure GPT-4o', type: 'text', provider: 'OpenAI' },
  { id: ModelType.AZURE_DALLE3, name: 'Azure DALL-E 3', label: 'Azure DALL-E 3', type: 'image', provider: 'OpenAI' },
  { id: ModelType.O1_PREVIEW, name: 'O1 Preview', label: 'O1 Preview', type: 'text', provider: 'OpenAI' },
  { id: ModelType.O1_MINI, name: 'O1 Mini', label: 'O1 Mini', type: 'text', provider: 'OpenAI' },
  { id: ModelType.CLAUDE_3_5, name: 'Claude 3.5 Sonnet', label: 'Claude 3.5 Sonnet', type: 'text', provider: 'Industry' },
  
  // --- 音频模型 ---
  { id: ModelType.GEMINI_TTS, name: 'Gemini 2.5 Speech', label: 'Gemini 2.5 Speech', type: 'audio', provider: 'Google' },
  { id: ModelType.TTS_1, name: 'OpenAI TTS', label: 'OpenAI TTS-1', type: 'audio', provider: 'OpenAI' },
  { id: ModelType.EYEWIND_AUDIO, name: 'Eyewind Audio', label: 'Eyewind Audio Engine', type: 'audio', provider: 'Enterprise' },
];

export const ASPECT_RATIOS = [
  { id: AspectRatio.R_21_9, label: '21:9' },
  { id: AspectRatio.R_16_9, label: '16:9' },
  { id: AspectRatio.R_4_3, label: '4:3' },
  { id: AspectRatio.R_3_2, label: '3:2' },
  { id: AspectRatio.R_1_1, label: '1:1' },
  { id: AspectRatio.R_9_16, label: '9:16' },
  { id: AspectRatio.R_3_4, label: '3:4' },
  { id: AspectRatio.R_2_3, label: '2:3' },
  { id: AspectRatio.R_5_4, label: '5:4' },
  { id: AspectRatio.R_4_5, label: '4:5' }
];

export const BASIC_ASPECT_RATIOS = [
  { id: AspectRatio.R_16_9, label: '16:9' },
  { id: AspectRatio.R_9_16, label: '9:16' },
  { id: AspectRatio.R_1_1, label: '1:1' },
  { id: AspectRatio.R_4_3, label: '4:3' },
  { id: AspectRatio.R_3_4, label: '3:4' }
];

export const AUDIO_CATEGORIES = [
    { id: 'speech', label: 'Speech' },
    { id: 'sfx', label: 'Sound Effect' }, 
    { id: 'music', label: 'Music' }
];

export const RESOLUTIONS = [
    { id: Resolution.P720, label: '720p' },
    { id: Resolution.P1080, label: '1080p' }
];

export const IMAGE_RESOLUTIONS = [
    { id: Resolution.R_1K, label: '1K' },
    { id: Resolution.R_2K, label: '2K (Pro)' },
    { id: Resolution.R_4K, label: '4K (Pro)' }
];

export const DURATIONS = [
    { value: 4, label: '4s' },
    { value: 6, label: '6s' },
    { value: 8, label: '8s' }
];

export const AUDIO_VOICES = [
    { id: 'Puck', label: 'Puck' },
    { id: 'Charon', label: 'Charon' },
    { id: 'Kore', label: 'Kore' },
    { id: 'Fenrir', label: 'Fenrir' },
    { id: 'Zephyr', label: 'Zephyr' }
];

// 新增：AI 代理角色定义 - 扩展游戏全岗位
export const AGENT_ROLES = [
    { id: 'producer', label: 'Game Producer', icon: 'Briefcase' }, // 制作人
    { id: 'director', label: 'Director / Screenwriter', icon: 'Clapperboard' }, // 导演
    { id: 'game_designer', label: 'System Designer', icon: 'Gamepad2' }, // 系统策划
    { id: 'level_designer', label: 'Level Designer', icon: 'Map' }, // 关卡策划
    { id: 'art_director', label: 'Art Director', icon: 'Palette' }, // 美术指导
    { id: 'sound_designer', label: 'Audio Director', icon: 'Headphones' }, // 音频总监
    
    // --- 新增运营发行岗位 ---
    { id: 'publisher', label: 'Game Publisher', icon: 'Globe' }, // 发行
    { id: 'live_ops', label: 'Live Ops Manager', icon: 'Activity' }, // 运营
    { id: 'community', label: 'Community Manager', icon: 'Users' }, // 社区
    { id: 'marketing', label: 'Marketing / UA Ops', icon: 'Megaphone' }, // 市场投放
    
    // --- 核心调度 ---
    { id: 'central_dispatcher', label: 'Central Dispatch', icon: 'Network' }, // 中枢调度

    // --- 其他 ---
    { id: 'copywriter', label: 'Social Media Copywriter', icon: 'Feather' }, // 文案
    { id: 'qa', label: 'QA Lead', icon: 'Bug' } // 测试
];

import { PROFESSIONAL_TEMPLATES } from "./data/templates/workflows";

export const TEMPLATES: WorkflowTemplate[] = PROFESSIONAL_TEMPLATES;
