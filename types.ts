
export enum ModelType {
  // --- Google 视频模型 ---
  VEO_FAST = 'veo-3.1-fast-generate-preview',
  VEO_HQ = 'veo-3.1-generate-preview',
  
  // --- Google 图像模型 ---
  IMAGEN_3 = 'imagen-3.0-generate-001', 
  IMAGEN_4 = 'imagen-4.0-generate-001',
  GEMINI_FLASH_IMAGE = 'gemini-2.5-flash-image', // Nano Banana
  GEMINI_PRO_IMAGE = 'gemini-3-pro-image-preview', // Nano Banana Pro (新!)
  
  // --- Google 文本模型 ---
  GEMINI_FLASH = 'gemini-3-flash-preview', 
  GEMINI_PRO = 'gemini-3-pro-preview', 
  DOUBAO_PRO = 'doubao-pro', // 新增
  DOUBAO_LITE = 'doubao-lite', // 新增
  DOUBAO_IMAGE = 'doubao-image', // 新增: 豆包文生图
  DOUBAO_VIDEO = 'doubao-video', // 新增: 豆包视频生成 (Seedance)
  
  // --- Google 音频模型 ---
  GEMINI_TTS = 'gemini-2.5-flash-preview-tts',
  // GEMINI_AUDIO_NATIVE = 'gemini-2.5-flash-native-audio-preview', // 预留供将来使用

  // --- 企业级模型 (Eyewind 内部) ---
  EYEWIND_TEXT = 'eyewind-text-v1-pro',
  EYEWIND_IMAGE = 'eyewind-vision-xl',
  EYEWIND_VIDEO = 'eyewind-motion-turbo',
  EYEWIND_AUDIO = 'eyewind-audio-pro',

  // --- 行业标准模型 (模拟/回退) ---
  GPT4_O = 'gpt-4o',
  AZURE_GPT4O = 'azure-gpt-4o', // Azure OpenAI
  AZURE_DALLE3 = 'azure-dall-e-3', // Azure DALL-E 3
  O1_PREVIEW = 'o1-preview',
  O1_MINI = 'o1-mini',
  DALL_E_3 = 'dall-e-3',
  TTS_1 = 'tts-1',
  CLAUDE_3_5 = 'claude-3-5-sonnet',
  MIDJOURNEY_V6 = 'midjourney-v6',
  FLUX_PRO = 'flux-pro',
  SORA = 'sora',
  KLING = 'kling',
  RUNWAY_GEN3 = 'runway-gen3'
}

export enum AspectRatio {
  R_21_9 = '21:9', // 电影宽幅
  R_16_9 = '16:9',
  R_4_3 = '4:3',
  R_3_2 = '3:2',
  R_1_1 = '1:1',
  R_9_16 = '9:16',
  R_3_4 = '3:4',
  R_2_3 = '2:3',
  R_5_4 = '5:4',
  R_4_5 = '4:5'
}

export enum Resolution {
  P720 = '720p',
  P1080 = '1080p',
  R_1K = '1K',
  R_2K = '2K',
  R_4K = '4K'
}

// 节点类型定义
export type WorkflowNodeType = 
  | 'text_input' 
  | 'image_input' 
  | 'image_gen' 
  | 'script_agent'   
  | 'audio_gen'      
  | 'video_gen' 
  | 'video_composer'
  | 'preview'
  | 'sticky_note'     // 新增：便签
  | 'image_matting'   // 新增：抠图
  | 'image_upscale'  // New: Image Upscaling
  | 'group'          // New: Group Node
  | 'pro_icon_gen'   // New: Pro Node (Icon Gen)
  | 'pro_art_director' // New: Pro Node (Art Director)
  | 'icon_prompt'    // New: Dedicated Prompt Node for Icon Gen
  | 'icon_ref_image'  // New: Dedicated Reference Image Node for Icon Gen
  | 'image_receiver' // New: Image Receiver Node
  | 'character_ref'
  | 'ai_refine'
  | 'prompt_translator'
  | 'logic_router'
  | 'logic_aggregator'
  | 'string_processor'
  | 'color_grade'
  | 'image_compare';

export interface NodeData {
  label?: string;
  value?: string; // 用于文本/图片输入
  settings?: {
    model?: string;
    aspectRatio?: AspectRatio;
    duration?: number;
    resolution?: Resolution;
    voice?: string;
    audioType?: 'speech' | 'sfx' | 'music';
    imageRatio?: number; // 新增: 存储上传图片的宽高比 (宽 / 高)
    imageInputMode?: 'start' | 'end'; // 新增: 决定图片是作为起始帧还是结束帧
    startImageBase64?: string; // 手动上传的首帧
    endImageBase64?: string;   // 手动上传的尾帧
    withAudio?: boolean; // 新增: 视频生成是否包含音频 (Seedance)
    role?: string; // 新增: Agent 角色
    width?: number; // Group width
    height?: number; // Group height
    color?: string; // Group color
  };
  outputResult?: string; // 该节点生成的 URL 或文本结果
  outputList?: string[]; 
  audioTrack?: string; // 新增：用于 Video Composer 的音频轨道
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  x: number;
  y: number;
  data: NodeData;
  status: 'idle' | 'running' | 'done' | 'error';
  errorMessage?: string;
  parentId?: string; // New: For Grouping
  extent?: 'parent'; // Optional: constrain to parent
}

