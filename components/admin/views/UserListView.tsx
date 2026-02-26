
import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, MoreHorizontal } from 'lucide-react';
import { getUsers } from '../../../services/adminService';
import { User } from '../../../types';

interface UserListViewProps {
    t: any;
    roleView: 'operator' | 'enterprise';
}

const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
        active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        banned: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
            {status}
        </span>
    );
};

export const UserListView: React.FC<UserListViewProps> = ({ t, roleView }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        getUsers(roleView === 'enterprise' ? 'enterprise' : 'all').then(setUsers);
    }, [roleView]);

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {roleView === 'enterprise' ? t?.users?.title_team : t?.users?.title_all}
                </h3>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input 
                            type="text" 
                            placeholder={t?.users?.search_placeholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <Filter size={16}/> {t?.users?.filter}
                    </button>
                    {roleView === 'enterprise' && (
                        <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-none">
                            <Plus size={16}/> {t?.users?.invite}
                        </button>
                    )}
                </div>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4">{t?.users?.col_user}</th>
                            <th className="px-6 py-4">{t?.users?.col_plan}</th>
                            <th className="px-6 py-4">{t?.users?.col_credits}</th>
                            <th className="px-6 py-4">{t?.users?.col_status}</th>
                            <th className="px-6 py-4">{t?.users?.col_joined}</th>
                            <th className="px-6 py-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.includes(searchQuery)).map(userItem => (
                            <tr key={userItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                            {userItem.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white text-sm">{userItem.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{userItem.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-md text-xs font-bold border ${userItem.plan === 'team' ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800' : (userItem.plan === 'pro' ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-800 dark:border-gray-700')}`}>
                                        {userItem.plan.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-300">
                                    {userItem.credits.toLocaleString()}
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={userItem.status || 'active'} />
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {new Date(userItem.joinDate).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                        <MoreHorizontal size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
