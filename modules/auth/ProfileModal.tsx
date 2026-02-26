import React, { useState, useMemo, useEffect } from 'react';
import { 
    X, User, Settings, Zap, LogOut, 
    Plug, 
    Moon, Sun, Monitor, CheckCircle, RefreshCw,
    Mail, Calendar, UploadCloud, Plus, Search,
    MessageSquare, Image as ImageIcon, Video, Music, Code, Box,
    Check, Loader2, Trash2, Server, Grid, MousePointerClick, Cloud,
    Battery, Gauge, Eye, RotateCcw, Camera, Edit3, Folder, ChevronRight, CreditCard
} from 'lucide-react';
import { useAuth, UserCenterTab } from './AuthContext';
import { ThemeMode, Connector, ConnectorConfig, AppSettings } from '../../types';
import { fetchConnectors, verifyAndConnectConnector, disconnectConnector, addCustomConnector, removeCustomConnector, updateCustomConnector } from '../../services/connectorService';
import { ConnectorConfigModal } from '../../components/ConnectorConfigModal';
import { translations, Language } from '../../utils/translations';
import { detectPerformanceTier, PERFORMANCE_PRESETS, PerformanceTier } from '../../utils/performanceUtils';
import { Logo } from '../../components/ui/Logo';
import { PROVIDER_ICONS } from './ConnectorIcons';

interface ProfileModalProps {
    settings?: AppSettings;
    onUpdateSettings?: (s: AppSettings) => void;
    lang?: Language;
}

// --- Sub-Component for Connector Item ---
interface ConnectorItemProps { 
    connector: Connector;
    onToggle: (id: string) => void;
    onDelete?: (id: string) => void;
    onEdit?: (connector: Connector) => void;
    loadingId: string | null;
    t: any;
}

const ConnectorItem: React.FC<ConnectorItemProps> = ({ connector, onToggle, onDelete, onEdit, loadingId, t }) => {
    const Icon = PROVIDER_ICONS[connector.providerId] || PROVIDER_ICONS['default'];
    const isProcessing = loadingId === connector.id;
    const isCustom = connector.type === 'custom' || connector.type === 'custom_api' || connector.type === 'mcp';

    return (
        <div 
            className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 flex flex-col gap-4 group relative shadow-sm shadow-black/5 h-full"
        >
            {/* Top Section: Icon + Text + Edit Actions */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    {/* Icon */}
                    <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <Icon className="w-6 h-6" />
                    </div>
                    
                    {/* Title */}
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 dark:text-white text-base truncate">{connector.name}</h4>
                            {isCustom && (
                                <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-[8px] font-bold text-gray-500 rounded">
                                    CUSTOM
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Edit/Delete Actions (Top Right) */}
                 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isCustom && onEdit && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(connector); }}
                            className="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Edit"
                        >
                            <Edit3 size={16} />
                        </button>
                    )}
                    {isCustom && onDelete && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(connector.id); }}
                            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Middle: Description */}
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed h-12">
                {connector.description}
            </p>

            {/* Bottom Section: Capabilities + Connect Button */}
            <div className={`mt-auto pt-4 border-t border-gray-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-4`}>
                {/* Capabilities */}
                <div className={`flex items-center gap-3 ${connector.type === 'app' ? 'invisible' : ''}`}>
                    {[
                        { id: 'text', icon: MessageSquare },
                        { id: 'image', icon: ImageIcon },
                        { id: 'video', icon: Video },
                        { id: 'audio', icon: Music }
                    ].map(cap => {
                        const isActive = connector.capabilities?.includes(cap.id as any);
                        return (
                            <div 
                                key={cap.id}
                                className={`flex items-center transition-all ${
                                    isActive 
                                    ? 'text-gray-900 dark:text-white' 
                                    : 'text-gray-200 dark:text-gray-800'
                                }`}
                            >
                                <cap.icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
                            </div>
                        );
                    })}
                </div>

                {/* Connect Button */}
                <button 
                    onClick={() => onToggle(connector.id)}
                    disabled={isProcessing}
                    className={`min-w-[80px] px-4 py-2 rounded-xl text-xs font-bold transition-all border mt-2 sm:mt-0 ${
                        connector.status === 'connected'
                        ? 'bg-green-500/10 dark:bg-green-500/20 border-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/20'
                        : 'bg-black dark:bg-white border-transparent text-white dark:text-black hover:opacity-90'
                    }`}
                >
                    {isProcessing ? <Loader2 size={14} className="animate-spin mx-auto"/> : (connector.status === 'connected' ? t.connectors.status_connected : t.connectors.status_connect)}
                </button>
            </div>
        </div>
    );
};

