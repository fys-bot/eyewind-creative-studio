
import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, Users, MessageSquare, Shield, Settings, 
    LogOut, Bell, Building2,
    Activity, Lock, ArrowRight, Globe, Check
} from 'lucide-react';
import { useAuth } from '../../modules/auth/AuthContext';
import { getTickets } from '../../services/adminService';
import { Language, adminTranslations } from '../../utils/translations';

// Import Modular Views
import { DashboardView } from './views/DashboardView';
import { UserListView } from './views/UserListView';
import { TicketSystemView } from './views/TicketSystemView';
import { AuditView } from './views/AuditView';

interface AdminConsoleProps {
    onClose: () => void;
    initialLang?: Language;
    onSetGlobalLang?: (lang: Language) => void;
}

const NavItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
            active 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
        }`}
    >
        <div className="flex items-center gap-3">
            <Icon size={18} />
            <span>{label}</span>
        </div>
        {badge && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                {badge}
            </span>
        )}
    </button>
);

export const AdminConsole: React.FC<AdminConsoleProps> = ({ onClose, initialLang = 'en', onSetGlobalLang }) => {
    const { user } = useAuth();
    
    // Independent Language State using Admin Translation set
    const [adminLang, setAdminLang] = useState<Language>(initialLang);
    const t = adminTranslations[adminLang];
    
    // Login State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loginId, setLoginId] = useState('admin@enexus.ai');
    const [loginPass, setLoginPass] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    
    const [showLangMenu, setShowLangMenu] = useState(false);

    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'tickets' | 'team' | 'audit'>('dashboard');
    const [roleView, setRoleView] = useState<'operator' | 'enterprise'>('operator'); 
    
    const [openTicketCount, setOpenTicketCount] = useState(0);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setTimeout(() => {
            setIsAuthenticated(true);
            setIsLoggingIn(false);
        }, 1200);
    };

    // Core Logic: Sync Language only if Enterprise Admin
    const handleSetLang = (l: Language) => {
        setAdminLang(l);
        if (roleView === 'enterprise' && onSetGlobalLang) {
            onSetGlobalLang(l);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            getTickets().then(tickets => {
                setOpenTicketCount(tickets.filter(tk => tk.status === 'open').length);
            });
        }
    }, [isAuthenticated]);

    // --- Atmospheric Login Screen ---
    if (!isAuthenticated) {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black overflow-hidden font-sans">
                {/* Atmospheric Background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/30 rounded-full blur-[120px] animate-pulse" style={{animationDuration: '8s'}}></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/30 rounded-full blur-[120px] animate-pulse" style={{animationDuration: '10s', animationDelay: '1s'}}></div>
                    <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-indigo-900/20 rounded-full blur-[100px] animate-pulse" style={{animationDuration: '12s', animationDelay: '2s'}}></div>
                </div>

                {/* Login Card */}
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
                    {/* Decorative Mesh */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-2xl rounded-full pointer-events-none"></div>

                    {/* Language Switcher */}
                    <div className="absolute top-4 right-4 relative z-20">
                        <button 
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        >
                            <Globe size={16}/>
                        </button>
                        {showLangMenu && (
                            <div className="absolute right-0 top-full mt-2 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl p-1 z-30 w-32 shadow-xl animate-in fade-in slide-in-from-top-2">
                                <button onClick={() => { handleSetLang('en'); setShowLangMenu(false); }} className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center justify-between hover:bg-white/10 text-white`}>
                                    English {adminLang === 'en' && <Check size={12}/>}
                                </button>
                                <button onClick={() => { handleSetLang('zh'); setShowLangMenu(false); }} className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center justify-between hover:bg-white/10 text-white`}>
                                    简体中文 {adminLang === 'zh' && <Check size={12}/>}
                                </button>
                                <button onClick={() => { handleSetLang('tw'); setShowLangMenu(false); }} className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center justify-between hover:bg-white/10 text-white`}>
                                    繁體中文 {adminLang === 'tw' && <Check size={12}/>}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-center mb-8 relative z-10">
                        <div className="w-16 h-16 bg-gradient-to-br from-white to-gray-400 rounded-2xl flex items-center justify-center text-3xl font-bold text-black shadow-lg mb-6">
                            E
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">{t?.login?.title || "Enterprise Portal"}</h1>
                        <p className="text-white/40 text-sm mt-1 font-medium">{t?.login?.subtitle || "Secure Gateway"}</p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="space-y-5 relative z-10">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">{t?.login?.id_label || "ID"}</label>
                            <input 
                                type="email" 
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-medium outline-none focus:border-blue-500/50 focus:bg-black/50 text-white transition-all placeholder:text-white/20"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">{t?.login?.key_label || "Key"}</label>
                            <div className="relative">
                                <input 
                                    type="password" 
                                    value={loginPass}
                                    onChange={(e) => setLoginPass(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-medium outline-none focus:border-blue-500/50 focus:bg-black/50 text-white transition-all placeholder:text-white/20"
                                />
                                <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30"/>
                            </div>
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={isLoggingIn}
                            className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 mt-4"
                        >
                            {isLoggingIn ? (t?.login?.btn_authenticating || "Auth...") : <><Shield size={18}/> {t?.login?.btn_login || "Login"}</>}
                        </button>
                    </form>
                    
                    <button onClick={onClose} className="w-full text-center text-xs text-white/30 hover:text-white/60 mt-8 font-medium transition-colors relative z-10 flex items-center justify-center gap-1 group">
                        <ArrowRight size={12} className="rotate-180 group-hover:-translate-x-1 transition-transform"/>
                        {t?.login?.return || "Return"}
                    </button>
                </div>
            </div>
        );
    }

    // --- Main Admin Dashboard ---
    return (
        <div className="fixed inset-0 z-[200] bg-gray-50 dark:bg-black text-gray-900 dark:text-white font-sans flex animate-in fade-in duration-300">
            {/* Sidebar */}
            <div className="w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-black font-bold">E</div>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight">{t?.title}</h1>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider block -mt-0.5">Center</span>
                    </div>
                </div>

                <div className="px-4 mb-6">
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                                {user?.name?.charAt(0) || 'A'}
                            </div>
                            <div className="overflow-hidden">
                                <div className="text-xs font-bold truncate">{user?.name}</div>
                                <div className="text-[10px] text-gray-500 truncate">{roleView === 'operator' ? 'Super Admin' : 'Enterprise Admin'}</div>
                            </div>
                        </div>
                        {/* Role Switcher for Demo */}
                        <div className="flex bg-white dark:bg-gray-950 rounded-lg p-0.5 border border-gray-200 dark:border-gray-800">
                            <button onClick={() => setRoleView('operator')} className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-colors ${roleView === 'operator' ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white' : 'text-gray-400'}`}>{t?.role_operator}</button>
                            <button onClick={() => setRoleView('enterprise')} className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-colors ${roleView === 'enterprise' ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white' : 'text-gray-400'}`}>{t?.role_enterprise}</button>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <NavItem icon={LayoutDashboard} label={t?.nav?.dashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                    <NavItem icon={Users} label={roleView === 'enterprise' ? t?.nav?.team : t?.nav?.users} active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
                    <NavItem icon={MessageSquare} label={t?.nav?.tickets} active={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')} badge={openTicketCount} />
                    {roleView === 'operator' && <NavItem icon={Building2} label={t?.nav?.orgs} active={activeTab === 'team'} onClick={() => setActiveTab('team')} />}
                    <NavItem icon={Shield} label={t?.nav?.audit} />
                    <NavItem icon={Settings} label={t?.nav?.settings} />
                </nav>

                <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                    <button onClick={onClose} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                        <LogOut size={18} />
                        {t?.login?.return}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-black/50 backdrop-blur-md flex items-center justify-between px-8 z-10">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                        {activeTab === 'users' ? (roleView === 'enterprise' ? t?.users?.title_team : t?.users?.title_all) : t?.nav?.[activeTab as keyof typeof t.nav]}
                    </h2>
                    <div className="flex items-center gap-4">
                        {/* Internal Language Switcher */}
                        <div className="relative">
                            <button onClick={() => setShowLangMenu(!showLangMenu)} className="p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                                <Globe size={20}/>
                            </button>
                            {showLangMenu && (
                                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 z-50 w-32 shadow-xl animate-in fade-in slide-in-from-top-2">
                                    <button onClick={() => { handleSetLang('en'); setShowLangMenu(false); }} className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 ${adminLang === 'en' ? 'text-black dark:text-white font-bold' : 'text-gray-500'}`}>
                                        English {adminLang === 'en' && <Check size={12}/>}
                                    </button>
                                    <button onClick={() => { handleSetLang('zh'); setShowLangMenu(false); }} className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 ${adminLang === 'zh' ? 'text-black dark:text-white font-bold' : 'text-gray-500'}`}>
                                        简体中文 {adminLang === 'zh' && <Check size={12}/>}
                                    </button>
                                    <button onClick={() => { handleSetLang('tw'); setShowLangMenu(false); }} className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 ${adminLang === 'tw' ? 'text-black dark:text-white font-bold' : 'text-gray-500'}`}>
                                        繁體中文 {adminLang === 'tw' && <Check size={12}/>}
                                    </button>
                                </div>
                            )}
                        </div>

                        <button className="p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-black"></span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-black/50">
                    {activeTab === 'dashboard' && <DashboardView t={t} roleView={roleView} setActiveTab={setActiveTab} />}
                    {activeTab === 'users' && <UserListView t={t} roleView={roleView} />}
                    {activeTab === 'tickets' && <TicketSystemView t={t} />}
                    {activeTab === 'audit' && <AuditView t={t} />}
                    {activeTab === 'team' && <div className="flex items-center justify-center h-full text-gray-400 font-bold">Organization Management Module</div>}
                </main>
            </div>
        </div>
    );
};
