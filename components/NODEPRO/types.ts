export interface ProNodeConfig {
    id: string;
    name: string;
    description: string;
    version: string;
    
    // 输入定义：提示词 + 参数设置
    inputs: {
        prompt: {
            label: string;
            placeholder: string;
            required: boolean;
        };
        settings: ProSetting[];
    };

    // 规则定义：核心处理逻辑
    rules: {
        systemPrompt: string; // 核心规则/角色设定
        outputFormat: 'text' | 'json' | 'markdown' | 'code';
        constraints?: string[]; // 约束条件
    };
}

export interface ProSetting {
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'boolean' | 'slider' | 'image_upload';
    defaultValue: any;
    options?: { label: string; value: string }[]; // For select
    min?: number;
    max?: number;
}

export interface ProExecutionResult {
    success: boolean;
    data: any;
    metadata?: {
        timestamp: number;
        modelUsed: string;
        tokens?: number;
    };
}
