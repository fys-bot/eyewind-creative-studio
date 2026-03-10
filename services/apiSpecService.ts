// API 规范服务 - 通过 /v1/docs-json 动态获取模型 API Schema
// 新接口: GET /v1/docs-json?model={model_id} (无需认证)
// 旧接口: GET /v1/api-spec (兼容保留)

import { getModelSchema, validateRequestWithSchema, ModelSchema } from './modelService';

const isDevelopment = (import.meta as any).env?.DEV || false;
const API_BASE_URL = isDevelopment 
    ? '/ai-gateway/v1'
    : 'https://ai-gateway.eyewind.com/v1';

// 旧 api-spec 缓存（兼容）
let cachedApiSpec: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 10 * 60 * 1000;

/**
 * 获取旧版 API 规范（兼容保留）
 */
export const getApiSpec = async (): Promise<any> => {
    const now = Date.now();
    if (cachedApiSpec && (now - lastFetchTime) < CACHE_DURATION) {
        return cachedApiSpec;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api-spec`);
        if (response.ok) {
            const spec = await response.json();
            cachedApiSpec = spec;
            lastFetchTime = now;
            return spec;
        }
        
        if (response.status === 401) {
            const cachedToken = (window as any).__ai_gateway_token;
            if (cachedToken) {
                const retryResponse = await fetch(`${API_BASE_URL}/api-spec`, {
                    headers: { 'Authorization': `Bearer ${cachedToken}` }
                });
                if (retryResponse.ok) {
                    const spec = await retryResponse.json();
                    cachedApiSpec = spec;
                    lastFetchTime = now;
                    return spec;
                }
            }
        }
        
        return cachedApiSpec || null;
    } catch (error) {
        console.error('[API Spec] Failed to fetch:', error);
        return cachedApiSpec || null;
    }
};

/**
 * 获取特定模型的 API Schema（新方式，通过 docs-json）
 * 优先使用 /v1/docs-json?model={modelId}
 */
export const getModelApiSchema = async (modelId: string): Promise<ModelSchema | null> => {
    return getModelSchema(modelId);
};

/**
 * 获取特定端点的请求体 schema（兼容旧接口）
 * 如果旧接口不可用，返回 null
 */
export const getEndpointSchema = async (path: string, method: string = 'post'): Promise<any> => {
    const spec = await getApiSpec();
    if (!spec) return null;

    const endpoint = spec.paths?.[path]?.[method.toLowerCase()];
    if (!endpoint) return null;

    const schemaRef = endpoint.requestBody?.content?.['application/json']?.schema?.$ref;
    if (!schemaRef) return null;

    const schemaName = schemaRef.split('/').pop();
    return spec.components?.schemas?.[schemaName];
};

/**
 * 根据模型 Schema 验证和补全请求体（新方式）
 */
export const validateWithModelSchema = (
    requestBody: any, 
    schema: ModelSchema
): { valid: boolean; completed: any; errors: string[] } => {
    return validateRequestWithSchema(requestBody, schema);
};

/**
 * 根据旧版 schema 验证和补全请求体（兼容）
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

    required.forEach((field: string) => {
        if (!(field in completed) || completed[field] === undefined || completed[field] === null) {
            errors.push(`Missing required field: ${field}`);
        }
    });

    Object.entries(properties).forEach(([key, prop]: [string, any]) => {
        if (!(key in completed) && prop.default !== undefined) {
            completed[key] = prop.default;
        }
    });

    Object.entries(properties).forEach(([key, prop]: [string, any]) => {
        if (key in completed && prop.enum) {
            if (!prop.enum.includes(completed[key])) {
                errors.push(`Invalid value for ${key}: ${completed[key]}. Must be one of: ${prop.enum.join(', ')}`);
            }
        }
    });

    return { valid: errors.length === 0, completed, errors };
};

export const clearApiSpecCache = () => {
    cachedApiSpec = null;
    lastFetchTime = 0;
    console.log('[API Spec] Cache cleared');
};
