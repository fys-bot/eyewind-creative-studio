import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, Copy, Check, Loader2, Search } from 'lucide-react';
import { fetchModelsFromGateway, getModelSchema, generateExampleRequest, AIModel, ModelSchema, ModelParameter } from '../services/modelService';

interface ApiDocumentationProps {
  onClose: () => void;
}

// 模型类型分组配置
const TYPE_GROUPS = [
    { key: 'Chat', label: 'Chat / 对话', icon: '💬' },
    { key: 'Image', label: 'Image / 图像', icon: '🖼️' },
    { key: 'Video', label: 'Video / 视频', icon: '🎬' },
    { key: 'Audio', label: 'Audio / 音频', icon: '🎵' },
    { key: 'TTS', label: 'TTS / 语音合成', icon: '🔊' },
    { key: 'Embedding', label: 'Embedding / 向量', icon: '📊' },
    { key: 'Other', label: 'Other / 其他', icon: '🔧' },
];

export const ApiDocumentation: React.FC<ApiDocumentationProps> = ({ onClose }) => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [modelSchema, setModelSchema] = useState<ModelSchema | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const data = await fetchModelsFromGateway();
      setModels(data);
      // 默认选中第一个有模型的类型
      const types = [...new Set(data.map(m => m.type))];
      if (types.length > 0) setActiveType(types[0]);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModelSchema = async (modelId: string) => {
    if (selectedModel === modelId) {
      setSelectedModel(null);
      setModelSchema(null);
      return;
    }
    setSelectedModel(modelId);
    setSchemaLoading(true);
    try {
      const schema = await getModelSchema(modelId);
      setModelSchema(schema);
    } catch (error) {
      console.error('Failed to load schema:', error);
      setModelSchema(null);
    } finally {
      setSchemaLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(key);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // 按类型分组模型
  const groupedModels = models.reduce((acc, model) => {
    const type = model.type || 'Other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  // 搜索过滤
  const filteredModels = searchQuery
    ? models.filter(m => 
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.info?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.info?.developer || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activeType ? (groupedModels[activeType] || []) : [];

  const renderParameter = (param: ModelParameter) => (
    <tr key={param.name} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="py-2 px-3">
        <code className="text-xs font-mono text-blue-600 dark:text-blue-400">{param.name}</code>
        {param.required && <span className="ml-1 text-[10px] text-red-500 font-bold">*</span>}
      </td>
      <td className="py-2 px-3 text-xs text-gray-500 dark:text-gray-400">{param.type}</td>
      <td className="py-2 px-3 text-xs text-gray-600 dark:text-gray-300">
        {param.description || '-'}
        {param.enum && (
          <div className="mt-1 flex flex-wrap gap-1">
            {param.enum.map((v, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">
                {String(v)}
              </span>
            ))}
          </div>
        )}
        {param.default !== undefined && (
          <span className="ml-1 text-[10px] text-gray-400">默认: {String(param.default)}</span>
        )}
        {param.minimum !== undefined && (
          <span className="ml-1 text-[10px] text-gray-400">min: {param.minimum}</span>
        )}
        {param.maximum !== undefined && (
          <span className="ml-1 text-[10px] text-gray-400">max: {param.maximum}</span>
        )}
      </td>
    </tr>
  );

  const renderModelDetail = () => {
    if (!modelSchema) return null;
    const { api_schema, capabilities } = modelSchema;
    const exampleReq = generateExampleRequest(modelSchema);
    const curlExample = `curl -X ${api_schema.method} "https://ai-gateway.eyewind.com${api_schema.endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <YOUR_TOKEN>" \\
  -d '${JSON.stringify({ model: modelSchema.model_id, ...exampleReq }, null, 2)}'`;

    return (
      <div className="mt-3 space-y-4 animate-in fade-in duration-200">
        {/* 端点信息 */}
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            api_schema.method === 'POST' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
          }`}>{api_schema.method}</span>
          <code className="text-sm font-mono text-gray-700 dark:text-gray-300">{api_schema.endpoint}</code>
          {api_schema.async_flow && (
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded text-[10px] font-bold">异步</span>
          )}
        </div>

        {/* 异步流程说明 */}
        {api_schema.async_flow && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs">
            <p className="font-bold text-amber-700 dark:text-amber-300 mb-1">异步流程</p>
            <p className="text-amber-600 dark:text-amber-400">
              1. 提交: {api_schema.async_flow.submit_endpoint}<br/>
              2. 轮询: {api_schema.async_flow.poll_endpoint} ({api_schema.async_flow.poll_method})
            </p>
          </div>
        )}

        {/* 参数表格 */}
        {api_schema.parameters.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">请求参数</h4>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                    <th className="py-2 px-3">参数名</th>
                    <th className="py-2 px-3">类型</th>
                    <th className="py-2 px-3">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {api_schema.parameters.map(renderParameter)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Capabilities */}
        {capabilities && Object.keys(capabilities).length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">模型能力</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(capabilities).map(([key, val]) => (
                <span key={key} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">
                  {key}: {typeof val === 'boolean' ? (val ? '✅' : '❌') : Array.isArray(val) ? val.join(', ') : String(val)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* cURL 示例 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">cURL 示例</h4>
            <button
              onClick={() => copyToClipboard(curlExample, 'curl-' + modelSchema.model_id)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {copiedText === 'curl-' + modelSchema.model_id ? <Check size={12} /> : <Copy size={12} />}
              复制
            </button>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-[11px] overflow-x-auto leading-relaxed">
            {curlExample}
          </pre>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">加载模型列表...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Gateway API 文档</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              共 {models.length} 个模型 · 点击模型查看 API Schema 和调用示例
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Search + Type Tabs */}
        <div className="px-5 pt-4 pb-2 space-y-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索模型 ID、名称或开发者..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:border-blue-400"
            />
          </div>
          {!searchQuery && (
            <div className="flex gap-1 overflow-x-auto pb-1">
              {TYPE_GROUPS.filter(g => groupedModels[g.key]?.length > 0).map(group => (
                <button
                  key={group.key}
                  onClick={() => setActiveType(group.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    activeType === group.key
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>{group.icon}</span>
                  <span>{group.label}</span>
                  <span className="text-[10px] opacity-60">({groupedModels[group.key]?.length || 0})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Model List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {filteredModels.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              {searchQuery ? '没有找到匹配的模型' : '选择一个类型查看模型'}
            </div>
          )}
          {filteredModels.map(model => (
            <div key={model.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                onClick={() => loadModelSchema(model.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {model.info?.name || model.id}
                      </span>
                      <code className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded shrink-0">
                        {model.id}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-500">{model.info?.developer || model.provider}</span>
                      {model.info?.description && (
                        <span className="text-[10px] text-gray-400 truncate max-w-[300px]">{model.info.description}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {model.tags?.slice(0, 3).map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] text-gray-500">
                      {tag}
                    </span>
                  ))}
                  {selectedModel === model.id ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                </div>
              </div>

              {selectedModel === model.id && (
                <div className="px-4 pb-4 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
                  {schemaLoading ? (
                    <div className="flex items-center gap-2 py-6 justify-center text-gray-400 text-sm">
                      <Loader2 size={16} className="animate-spin" /> 加载 Schema...
                    </div>
                  ) : modelSchema ? (
                    renderModelDetail()
                  ) : (
                    <div className="py-6 text-center text-gray-400 text-sm">
                      该模型暂无 API Schema 信息
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-2xl">
          <p className="text-[10px] text-gray-400 text-center">
            Base URL: https://ai-gateway.eyewind.com · 模型列表: GET /v1/models · 模型文档: GET /v1/docs-json?model=&#123;id&#125;
          </p>
        </div>
      </div>
    </div>
  );
};
