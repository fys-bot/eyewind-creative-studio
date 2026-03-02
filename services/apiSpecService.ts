// API 规范服务 - 动态获取和验证 API 规范

const isDevelopment = (import.meta as any).env?.DEV || false;
const API_BASE_URL = isDevelopment 
    ? '/ai-gateway/v1'
    : 'https://ai-gateway.eyewind.com/v1';

// 缓存 API 规范
let cachedApiSpec: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10分钟缓存

/**
 * 获取 API 规范
 */
export const getApiSpec = async (): Promise<any> => {
    const now = Date.now();
    
    // 检查缓存
    if (cachedApiSpec && (now - lastFetchTime) < CACHE_DURATION) {
        return cachedApiSpec;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api-spec`);
        if (!response.ok) {
            throw new Error(`Failed to fetch API spec: ${response.status}`);
        }

        const spec = await response.json();
        cachedApiSpec = spec;
        lastFetchTime = now;
        
        console.log('[API Spec] Loaded API specification');
        return spec;
    } catch (error) {
        console.error('[API Spec] Failed to fetch API spec:', error);
        return null;
    }
};

/**
 * 获取特定端点的请求体 schema
 */
export const getEndpointSchema = async (path: string, method: string = 'post'): Promise<any> => {
    const spec = await getApiSpec();
    if (!spec) return null;

    const endpoint = spec.paths?.[path]?.[method.toLowerCase()];
    if (!endpoint) return null;

    const schemaRef = endpoint.requestBody?.content?.['application/json']?.schema?.$ref;
    if (!schemaRef) return null;

    // 解析 schema 引用
    const schemaName = schemaRef.split('/').pop();
    return spec.components?.schemas?.[schemaName];
};

/**
 * 根据 schema 验证和补全请求体
 */
export const validateAndCompleteRequest = (requestBody: any, schema: any): { 
    valid: boolean; 
    completed: any; 
    errors: string[];
} => {
    if (!schema) {
        return { valid: true, completed: requestBody, errors: [] };
    }

    const errors: string[] = [];
    const completed = { ...requestBody };
    const properties = schema.properties || {};
    const required = schema.required || [];

    // 检查必需字段
    required.forEach((field: string) => {
        if (!(field in completed) || completed[field] === undefined || completed[field] === null) {
            errors.push(`Missing required field: ${field}`);
        }
    });

    // 添加默认值
    Object.entries(properties).forEach(([key, prop]: [string, any]) => {
        if (!(key in completed) && prop.default !== undefined) {
            completed[key] = prop.default;
            console.log(`[API Spec] Added default value for ${key}:`, prop.default);
        }
    });

    // 验证枚举值
    Object.entries(properties).forEach(([key, prop]: [string, any]) => {
        if (key in completed && prop.enum) {
            if (!prop.enum.includes(completed[key])) {
                errors.push(`Invalid value for ${key}: ${completed[key]}. Must be one of: ${prop.enum.join(', ')}`);
            }
        }
    });

    return {
        valid: errors.length === 0,
        completed,
        errors
    };
};

/**
 * 清除缓存
 */
export const clearApiSpecCache = () => {
    cachedApiSpec = null;
    lastFetchTime = 0;
    console.log('[API Spec] Cache cleared');
};