export const ProfileModal: React.FC<ProfileModalProps> = ({ settings, onUpdateSettings, lang = 'en' }) => {
    const { 
        isProfileOpen, closeProfile, user, logout, updateUser, 
        openSubscription, activeProfileTab, openProfile,
        themeMode, setThemeMode
    } = useAuth();
    
    // Connector States
    const [connectorSearch, setConnectorSearch] = useState('');
    const [connectorTab, setConnectorTab] = useState<'connected' | 'apps' | 'custom_api' | 'mcp'>('apps');
    const [connectors, setConnectors] = useState<Connector[]>([]);
    const [isLoadingConnectors, setIsLoadingConnectors] = useState(false);
    const [processingConnectorId, setProcessingConnectorId] = useState<string | null>(null);
    
    // Config Modal State
    const [configModalConnector, setConfigModalConnector] = useState<Connector | null>(null);
    
    // Add Custom Model Modal State
    const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
    const [customFormData, setCustomFormData] = useState({ 
        name: '', endpoint: '', apiKey: '', modelId: '', 
        command: '', args: '', category: 'llm' as any 
    });
    const [editingConnectorId, setEditingConnectorId] = useState<string | null>(null);

    // --- Account View States ---
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState('');

    useEffect(() => {
        if (user) setEditName(user.name);
    }, [user]);

    const t = translations[lang];

    useEffect(() => {
        if (isProfileOpen && activeProfileTab === 'connectors') {
            setIsLoadingConnectors(true);
            fetchConnectors().then(data => {
                setConnectors(data);
                setIsLoadingConnectors(false);
            });
        }
    }, [isProfileOpen, activeProfileTab]);

    const handleSaveCustomModel = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (editingConnectorId) {
            const updated = await updateCustomConnector(editingConnectorId, customFormData);
            if (updated) {
                setConnectors(prev => prev.map(c => c.id === editingConnectorId ? updated : c));
            }
        } else {
            const newConnector = await addCustomConnector(customFormData);
            setConnectors(prev => [newConnector, ...prev]);
        }

        setIsAddCustomOpen(false);
        setCustomFormData({ name: '', endpoint: '', apiKey: '', modelId: '' });
        setEditingConnectorId(null);
    };

    const handleEditCustom = (connector: Connector) => {
        setCustomFormData({
            name: connector.name,
            endpoint: connector.userConfig?.endpoint || '',
            apiKey: connector.userConfig?.apiKey || '',
            modelId: connector.userConfig?.modelId || ''
        });
        setEditingConnectorId(connector.id);
        setIsAddCustomOpen(true);
    };

    const handleDeleteCustom = async (id: string) => {
        if(confirm(t.connectors.delete_confirm)) {
            await removeCustomConnector(id);
            setConnectors(prev => prev.filter(c => c.id !== id));
        }
    };

    const handleConnectorAction = async (id: string) => {
        const connector = connectors.find(c => c.id === id);
        if (!connector) return;
        
        if (connector.type === 'custom') {
            handleEditCustom(connector);
            return;
        }

        // Always open config for now, even if connected, to allow updating key
        setConfigModalConnector(connector);
    };

    const handleSaveConnectorConfig = async (id: string, config: ConnectorConfig) => {
        const updated = await verifyAndConnectConnector(id, config);
        setConnectors(prev => prev.map(c => c.id === id ? updated : c));
    };

    const handleDisconnectConnector = async (id: string) => {
        const updated = await disconnectConnector(id);
        if (updated) {
            setConnectors(prev => prev.map(c => c.id === id ? updated : c));
        } else {
            setConnectors(prev => prev.filter(c => c.id !== id));
        }
    };

    const MENU_ITEMS: { id: UserCenterTab; label: string; icon: any }[] = [
        { id: 'account', label: t.nav?.users || 'Account', icon: User },
        { id: 'settings', label: t.nav?.settings || 'Settings', icon: Settings },
        { id: 'usage', label: t.nav?.usage || 'Usage', icon: Zap },
        { id: 'connectors', label: t.connectors.title, icon: Plug },
    ];

    const filteredConnectors = useMemo(() => {
        return connectors.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(connectorSearch.toLowerCase()) || c.description.toLowerCase().includes(connectorSearch.toLowerCase());
            
            // Tab Filtering
            let matchesTab = false;
            if (connectorTab === 'connected') matchesTab = c.status === 'connected';
            if (connectorTab === 'apps') matchesTab = c.type === 'app';
            if (connectorTab === 'custom_api') matchesTab = c.type === 'system_api' || c.type === 'custom_api' || c.type === 'custom';
            if (connectorTab === 'mcp') matchesTab = c.type === 'mcp';

            return matchesSearch && matchesTab;
        });
    }, [connectors, connectorSearch, connectorTab]);

    if (!isProfileOpen) return null;
    
    // --- Views ---

    const handleSaveProfile = () => {
        if (editName.trim()) {
            updateUser({ name: editName.trim() });
            setIsEditingProfile(false);
        }
    };

    const renderAccountView = () => (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
            {/* 1. Header Section */}
            <div className="flex flex-col md:flex-row items-start justify-between gap-6 px-2">
                <div className="flex items-start gap-6">
                    {/* Avatar */}
                    <div className="relative group/avatar">
                        <div className="w-28 h-28 rounded-full p-1 bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700">
                            <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 flex items-center justify-center text-4xl font-bold overflow-hidden">
                                {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover"/> : user?.name.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <button className="absolute bottom-1 right-1 w-8 h-8 bg-white dark:bg-gray-700 rounded-full shadow-md border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:scale-105 transition-transform text-gray-600 dark:text-gray-200">
                            <Camera size={14} />
                        </button>
                    </div>

                    {/* Info */}
                    <div className="pt-2">
                        {isEditingProfile ? (
                            <div className="flex items-center gap-2 mb-2">
                                <input 
                                    type="text" 
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="text-3xl font-bold bg-gray-50 dark:bg-gray-800 border-none rounded-lg px-2 py-1 focus:ring-2 focus:ring-black outline-none w-full max-w-xs text-gray-900 dark:text-white"
                                    autoFocus
                                />
                                <button onClick={handleSaveProfile} className="p-2 bg-black text-white rounded-lg hover:opacity-80 transition-opacity"><Check size={18}/></button>
                                <button onClick={() => setIsEditingProfile(false)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"><X size={18}/></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">{user?.name || t.account?.guest || 'Guest User'}</h2>
                            </div>
                        )}
                        
                        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 text-sm mb-3">
                            <div className="flex items-center gap-1.5">
                                <Mail size={14} />
                                {user?.email || 'guest@example.com'}
                            </div>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center gap-1.5">
                                <Calendar size={14} />
                                {t.account?.joined || 'Joined'} {new Date(user?.joinDate || Date.now()).toLocaleDateString()}
                            </div>
                        </div>

                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                             {user?.plan === 'team' ? (t.usage?.plan_team || 'Team Plan') : 
                              user?.plan === 'pro' ? (t.usage?.plan_pro || 'Pro Plan') : 
                              (t.usage?.plan_free || 'Free Plan')}
                        </span>
                    </div>
                </div>

                {/* Logout */}
                <button 
                    onClick={logout} 
                    className="flex items-center gap-2 text-gray-400 hover:text-black dark:hover:text-white px-2 py-2 text-sm font-bold transition-colors mt-2"
                >
                    <LogOut size={16}/> {t.logout || "Sign Out"}
                </button>
            </div>

            {/* 2. Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Projects Card */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-7 border border-gray-200 dark:border-gray-700 flex flex-col justify-between h-48 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.usage?.projects || 'Projects'}</span>
                        <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-900 dark:text-white">
                            <Folder size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="text-5xl font-bold text-gray-900 dark:text-white tracking-tighter mb-1">12</div>
                        <div className="text-sm text-gray-400 font-medium">Active Projects</div>
                    </div>
                </div>

                {/* Storage Card */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-7 border border-gray-200 dark:border-gray-700 flex flex-col justify-between h-48 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.usage?.storage || 'Storage'}</span>
                        <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-900 dark:text-white">
                            <UploadCloud size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="text-5xl font-bold text-gray-900 dark:text-white tracking-tighter mb-1">1.2<span className="text-xl text-gray-400 ml-1">GB</span></div>
                        <div className="text-sm text-gray-400 font-medium">Cloud Storage</div>
                    </div>
                </div>

                {/* Credits Card */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-7 border border-gray-200 dark:border-gray-700 flex flex-col justify-between h-48 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.usage?.credits_left || 'Credits'}</span>
                        <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-900 dark:text-white">
                            <Zap size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="text-5xl font-bold text-gray-900 dark:text-white tracking-tighter mb-1">{user?.credits || 0}</div>
                        <div className="text-sm text-gray-400 font-medium">Available Credits</div>
                    </div>
                </div>
            </div>

            {/* 3. Subscription Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-black dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-black shrink-0 shadow-lg">
                            <CreditCard size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t.subscription?.title || 'Subscription'}</h3>
                            <p className="text-sm text-gray-500 font-medium mt-1">{t.subscription?.manage || 'Manage billing & plan'}</p>
                        </div>
                    </div>
                    <button onClick={openSubscription} className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full text-sm font-bold hover:opacity-80 transition-opacity shadow-md">
                        {t.subscription?.upgrade_btn || 'Upgrade'} <ChevronRight size={16}/>
                    </button>
                </div>

                <div className="space-y-3 mb-8">
                    <div className="flex justify-between items-end">
                        <span className="text-sm font-bold text-gray-400">{t.subscription?.monthly_usage || 'Usage'}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{Math.round(((5000 - (user?.credits || 0)) / 5000) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-black dark:bg-white rounded-full transition-all duration-1000" 
                            style={{ width: `${((5000 - (user?.credits || 0)) / 5000) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2">
                    <div>
                        <div className="text-xs font-bold text-gray-300 dark:text-gray-600 uppercase mb-2 tracking-wider">{t.subscription?.status || 'Status'}</div>
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-base">
                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                            {t.subscription?.status_active || 'Active'}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-gray-300 dark:text-gray-600 uppercase mb-2 tracking-wider">{t.subscription?.next_billing || 'Next Billing'}</div>
                        <div className="font-bold text-base text-gray-900 dark:text-white">
                            {new Date(Date.now() + 86400000 * 30).toLocaleDateString()}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-gray-300 dark:text-gray-600 uppercase mb-2 tracking-wider">{t.usage?.refill_date || 'Reset Date'}</div>
                        <div className="font-bold text-base text-gray-900 dark:text-white">
                            {new Date(Date.now() + 86400000 * 15).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSettingsView = () => (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">{t.settings.appearance}</h3>
                <div className="grid grid-cols-3 gap-4">
                    {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setThemeMode(mode)}
                            className={`flex flex-col items-center justify-center gap-3 py-6 rounded-2xl border transition-all duration-300 group ${
                                themeMode === mode 
                                ? 'border-blue-500 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/10 shadow-lg shadow-blue-500/10' 
                                : 'border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-white dark:hover:bg-gray-800'
                            }`}
                        >
                            {mode === 'light' && <Sun size={28} className={themeMode === mode ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-gray-600"}/>}
                            {mode === 'dark' && <Moon size={28} className={themeMode === mode ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-gray-600"}/>}
                            {mode === 'system' && <Monitor size={28} className={themeMode === mode ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-gray-600"}/>}
                            <span className={`text-xs font-bold uppercase tracking-wider ${themeMode === mode ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500'}`}>
                                {mode === 'light' ? t.settings.light_mode : mode === 'dark' ? t.settings.dark_mode : 'System'}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {settings && onUpdateSettings && (
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">{t.settings.interaction}</h3>
                    <div className="space-y-4">
                        <button 
                            onClick={() => onUpdateSettings({...settings, autoHideHandles: !settings.autoHideHandles})}
                            className="w-full flex items-center justify-between p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-all hover:shadow-md gap-4"
                        >
                            <div className="flex items-center gap-4 text-left">
                                <div className="p-3 bg-white dark:bg-gray-900 rounded-xl text-gray-600 dark:text-gray-300 shrink-0 shadow-sm"><MousePointerClick size={20}/></div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">{t.settings.auto_hide_handles}</div>
                                    <div className="text-xs text-gray-500 line-clamp-2 mt-0.5">{t.settings.auto_hide_desc}</div>
                                </div>
                            </div>
                            <div className={`w-11 h-6 rounded-full p-1 transition-colors shrink-0 ${settings.autoHideHandles ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                <div className={`w-4 h-4 bg-white dark:bg-black rounded-full shadow-sm transition-transform ${settings.autoHideHandles ? 'translate-x-5' : ''}`}></div>
                            </div>
                        </button>

                        <button 
                            onClick={() => onUpdateSettings({...settings, showGrid: !settings.showGrid})}
                            className="w-full flex items-center justify-between p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-all hover:shadow-md gap-4"
                        >
                            <div className="flex items-center gap-4 text-left">
                                <div className="p-3 bg-white dark:bg-gray-900 rounded-xl text-gray-600 dark:text-gray-300 shrink-0 shadow-sm"><Grid size={20}/></div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">{t.settings.show_grid}</div>
                                    <div className="text-xs text-gray-500 line-clamp-2 mt-0.5">{t.settings.canvas_bg_desc}</div>
                                </div>
                            </div>
                            <div className={`w-11 h-6 rounded-full p-1 transition-colors shrink-0 ${settings.showGrid ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                <div className={`w-4 h-4 bg-white dark:bg-black rounded-full shadow-sm transition-transform ${settings.showGrid ? 'translate-x-5' : ''}`}></div>
                            </div>
                        </button>

                        {/* Zoom Sensitivity */}
                        <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 space-y-4">
                             <div className="flex items-center gap-4">
                                <div className="p-3 bg-white dark:bg-gray-900 rounded-xl text-gray-600 dark:text-gray-300 shrink-0 shadow-sm"><Zap size={20}/></div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">{t.settings.zoom_sensitivity}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{t.settings.zoom_sensitivity_desc}</div>
                                </div>
                             </div>
                             <div className="flex items-center gap-4 pl-14 pr-2">
                                <span className="text-xs text-gray-400 font-bold">0.5x</span>
                                <input 
                                    type="range" 
                                    min="0.5" 
                                    max="3.0" 
                                    step="0.1"
                                    value={settings.zoomSensitivity || 1.0}
                                    onChange={(e) => onUpdateSettings({...settings, zoomSensitivity: parseFloat(e.target.value)})}
                                    className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                                />
                                <span className="text-xs font-mono w-10 text-right text-gray-600 dark:text-gray-300 font-bold bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded">
                                    {(settings.zoomSensitivity || 1.0).toFixed(1)}x
                                </span>
                            </div>
                        </div>

                        {/* Adaptive Zoom Range - Visual & User Friendly */}
                        <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 shadow-sm">
                             <div className="flex items-center justify-between mb-5">
                                 <div className="flex items-center gap-4">
                                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300 shrink-0"><Monitor size={20}/></div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-white">{t.settings.adaptive_zoom}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{t.settings.adaptive_zoom_desc}</div>
                                    </div>
                                 </div>
                                 
                                 <button
                                    onClick={() => onUpdateSettings({...settings, adaptiveZoomMin: 0.4, adaptiveZoomMax: 1.2})}
                                    className="text-xs font-bold text-gray-400 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                    title={t.settings.restore_defaults}
                                >
                                    <RotateCcw size={12}/> {t.settings.reset}
                                </button>
                             </div>
                             
                             {/* Visual Guide */}
                             <div className="flex justify-between items-center px-2 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                 <span>{t.settings.zoom_min_label}</span>
                                 <span>{t.settings.zoom_max_label}</span>
                             </div>

                             <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 space-y-8">
                                {/* Min Scale */}
                                <div>
                                    <div className="flex justify-between mb-3">
                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500 font-bold">MIN</span>
                                            {t.settings.keep_readable}
                                        </span>
                                        <span className="text-xs font-mono font-bold text-black dark:text-white bg-white dark:bg-gray-700 px-2 py-0.5 rounded shadow-sm border border-gray-100 dark:border-gray-600">
                                            {(settings.adaptiveZoomMin || 0.4).toFixed(1)}
                                        </span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0.1" 
                                        max="1.0" 
                                        step="0.1"
                                        value={settings.adaptiveZoomMin || 0.4}
                                        onChange={(e) => onUpdateSettings({...settings, adaptiveZoomMin: parseFloat(e.target.value)})}
                                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                                    />
                                    <div className="flex justify-between mt-2 text-[9px] text-gray-400 font-medium">
                                        <span>0.1 (Tiny)</span>
                                        <span>1.0 (Fixed)</span>
                                    </div>
                                </div>

                                {/* Max Scale */}
                                <div>
                                    <div className="flex justify-between mb-3">
                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500 font-bold">MAX</span>
                                            {t.settings.prevent_overlay}
                                        </span>
                                        <span className="text-xs font-mono font-bold text-black dark:text-white bg-white dark:bg-gray-700 px-2 py-0.5 rounded shadow-sm border border-gray-100 dark:border-gray-600">
                                            {(settings.adaptiveZoomMax || 1.2).toFixed(1)}
                                        </span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1.0" 
                                        max="5.0" 
                                        step="0.1"
                                        value={settings.adaptiveZoomMax || 1.2}
                                        onChange={(e) => onUpdateSettings({...settings, adaptiveZoomMax: parseFloat(e.target.value)})}
                                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                                    />
                                    <div className="flex justify-between mt-2 text-[9px] text-gray-400 font-medium">
                                        <span>1.0 (Fixed)</span>
                                        <span>5.0 (Huge)</span>
                                    </div>
                                </div>
                             </div>
                        </div>

                        {/* Performance Optimization - Visual Revamp */}
                        <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                             <div className="flex items-center justify-between mb-5">
                                 <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-blue-600 dark:text-blue-400 shrink-0"><Zap size={20}/></div>
                                    <div>
                                        <div className="text-base font-bold text-gray-900 dark:text-white">{t.settings.performance_mode}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{t.settings.performance_desc}</div>
                                    </div>
                                 </div>
                                 
                                 <button
                                    onClick={() => {
                                        const recommended = detectPerformanceTier();
                                        onUpdateSettings({...settings, performanceModeThreshold: recommended.threshold});
                                    }}
                                    className="text-xs font-bold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center gap-1.5 shadow-sm"
                                 >
                                    <RefreshCw size={12}/> {t.settings.auto_detect}
                                </button>
                             </div>

                             {/* Visual Cards */}
                             <div className="grid grid-cols-3 gap-3 mb-6">
                                {(Object.entries(PERFORMANCE_PRESETS) as [PerformanceTier, typeof PERFORMANCE_PRESETS['low']][]).map(([key, config]) => {
                                    const isActive = Math.abs((settings.performanceModeThreshold || 3.0) - config.threshold) < 0.3;
                                    let Icon = Gauge;
                                    if (key === 'low') Icon = Battery;
                                    if (key === 'high') Icon = Eye;

                                    return (
                                        <button
                                            key={key}
                                            onClick={() => onUpdateSettings({...settings, performanceModeThreshold: config.threshold})}
                                            className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 ${
                                                isActive
                                                ? 'bg-white dark:bg-gray-800 border-blue-500 shadow-lg transform scale-[1.02] z-10'
                                                : 'bg-white dark:bg-gray-900 border-transparent hover:border-gray-200 dark:hover:border-gray-700 shadow-sm opacity-70 hover:opacity-100 hover:scale-[1.01]'
                                            }`}
                                        >
                                            <div className={`p-2 rounded-full mb-2 ${isActive ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                <Icon size={20} />
                                            </div>
                                            <div className={`text-xs font-bold mb-0.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {key === 'low' ? t.settings.perf_power_saver : 
                                                 key === 'balanced' ? t.settings.perf_balanced : 
                                                 t.settings.perf_high_quality}
                                            </div>
                                            <div className="text-[9px] text-gray-400 text-center leading-tight">
                                                {key === 'low' ? t.settings.perf_laptop : 
                                                 key === 'balanced' ? t.settings.perf_standard : 
                                                 t.settings.perf_desktop}
                                            </div>
                                            
                                            {isActive && (
                                                <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                            )}
                                        </button>
                                    );
                                })}
                             </div>
                             
                             {/* Visual Slider Bar */}
                             <div className="px-2">
                                 <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                     <span>{t.settings.smoother}</span>
                                     <span>{t.settings.sharper}</span>
                                 </div>
                                 <div className="relative h-8 flex items-center">
                                     {/* Track */}
                                     <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                         <div className="w-full h-full bg-gradient-to-r from-green-400 via-yellow-400 to-blue-500 opacity-20 dark:opacity-30" />
                                     </div>
                                     
                                     {/* Input overlay */}
                                     <input 
                                        type="range" 
                                        min="0.5" 
                                        max="5.0" 
                                        step="0.1"
                                        value={settings.performanceModeThreshold || 3.0}
                                        onChange={(e) => onUpdateSettings({...settings, performanceModeThreshold: parseFloat(e.target.value)})}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    />

                                     {/* Custom Thumb */}
                                     <div 
                                        className="absolute h-6 w-1.5 bg-black dark:bg-white rounded-full shadow-lg pointer-events-none transition-all duration-100 z-10"
                                        style={{ 
                                            left: `${(( (settings.performanceModeThreshold || 3.0) - 0.5) / 4.5) * 100}%`,
                                            transform: 'translateX(-50%)'
                                        }}
                                     />
                                     
                                     {/* Markers */}
                                     {[1.0, 1.5, 2.5].map(val => (
                                         <div 
                                            key={val}
                                            className="absolute h-2 w-0.5 bg-gray-400/50 dark:bg-gray-500/50 z-0 pointer-events-none"
                                            style={{ 
                                                left: `${((val - 0.5) / 4.5) * 100}%`,
                                                top: '50%',
                                                transform: 'translate(-50%, -50%)'
                                            }}
                                         />
                                     ))}
                                 </div>
                                 <div className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 py-3 px-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                     <span className="font-bold text-gray-900 dark:text-white mr-1.5">
                                         {t.settings.current_policy} 
                                     </span>
                                     {t.settings.simplify_rendering} {(settings.performanceModeThreshold || 3.0).toFixed(1)}x
                                 </div>
                             </div>
                        </div>

                        {/* Canvas Background (Unified) */}
                        <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 space-y-6">
                             <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-4">
                                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300 shrink-0"><Grid size={20}/></div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-white">{t.settings.canvas_bg}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{t.settings.canvas_bg_desc}</div>
                                    </div>
                                 </div>
                                 
                                 {/* Toggle Switch */}
                                 <button 
                                    onClick={() => onUpdateSettings({...settings, showGrid: !settings.showGrid})}
                                    className={`w-11 h-6 rounded-full p-1 transition-colors shrink-0 ${settings.showGrid ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                                 >
                                    <div className={`w-4 h-4 bg-white dark:bg-black rounded-full shadow-sm transition-transform ${settings.showGrid ? 'translate-x-5' : ''}`}></div>
                                 </button>
                             </div>
                             
                             {/* Expanded Options */}
                             {settings.showGrid && (
                                <div className="pl-14 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                     {/* Grid Type Selector */}
                                     <div className="flex gap-3">
                                        {(['dots', 'lines', 'cross', 'texture', 'blueprint'] as const).map(type => {
                                            const isGridActive = (settings.gridType || 'dots') === type;
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => onUpdateSettings({...settings, gridType: type})}
                                                    className={`flex-1 relative py-2 px-2 rounded-xl border-2 text-[10px] font-bold flex flex-col items-center gap-2 transition-all duration-300 ${
                                                        isGridActive 
                                                        ? 'bg-white dark:bg-gray-800 border-blue-500 shadow-md text-blue-600 dark:text-blue-400 scale-[1.05] z-10' 
                                                        : 'bg-white dark:bg-gray-900 border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-500 dark:text-gray-400 shadow-sm opacity-70 hover:opacity-100 hover:scale-[1.02]'
                                                    }`}
                                                >
                                                    <div 
                                                         className="w-full h-10 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 relative overflow-hidden transition-all"
                                                     >
                                                         <div className="absolute inset-0 transition-opacity" style={{ opacity: Math.max(settings.gridOpacity || 0.05, 0.05) * 4 }}>
                                                            {type === 'dots' && <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '6px 6px' }}></div>}
                                                            {type === 'lines' && <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '6px 6px' }}></div>}
                                                            {type === 'cross' && <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '8px 8px' }}></div>}
                                                            {type === 'texture' && <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }}></div>}
                                                            {type === 'blueprint' && <div className="absolute inset-0 bg-blue-500/10" style={{ backgroundImage: 'linear-gradient(currentColor 0.5px, transparent 0.5px), linear-gradient(90deg, currentColor 0.5px, transparent 0.5px)', backgroundSize: '4px 4px' }}></div>}
                                                         </div>
                                                     </div>
                                                    
                                                    {type === 'dots' ? t.settings.grid_dots : 
                                                     type === 'lines' ? t.settings.grid_lines : 
                                                     type === 'cross' ? t.settings.grid_cross :
                                                     type === 'texture' ? t.settings.grid_texture :
                                                     t.settings.grid_blueprint}

                                                    {isGridActive && (
                                                        <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full ring-2 ring-white dark:ring-gray-800 shadow-sm z-10" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                     </div>

                                     {/* Opacity */}
                                     <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                        <span className="text-xs font-bold text-gray-500 w-20">
                                            {t.settings.opacity}
                                        </span>
                                        <input 
                                            type="range" 
                                            min="0.01" 
                                            max="0.2" 
                                            step="0.01"
                                            value={settings.gridOpacity || 0.05}
                                            onChange={(e) => onUpdateSettings({...settings, gridOpacity: parseFloat(e.target.value)})}
                                            className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                                        />
                                        <span className="text-xs font-mono w-10 text-right text-gray-500 font-bold">
                                            {Math.round((settings.gridOpacity || 0.05) * 100)}%
                                        </span>
                                     </div>
                                </div>
                             )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderUsageView = () => (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
            {/* Credit Balance - Clean & Compact */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="text-yellow-500 fill-current" size={18}/>
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t.usage.title}</h3>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-bold tracking-tighter text-gray-900 dark:text-white">{user?.credits || 0}</span>
                            <span className="text-xl font-medium text-gray-400">/ {user?.plan === 'pro' ? '1,000' : (user?.plan === 'team' ? '5,000' : '50')}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-8 bg-gray-50 dark:bg-gray-800/50 px-6 py-3 rounded-xl border border-gray-100 dark:border-gray-700/50">
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t.usage.refill_date}</div>
                            <div className="text-base font-bold text-gray-900 dark:text-white">{new Date(Date.now() + 86400000 * 15).toLocaleDateString()}</div>
                        </div>
                        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t.subscription?.status || 'Status'}</div>
                            <div className="text-base font-bold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                Active
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-black dark:bg-white rounded-full transition-all duration-1000" 
                        style={{ width: `${((user?.credits || 0) / (user?.plan === 'pro' ? 1000 : (user?.plan === 'team' ? 5000 : 50))) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Recent Activity - Compressed */}
            <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 pl-1">{t.usage.recent_activity}</h3>
                <div className="space-y-3">
                    {[
                        { type: 'video', cost: 15, time: 2 },
                        { type: 'image', cost: 15, time: 5 },
                        { type: 'image', cost: 15, time: 12 },
                        { type: 'video', cost: 30, time: 45 },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors gap-4 group shadow-sm">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0 border border-gray-200 dark:border-gray-700 group-hover:bg-white dark:group-hover:bg-gray-700 transition-colors">
                                    {item.type === 'video' ? <Video size={18}/> : <ImageIcon size={18}/>}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                        {item.type === 'video' ? t.usage.activity_video : t.usage.activity_image}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-medium truncate">
                                        {item.time} {t.usage.ago_minutes}
                                    </div>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg whitespace-nowrap shrink-0 border border-gray-200 dark:border-gray-700">
                                -{item.cost}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderConnectorsView = () => (
        <div className="h-full flex flex-col max-w-5xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
            
            {/* Header Area: Tabs + Search + Action Button */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-200 dark:border-gray-800 mb-6 gap-4 pr-0 md:pr-10">
                {/* Navigation Tabs */}
                <div className="flex items-center gap-6 md:gap-8 overflow-x-auto no-scrollbar flex-1">
                    <button 
                        onClick={() => setConnectorTab('connected')}
                        className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap shrink-0 ${connectorTab === 'connected' ? 'text-black dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        {t.connectors.tab_connected}
                        {connectorTab === 'connected' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black dark:bg-white rounded-t-full"></div>}
                    </button>
                    <button 
                        onClick={() => setConnectorTab('apps')}
                        className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap shrink-0 ${connectorTab === 'apps' ? 'text-black dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        {t.connectors.tab_apps}
                        {connectorTab === 'apps' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black dark:bg-white rounded-t-full"></div>}
                    </button>
                    <button 
                        onClick={() => setConnectorTab('custom_api')}
                        className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap shrink-0 ${connectorTab === 'custom_api' ? 'text-black dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        {t.connectors.tab_custom_api}
                        {connectorTab === 'custom_api' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black dark:bg-white rounded-t-full"></div>}
                    </button>
                    <button 
                        onClick={() => setConnectorTab('mcp')}
                        className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap shrink-0 ${connectorTab === 'mcp' ? 'text-black dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        {t.connectors.tab_mcp}
                        {connectorTab === 'mcp' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black dark:bg-white rounded-t-full"></div>}
                    </button>
                </div>

                {/* Right Actions: Search Only */}
                <div className="flex items-center gap-3 w-full md:w-auto mb-2 md:mb-1 ml-auto">
                    {/* Search - Compact */}
                    <div className="relative flex-1 md:w-64 group">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors"/>
                        <input 
                            type="text" 
                            placeholder={t.connectors.search_placeholder} 
                            value={connectorSearch}
                            onChange={(e) => setConnectorSearch(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar -mr-4 pr-4">
                {isLoadingConnectors ? (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 size={40} className="animate-spin text-blue-500"/>
                            <span className="text-sm font-medium animate-pulse">Loading...</span>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-12">
                        {/* Add Custom Card (First Item) */}
                        {(connectorTab === 'custom_api' || connectorTab === 'mcp') && (
                            <button
                                onClick={() => { 
                                    setIsAddCustomOpen(true); 
                                    setCustomFormData({ name: '', endpoint: '', apiKey: '', modelId: '', command: '', args: '', category: 'llm' }); 
                                    setEditingConnectorId(null); 
                                }}
                                className="bg-gray-50/50 dark:bg-gray-800/30 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 flex flex-col items-center justify-center gap-4 group h-full min-h-[180px]"
                            >
                                <div className="w-14 h-14 bg-white dark:bg-gray-900 rounded-full border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-400 group-hover:text-black dark:group-hover:text-white shadow-sm transition-all group-hover:scale-110">
                                    <Plus size={24} />
                                </div>
                                <span className="font-bold text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors">
                                    {connectorTab === 'mcp' ? 'Add MCP Server' : t.connectors.add_custom}
                                </span>
                            </button>
                        )}

                        {filteredConnectors.map((connector) => (
                            <ConnectorItem 
                                key={connector.id} 
                                connector={connector} 
                                onToggle={handleConnectorAction}
                                onDelete={handleDeleteCustom}
                                loadingId={processingConnectorId}
                                t={t}
                            />
                        ))}
                        
                        {filteredConnectors.length === 0 && (
                            <div className="col-span-full text-center py-20 text-gray-400">
                                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Cloud size={40} className="opacity-20"/>
                                </div>
                                <p className="text-lg font-medium">{t.connectors.no_connectors}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    // --- Add Custom Model Modal ---
    const renderAddCustomModal = () => {
        const isMcp = connectorTab === 'mcp' || (editingConnectorId && connectors.find(c => c.id === editingConnectorId)?.type === 'mcp');

        return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setIsAddCustomOpen(false)}></div>
            <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-300 border border-white/20">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {editingConnectorId ? '编辑私有模型' : (isMcp ? '添加 MCP 服务器' : '添加私有模型')}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            {isMcp ? '连接本地或远程 MCP 协议服务器' : '连接本地运行的模型 (Ollama/LM Studio) 或其他兼容 OpenAI 接口的服务'}
                        </p>
                    </div>
                    <button onClick={() => setIsAddCustomOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                        <X size={20}/>
                    </button>
                </div>
                
                <form onSubmit={handleSaveCustomModel} className="space-y-5">
                    {!isMcp && (
                        <>
                            {/* Provider Presets */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">快速预设</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCustomFormData({
                                            ...customFormData, 
                                            name: 'Ollama', 
                                            endpoint: 'http://localhost:11434/v1',
                                            apiKey: 'ollama',
                                            modelId: 'llama3'
                                        })}
                                        className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        🦙 Ollama
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCustomFormData({
                                            ...customFormData, 
                                            name: 'LM Studio', 
                                            endpoint: 'http://localhost:1234/v1',
                                            apiKey: 'lm-studio',
                                            modelId: 'local-model'
                                        })}
                                        className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        🤖 LM Studio
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">功能类型</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCustomFormData({...customFormData, category: 'llm'})}
                                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all ${
                                            customFormData.category === 'llm'
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        对话 / 文本 (LLM)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCustomFormData({...customFormData, category: 'image'})}
                                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all ${
                                            customFormData.category === 'image'
                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                                            : 'border-transparent bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        图像生成
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">{t.connectors.form_name}</label>
                        <input 
                            required
                            type="text" 
                            placeholder={isMcp ? "例如: Filesystem MCP" : "例如: My Llama 3"}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                            value={customFormData.name}
                            onChange={e => setCustomFormData({...customFormData, name: e.target.value})}
                        />
                    </div>

                    {isMcp ? (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1 tracking-wider">
                                    {t.connectors.form_command} <Server size={12}/>
                                </label>
                                <input 
                                    required
                                    type="text" 
                                    placeholder="例如: npx 或 python" 
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
                                    value={customFormData.command}
                                    onChange={e => setCustomFormData({...customFormData, command: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">{t.connectors.form_args}</label>
                                <input 
                                    type="text" 
                                    placeholder={t.connectors.form_args_placeholder}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
                                    value={customFormData.args}
                                    onChange={e => setCustomFormData({...customFormData, args: e.target.value})}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1 tracking-wider">
                                    {t.connectors.form_endpoint} <Server size={12}/>
                                </label>
                                <input 
                                    required
                                    type="url" 
                                    placeholder="例如: http://localhost:11434/v1" 
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
                                    value={customFormData.endpoint}
                                    onChange={e => setCustomFormData({...customFormData, endpoint: e.target.value})}
                                />
                                <p className="text-[10px] text-gray-400 mt-1.5 ml-1">支持任何兼容 OpenAI 接口协议的服务 (Ollama, vLLM, DeepSeek 等)</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">{t.connectors.form_key}</label>
                                <input 
                                    type="password" 
                                    placeholder="sk-... (本地模型可随便填)" 
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
                                    value={customFormData.apiKey}
                                    onChange={e => setCustomFormData({...customFormData, apiKey: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">{t.connectors.form_model_id}</label>
                                <input 
                                    type="text" 
                                    placeholder="例如: llama3, gpt-4o" 
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
                                    value={customFormData.modelId}
                                    onChange={e => setCustomFormData({...customFormData, modelId: e.target.value})}
                                />
                            </div>
                        </>
                    )}
                    
                    <button type="submit" className="w-full bg-black dark:bg-white text-white dark:text-black py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg mt-2 hover:-translate-y-0.5">
                        {editingConnectorId ? '更新连接' : t.connectors.form_save}
                    </button>
                </form>
            </div>
        </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-6">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={closeProfile}></div>
            
            <div className="relative bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl w-full md:w-full md:max-w-6xl h-full md:h-[85vh] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-300 border border-white/20 dark:border-white/5 ring-1 ring-black/5">
                {/* Sidebar / Top Navbar on Mobile */}
                <div className="w-full md:w-72 bg-gray-50/50 dark:bg-black/20 border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/5 flex flex-row md:flex-col p-3 md:p-6 shrink-0 overflow-x-auto no-scrollbar items-center md:items-stretch gap-2 md:gap-0 backdrop-blur-xl">
                    <div className="hidden md:flex items-center gap-3 px-3 mb-10 mt-4">
                        <Logo size={36} />
                        <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">Desora.Art</span>
                    </div>

                    <nav className="flex flex-row md:flex-col gap-1.5 md:gap-2 flex-1 md:flex-none w-full md:w-auto">
                        {MENU_ITEMS.map(item => (
                            <button
                                key={item.id}
                                onClick={() => openProfile(item.id)}
                                className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 md:gap-3 px-4 md:px-5 py-2.5 md:py-3.5 rounded-2xl text-xs md:text-sm font-bold transition-all whitespace-nowrap group ${
                                    activeProfileTab === item.id 
                                    ? 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-md shadow-black/5' 
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            >
                                <item.icon size={18} className={`transition-colors ${activeProfileTab === item.id ? 'text-black dark:text-white' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}/>
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    <div className="hidden md:flex mt-auto px-4 pb-2">
                         <div className="text-[10px] text-gray-300 dark:text-gray-700 font-mono text-center w-full">v2.4.0-beta</div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white/40 dark:bg-transparent overflow-hidden flex flex-col relative">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-blue-100/20 to-transparent dark:from-blue-900/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

                    <button onClick={closeProfile} className="absolute top-4 right-4 md:top-5 md:right-5 p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors z-20 group">
                        <X size={20} className="text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors"/>
                    </button>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10 pt-16 md:pt-10 relative z-10">
                        {activeProfileTab === 'account' && renderAccountView()}
                        {activeProfileTab === 'settings' && renderSettingsView()}
                        {activeProfileTab === 'usage' && renderUsageView()}
                        {activeProfileTab === 'connectors' && renderConnectorsView()}
                    </div>
                </div>
            </div>

            {/* Nested Modals */}
            <ConnectorConfigModal 
                isOpen={!!configModalConnector}
                connector={configModalConnector}
                onClose={() => setConfigModalConnector(null)}
                onSave={handleSaveConnectorConfig}
                onDisconnect={handleDisconnectConnector}
                lang={lang}
            />
            {isAddCustomOpen && renderAddCustomModal()}
        </div>
    );
};
