
import React, { useState, useEffect } from 'react';
import { CreditCard, Users, MessageSquare, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getAdminStats, getTickets } from '../../../services/adminService';
import { AdminStats, SupportTicket } from '../../../types';

interface DashboardViewProps {
    t: any;
    roleView: 'operator' | 'enterprise';
    setActiveTab: (tab: any) => void;
}

const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Icon size={22} className="text-gray-900 dark:text-white" />
            </div>
            {trend && (
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-600 bg-red-50 dark:bg-red-900/20'}`}>
                    {trend === 'up' ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                    {change}
                </div>
            )}
        </div>
        <div>
            <h4 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h4>
            <span className="text-3xl font-bold text-gray-900 dark:text-white mt-1 block">{value}</span>
        </div>
    </div>
);

const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
        high: 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-800',
        medium: 'bg-yellow-50 text-yellow-600 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
        low: 'bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/20 dark:border-green-800',
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
            {status}
        </span>
    );
};

export const DashboardView: React.FC<DashboardViewProps> = ({ t, roleView, setActiveTab }) => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    
    useEffect(() => {
        getTickets().then(setTickets);
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title={roleView === 'operator' ? t?.dashboard?.revenue : t?.dashboard?.credits_used} 
                    value={roleView === 'operator' ? "$45,290" : "45,000"} 
                    change="12%" 
                    trend="up" 
                    icon={CreditCard} 
                />
                <StatCard 
                    title={roleView === 'operator' ? t?.dashboard?.active_users : t?.dashboard?.team_members} 
                    value={roleView === 'operator' ? "342" : "12"} 
                    change="5%" 
                    trend="up" 
                    icon={Users} 
                />
                <StatCard 
                    title={t?.dashboard?.pending_tickets} 
                    value="5" 
                    change="2" 
                    trend="down" 
                    icon={MessageSquare} 
                />
                <StatCard 
                    title={t?.dashboard?.system_health} 
                    value="98%" 
                    change="Stable" 
                    icon={Activity} 
                />
            </div>

            {/* Charts & Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t?.dashboard?.usage_trends}</h3>
                        <select className="bg-gray-50 dark:bg-gray-800 border-none text-xs font-bold rounded-lg px-3 py-1.5 outline-none text-gray-600 dark:text-gray-300">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    {/* Simulated Chart */}
                    <div className="h-64 flex items-end justify-between gap-2 px-2">
                        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((h, i) => (
                            <div key={i} className="w-full bg-blue-100 dark:bg-blue-900/20 rounded-t-lg relative group">
                                <div 
                                    className="absolute bottom-0 left-0 right-0 bg-blue-600 dark:bg-blue-500 rounded-t-lg transition-all duration-1000 group-hover:bg-blue-500 dark:group-hover:bg-blue-400"
                                    style={{ height: `${h}%` }}
                                ></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t?.dashboard?.action_needed}</h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                        {tickets.filter(tk => tk.status === 'open').map(tk => (
                            <div key={tk.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-700 transition-colors cursor-pointer group">
                                <div className="flex justify-between items-start mb-2">
                                    <StatusBadge status={tk.priority} />
                                    <span className="text-[10px] text-gray-400">{new Date(tk.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600">{tk.subject}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{tk.message}</p>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setActiveTab('tickets')} className="mt-4 w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        {t?.dashboard?.view_all_tickets}
                    </button>
                </div>
            </div>
        </div>
    );
};
