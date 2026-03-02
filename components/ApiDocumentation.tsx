import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface ApiEndpoint {
  path: string;
  method: string;
  summary: string;
  description: string;
  requestBody?: any;
  responses?: any;
}

interface ApiDocumentationProps {
  onClose: () => void;
}

export const ApiDocumentation: React.FC<ApiDocumentationProps> = ({ onClose }) => {
  const [apiSpec, setApiSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  useEffect(() => {
    fetchApiSpec();
  }, []);

  const fetchApiSpec = async () => {
    try {
      const isDev = (import.meta as any).env?.DEV || false;
      const baseUrl = isDev ? '/ai-gateway/v1' : 'https://ai-gateway.eyewind.com/v1';
      
      const response = await fetch(`${baseUrl}/api-spec`);
      const data = await response.json();
      setApiSpec(data);
    } catch (error) {
      console.error('Failed to fetch API spec:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, path: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const renderEndpoints = () => {
    if (!apiSpec?.paths) return null;

    const endpoints: ApiEndpoint[] = [];
    
    Object.entries(apiSpec.paths).forEach(([path, methods]: [string, any]) => {
      Object.entries(methods).forEach(([method, details]: [string, any]) => {
        endpoints.push({
          path,
          method: method.toUpperCase(),
          summary: details.summary || '',
          description: details.description || '',
          requestBody: details.requestBody,
          responses: details.responses
        });
      });
    });

    return endpoints.map((endpoint, index) => (
      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg mb-4 overflow-hidden">
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setSelectedEndpoint(selectedEndpoint === endpoint.path ? null : endpoint.path)}
        >
          <div className="flex items-center gap-3 flex-1">
            <span className={`px-2 py-1 rounded text-xs font-bold ${
              endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
              endpoint.method === 'POST' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {endpoint.method}
            </span>
            <code className="text-sm font-mono text-gray-700 dark:text-gray-300">{endpoint.path}</code>
            <span className="text-sm text-gray-600 dark:text-gray-400">{endpoint.summary}</span>
          </div>
          {selectedEndpoint === endpoint.path ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>

        {selectedEndpoint === endpoint.path && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{endpoint.description}</p>

            {endpoint.requestBody && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">请求体 (Request Body)</h4>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(getRequestExample(endpoint), null, 2), endpoint.path + '-req')}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  >
                    {copiedPath === endpoint.path + '-req' ? <Check size={14} /> : <Copy size={14} />}
                    复制示例
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(getRequestExample(endpoint), null, 2)}
                </pre>
              </div>
            )}

            {renderModelMapping(endpoint.path)}
          </div>
        )}
      </div>
    ));
  };

  const getRequestExample = (endpoint: ApiEndpoint) => {
    const schema = endpoint.requestBody?.content?.['application/json']?.schema;
    if (!schema) return {};

    const schemaRef = schema.$ref;
    if (schemaRef) {
      const schemaName = schemaRef.split('/').pop();
      const schemaObj = apiSpec.components?.schemas?.[schemaName];
      return generateExampleFromSchema(schemaObj);
    }

    return generateExampleFromSchema(schema);
  };

  const generateExampleFromSchema = (schema: any): any => {
    if (!schema) return {};

    const example: any = {};
    const properties = schema.properties || {};
    const required = schema.required || [];

    Object.entries(properties).forEach(([key, prop]: [string, any]) => {
      if (required.includes(key) || prop.default !== undefined) {
        if (prop.example !== undefined) {
          example[key] = prop.example;
        } else if (prop.default !== undefined) {
          example[key] = prop.default;
        } else if (prop.enum) {
          example[key] = prop.enum[0];
        } else if (prop.type === 'string') {
          example[key] = prop.description || `示例${key}`;
        } else if (prop.type === 'integer' || prop.type === 'number') {
          example[key] = prop.minimum || 1;
        } else if (prop.type === 'boolean') {
          example[key] = false;
        }
      }
    });

    return example;
  };

  const renderModelMapping = (path: string) => {
    const mappings: { [key: string]: string } = {
      '/v1/videos/generations': '视频生成模型：从模型列表中选择 type="video" 的模型',
      '/v1/audio/generations': '音频生成模型：从模型列表中选择 type="audio" 的模型',
      '/v1/images/generations': '图像生成模型：从模型列表中选择 type="image" 的模型',
      '/v1/chat/completions': '文本生成模型：从模型列表中选择 type="language" 的模型',
    };

    const mapping = mappings[path];
    if (!mapping) return null;

    return (
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
        <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-2">模型选择说明</h4>
        <p className="text-sm text-blue-600 dark:text-blue-400">{mapping}</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载 API 文档...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Gateway API 文档</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {apiSpec?.info?.title} - v{apiSpec?.info?.version}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">接口概览</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{apiSpec?.info?.description}</p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">可用接口</h3>
            {renderEndpoints()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
            Base URL: {apiSpec?.servers?.[0]?.url || 'https://ai-gateway.eyewind.com'}
          </p>
        </div>
      </div>
    </div>
  );
};
