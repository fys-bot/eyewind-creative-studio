
import React, { useState, useEffect } from 'react';
import { Connector, ConnectorConfig } from '../types';
import { X, Check, Loader2, ExternalLink, ShieldCheck, AlertCircle, Key, Trash2, Globe, FileText, Shield, Copy, Plus } from 'lucide-react';
import { translations, Language } from '../utils/translations';
import { PROVIDER_ICONS } from '../modules/auth/ConnectorIcons';

interface ConnectorConfigModalProps {
    isOpen: boolean;
    connector: Connector | null;
    onClose: () => void;
    onSave: (id: string, config: ConnectorConfig) => Promise<void>;
    onDisconnect?: (id: string) => Promise<void>;
    lang?: Language;
}

export const ConnectorConfigModal: React.FC<ConnectorConfigModalProps> = ({ isOpen, connector, onClose, onSave, onDisconnect, lang = 'en' }) => {
    const [apiKey, setApiKey] = useState('');
    const [endpoint, setEndpoint] = useState('');
    const [modelId, setModelId] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [accessKey, setAccessKey] = useState('');
    const [secretId, setSecretId] = useState('');
    const [region, setRegion] = useState('');
    const [deploymentName, setDeploymentName] = useState('');
    const [apiVersion, setApiVersion] = useState('');

    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfig, setShowConfig] = useState(false);

    const t = translations[lang];
    const Icon = connector ? (PROVIDER_ICONS[connector.providerId] || PROVIDER_ICONS['default']) : null;

    // Initialize state when connector opens
    useEffect(() => {
        if (connector && connector.userConfig) {
            setApiKey(connector.userConfig.apiKey || '');
            setEndpoint(connector.userConfig.endpoint || '');
            setModelId(connector.userConfig.modelId || '');
            setSecretKey(connector.userConfig.secretKey || '');
            setAccessKey(connector.userConfig.accessKey || '');
            setSecretId(connector.userConfig.secretId || '');
            setRegion(connector.userConfig.region || '');
            setDeploymentName(connector.userConfig.deploymentName || '');
            setApiVersion(connector.userConfig.apiVersion || '');
        } else {
            setApiKey('');
            setEndpoint('');
            setModelId('');
            setSecretKey('');
            setAccessKey('');
            setSecretId('');
            setRegion('');
            setDeploymentName('');
            setApiVersion('');
        }
        setShowConfig(false);
    }, [connector]);

    if (!isOpen || !connector) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsVerifying(true);

        try {
            await onSave(connector.id, { 
                apiKey, endpoint, modelId, 
                secretKey, accessKey, secretId, region, deploymentName, apiVersion 
            });
            onClose();
        } catch (err: any) {
            setError(err.message || t.connectors.verify_fail);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleDisconnect = async () => {
        if (onDisconnect && confirm(t.connectors.delete_confirm)) {
            await onDisconnect(connector.id);
            onClose();
            setApiKey('');
            setEndpoint('');
            setModelId('');
            setSecretKey('');
            setAccessKey('');
            setSecretId('');
            setRegion('');
            setDeploymentName('');
            setApiVersion('');
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for non-secure contexts or older browsers
                const textArea = document.createElement("textarea");
                textArea.value = text;
                
                // Avoid scrolling to bottom
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.position = "fixed";
                textArea.style.opacity = "0";
                
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                try {
                    document.execCommand('copy');
                } catch (err) {
                    console.error('Fallback: Oops, unable to copy', err);
                }
                
                document.body.removeChild(textArea);
            }
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity" onClick={onClose}></div>
            
            <div className="relative bg-white dark:bg-[#1a1a1a] rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-white/10">
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-5 right-5 p-1.5 text-gray-400 hover:text-black dark:hover:text-white transition-colors z-10">
                    <X size={18}/>
                </button>

                <div className="p-6 pt-10 flex flex-col items-center">
                    {/* Brand Icon */}
                    <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center shadow-xl border border-gray-100 dark:border-white/5 mb-5 group-hover:scale-105 transition-transform duration-500">
                        {Icon && <Icon className="w-8 h-8" />}
                    </div>

                    {/* Title & Description */}
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{connector.name}</h2>
                    <p className="text-center text-gray-500 dark:text-gray-400 text-xs leading-relaxed max-w-xs mb-6 px-2">
                        {connector.description}
                    </p>

                    {/* Action Button / Config Form */}
                    {!showConfig ? (
                        <button 
                            onClick={() => setShowConfig(true)}
                            className="flex items-center gap-2 bg-[#1a1a1a] dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg active:scale-95"
                        >
                            <Plus size={16} strokeWidth={3} />
                            {connector.status === 'connected' ? '编辑连接' : t.connectors.status_connect}
                        </button>
                    ) : (
                        <form onSubmit={handleSave} className="w-full space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                            {error && (
                                <div className="p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg flex items-start gap-2">
                                    <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0"/>
                                    <span className="text-[10px] text-red-600 dark:text-red-300 font-medium">{error}</span>
                                </div>
                            )}

                            {/* --- Special Provider Forms --- */}
                            
                            {/* 1. Azure OpenAI */}
                            {connector.providerId === 'azure' && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Azure Endpoint</label>
                                        <input 
                                            type="url" 
                                            value={endpoint}
                                            onChange={(e) => { setEndpoint(e.target.value); setError(null); }}
                                            placeholder="https://{resource}.openai.azure.com/"
                                            className="w-full pl-3 pr-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">API Key</label>
                                        <input 
                                            type="password" 
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="Azure API Key"
                                            className="w-full pl-3 pr-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Deployment Name</label>
                                        <input 
                                            type="text" 
                                            value={deploymentName}
                                            onChange={(e) => setDeploymentName(e.target.value)}
                                            placeholder="e.g. gpt-4-turbo"
                                            className="w-full pl-3 pr-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 2. AWS Bedrock */}
                            {connector.providerId === 'aws' && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Access Key ID</label>
                                        <input 
                                            type="text" 
                                            value={accessKey}
                                            onChange={(e) => { setAccessKey(e.target.value); setError(null); }}
                                            placeholder="AKIA..."
                                            className="w-full pl-3 pr-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Secret Access Key</label>
                                        <input 
                                            type="password" 
                                            value={secretKey}
                                            onChange={(e) => setSecretKey(e.target.value)}
                                            placeholder="wJalrX..."
                                            className="w-full pl-3 pr-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Region</label>
                                        <input 
                                            type="text" 
                                            value={region}
                                            onChange={(e) => setRegion(e.target.value)}
                                            placeholder="us-east-1"
                                            className="w-full pl-3 pr-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 3. Baidu (AK/SK) */}
                            {connector.providerId === 'baidu' && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">
                                                API Key (Access Key)
                                            </label>
                                            <a 
                                                href="https://console.bce.baidu.com/iam/#/iam/accesslist"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] text-blue-500 hover:text-blue-600 flex items-center gap-0.5"
                                            >
                                                获取密钥 <ExternalLink size={10}/>
                                            </a>
                                        </div>
                                        <input 
                                            type="text" 
                                            value={apiKey}
                                            onChange={(e) => { setApiKey(e.target.value); setError(null); }}
                                            placeholder="ALTAKJ..."
                                            className="w-full pl-3 pr-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Secret Key</label>
                                        <input 
                                            type="password" 
                                            value={secretKey}
                                            onChange={(e) => setSecretKey(e.target.value)}
                                            placeholder="e.g. b482..."
                                            className="w-full pl-3 pr-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 3.1 Volcengine (OpenAI Compatible) */}
                            {connector.providerId === 'volcengine' && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">
                                                API Key (Bearer Token)
                                            </label>
                                            <a 
                                                href="https://console.volcengine.com/iam/keymanage/"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] text-blue-500 hover:text-blue-600 flex items-center gap-0.5"
                                            >
                                                获取密钥 <ExternalLink size={10}/>
                                            </a>
                                        </div>
                                        <input 
                                            type="password" 
                                            value={apiKey}
                                            onChange={(e) => { setApiKey(e.target.value); setError(null); }}
                                            placeholder="f5b99095-..."
                                            className="w-full pl-3 pr-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">
                                                Model (Endpoint ID)
                                            </label>
                                            <a 
                                                href="https://console.volcengine.com/ark/region:ark+cn-beijing/endpoint"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] text-blue-500 hover:text-blue-600 flex items-center gap-0.5"
                                            >
                                                获取接入点 <ExternalLink size={10}/>
                                            </a>
                                        </div>
                                        <input 
                                            type="text" 
                                            value={modelId}
                                            onChange={(e) => setModelId(e.target.value)}
                                            placeholder="文生图请填 CV 接入点 (如 ep-xxx)"
                                            className="w-full pl-3 pr-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                        />
                                        <p className="text-[9px] text-gray-400 ml-1">如需同时使用视频和图片模型，请在运行时通过节点下拉选择（此 ID 为默认值）</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Base URL</label>
                                        <input 
                                            type="url" 
                                            value={endpoint}
                                            onChange={(e) => setEndpoint(e.target.value)}
                                            placeholder="https://ark.cn-beijing.volces.com/api/v3"
                                            className="w-full pl-3 pr-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                        />
                                        <p className="text-[9px] text-gray-400 ml-1">默认为: https://ark.cn-beijing.volces.com/api/v3</p>
                                    </div>
                                </div>
                            )}

                            {/* 4. Tencent (SecretId/SecretKey) */}
                            {connector.providerId === 'tencent' && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Secret ID</label>
                                            <a 
                                                href="https://console.cloud.tencent.com/cam/capi"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] text-blue-500 hover:text-blue-600 flex items-center gap-0.5"
                                            >
                                                获取密钥 <ExternalLink size={10}/>
                                            </a>
                                        </div>
                                        <input 
                                            type="text" 
                                            value={secretId}
                                            onChange={(e) => { setSecretId(e.target.value); setError(null); }}
                                            placeholder="AKID..."
                                            className="w-full pl-3 pr-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Secret Key</label>
                                        <input 
                                            type="password" 
                                            value={secretKey}
                                            onChange={(e) => setSecretKey(e.target.value)}
                                            placeholder="Secret Key"
                                            className="w-full pl-3 pr-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 5. Hugging Face */}
                            {connector.providerId === 'huggingface' && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Access Token (API Key)</label>
                                        <input 
                                            type="password" 
                                            value={apiKey}
                                            onChange={(e) => { setApiKey(e.target.value); setError(null); }}
                                            placeholder="hf_..."
                                            className="w-full pl-3 pr-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                            autoFocus
                                        />
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Model ID (Optional)</label>
                                        <input 
                                            type="text" 
                                            value={modelId}
                                            onChange={(e) => setModelId(e.target.value)}
                                            placeholder="e.g. meta-llama/Llama-3.2-1B"
                                            className="w-full pl-3 pr-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Inference Endpoint (Optional)</label>
                                        <input 
                                            type="url" 
                                            value={endpoint}
                                            onChange={(e) => setEndpoint(e.target.value)}
                                            placeholder="https://api-inference.huggingface.co/models/..."
                                            className="w-full pl-3 pr-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                        />
                                        <p className="text-[9px] text-gray-400 ml-1">Leave empty to use the standard free Serverless Inference API.</p>
                                    </div>
                                </div>
                            )}

                            {/* Default / Standard Providers (OpenAI, Anthropic, etc.) */}
                            {!['azure', 'aws', 'baidu', 'volcengine', 'tencent', 'huggingface'].includes(connector.providerId) && (
                                <>
                                    {connector.authType === 'apiKey' && (
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">
                                                {connector.paramLabel || t.connectors.form_key}
                                            </label>
                                            <div className="relative">
                                                <input 
                                                    type="password" 
                                                    value={apiKey}
                                                    onChange={(e) => { setApiKey(e.target.value); setError(null); }}
                                                    placeholder={connector.placeholder || "sk-..."}
                                                    className="w-full pl-3 pr-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {connector.authType === 'proxy' && (
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">代理端点</label>
                                                <input 
                                                    type="url" 
                                                    value={endpoint}
                                                    onChange={(e) => { setEndpoint(e.target.value); setError(null); }}
                                                    placeholder="https://ai-gateway.eyewind.com/v1"
                                                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm text-gray-900 dark:text-white font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">API 密钥</label>
                                                <input 
                                                    type="password" 
                                                    value={apiKey}
                                                    onChange={(e) => setApiKey(e.target.value)}
                                                    placeholder="sk-..."
                                                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-gray-900 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="flex gap-2 pt-2">
                                {connector.status === 'connected' && (
                                    <button 
                                        type="button"
                                        onClick={handleDisconnect}
                                        className="flex-1 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={14} />
                                        {t.connectors.status_disconnect}
                                    </button>
                                )}
                                <button 
                                    type="submit"
                                    disabled={isVerifying || (!apiKey && !endpoint)}
                                    className="flex-1 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isVerifying ? <Loader2 size={14} className="animate-spin"/> : <Check size={14} strokeWidth={3}/>}
                                    {isVerifying ? t.actions.processing : t.connectors.form_save}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Info Card */}
                    <div className="w-full mt-8 bg-gray-50 dark:bg-black/20 rounded-[20px] border border-gray-100 dark:border-white/5 overflow-hidden">
                        <div className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-medium">连接器类型</span>
                                <span className="text-xs text-gray-900 dark:text-white font-bold">API</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-medium">作者</span>
                                <span className="text-xs text-gray-900 dark:text-white font-bold">{connector.providerId === 'openai' ? 'OpenAI' : (connector.name.split(' ')[0])}</span>
                            </div>
                            <div className="flex items-center justify-between group cursor-pointer" onClick={() => copyToClipboard(connector.id)}>
                                <span className="text-xs text-gray-400 font-medium">UUID</span>
                                <div className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors">
                                    <Copy size={14} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between group cursor-pointer" onClick={() => connector.docsUrl && window.open(connector.docsUrl, '_blank')}>
                                <span className="text-xs text-gray-400 font-medium">网站</span>
                                <div className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors">
                                    <Globe size={14} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between group cursor-pointer" onClick={() => connector.docsUrl && window.open(connector.docsUrl, '_blank')}>
                                <span className="text-xs text-gray-400 font-medium">文档</span>
                                <div className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors">
                                    <FileText size={14} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between group cursor-pointer">
                                <span className="text-xs text-gray-400 font-medium">隐私政策</span>
                                <div className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors">
                                    <Shield size={14} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Feedback Link */}
                    <button className="mt-6 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors font-medium">
                        提供反馈
                    </button>
                </div>
            </div>
        </div>
    );
};