export interface WorkflowEdge {
  id: string;
  source: string;
  sourceHandle?: string; // 具体输出端口 ID
  target: string;
  targetHandle?: string; // 具体输入端口 ID
}

export interface VideoConfig {
  model: string;
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  durationSeconds?: number;
  startImage?: string;
  endImage?: string;
}

export interface ImageConfig {
  model: string;
  prompt: string;
  aspectRatio: AspectRatio;
  referenceImages?: string[]; // 新增: 支持多个角色一致性参考图
  resolution?: Resolution;
}

export interface AudioConfig {
    model: string;
    text: string;
    voice: string;
    type?: 'speech' | 'sfx' | 'music';
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category?: 'featured' | 'ads' | 'ecommerce' | 'film' | 'life' | 'tools' | 'fun' | 'acg' | 'basic'; 
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  thumbnail?: string; // New: Template thumbnail
}

// --- 新增用户与项目类型 ---

export type PlanType = 'free' | 'pro' | 'team';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: PlanType;
  credits: number;     // 剩余积分
  joinDate: number;    // 注册时间戳
  subscriptionEnd?: number; // 订阅到期时间
  role?: 'user' | 'admin' | 'super_admin'; // 新增：权限角色
  organizationId?: string; // 所属企业ID
  status?: 'active' | 'banned' | 'pending'; // 账号状态
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model' | 'system';
    content: string;
    type: 'text' | 'workflow' | 'image' | 'video' | 'options';
    data?: any; // Holds workflow data, image URL, or options
    timestamp: number;
}

export interface Project {
  id: string;
  name: string;
  thumbnail?: string;
  thumbnailPosition?: string; // 封面位置 (e.g. "50% 50%")
  description?: string;
  updatedAt: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: { x: number, y: number, zoom: number };
  tags?: string[]; // 新增标签支持
  chatHistory?: ChatMessage[]; // Chat history linked to project
}

export interface CommentMessage {
  id: string;
  authorId?: string;
  authorName: string;
  text: string;
  timestamp: number;
}

export interface CommentThread {
  id: string;
  x: number;
  y: number;
  messages: CommentMessage[];
}

// --- 新增：应用设置 ---
export interface AppSettings {
    autoHideHandles: boolean; // 是否自动隐藏连接点
    showGrid: boolean;        // 是否显示网格
    snapToGrid: boolean;      // 是否对齐网格
    zoomSensitivity?: number; // 缩放灵敏度 (0.5 - 3.0, default 1.0)
    adaptiveZoomMin?: number; // 自适应缩放最小倍率 (0.1 - 1.0, default 0.4)
    adaptiveZoomMax?: number; // 自适应缩放最大倍率 (1.0 - 5.0, default 2.5)
    performanceModeThreshold?: number; // 性能优化阈值: 超过此缩放倍数强制使用位图 (1.0 - 10.0, default 3.0)
    gridType?: 'dots' | 'lines' | 'cross' | 'texture' | 'blueprint'; // 新增 texture (纹理) 和 blueprint (蓝图)
    gridOpacity?: number; // 网格透明度
    canvasBgColor?: string; // 自定义画布背景色
}

// --- Connectors (Backend Interface) ---
export type ConnectorCategory = 'all' | 'llm' | 'image' | 'video' | 'audio' | '3d';
export type ConnectorCapability = 'text' | 'image' | 'video' | 'audio';
export type ConnectorAuthType = 'apiKey' | 'oauth' | 'proxy';

export interface ConnectorConfig {
    endpoint?: string;
    apiKey?: string;
    modelId?: string;
    // MCP Specific
    command?: string;
    args?: string[];
    // Cloud Provider Specific
    secretKey?: string; // Baidu, Tencent, AWS, Volcengine
    accessKey?: string; // AWS, Volcengine
    secretId?: string; // Tencent
    region?: string; // AWS
    deploymentName?: string; // Azure
    apiVersion?: string; // Azure
}

export interface Connector {
    id: string;
    name: string;
    description: string;
    providerId: string; // Identifier used to map icons on frontend (e.g., 'google', 'openai')
    category: ConnectorCategory;
    status: 'connected' | 'available' | 'maintenance' | 'beta';
    type: 'app' | 'system_api' | 'custom_api' | 'mcp'; // 新增：区分应用、预设API、自定义API和MCP
    version: string;
    color: string; // Visual hint passed from backend (Tailwind classes)
    
    // Auth & Validation
    authType: ConnectorAuthType;
    docsUrl?: string; // Where to get the key
    paramLabel?: string; // e.g., "API Key", "JWT Token"
    placeholder?: string; // e.g. "sk-..."
    validationRegex?: string; // Regex string for validation

    userConfig?: ConnectorConfig; // 用户填写的配置
    capabilities?: ConnectorCapability[]; // 新增：显示该连接器支持的能力（文本、图片、视频、音频）
}

// --- Admin System Types ---

export interface Organization {
    id: string;
    name: string;
    plan: PlanType;
    memberCount: number;
    maxMembers: number;
    creditsUsed: number;
    status: 'active' | 'suspended';
    createdAt: number;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SupportTicket {
    id: string;
    userId: string;
    userName: string;
    subject: string;
    message: string;
    status: TicketStatus;
    priority: TicketPriority;
    createdAt: number;
    updatedAt: number;
    category: 'billing' | 'technical' | 'feature' | 'account';
}

export interface AdminStats {
    totalUsers: number;
    activeUsers24h: number;
    totalRevenue: number;
    pendingTickets: number;
    systemHealth: number; // 0-100
}
