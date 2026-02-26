import React, { useState } from 'react';
import { Check, X, Eye, Clock, FileText, User, Filter, Search, AlertCircle, MessageSquare } from 'lucide-react';
import { useToast } from '../../ui/ToastContext';

interface AuditViewProps {
    t: any;
}

interface PendingItem {
    id: string;
    title: string;
    author: string;
    type: 'template' | 'post';
    category: string;
    submittedAt: string;
    thumbnail: string;
    description: string;
    status: 'pending' | 'approved' | 'rejected';
}

const MOCK_PENDING_ITEMS: PendingItem[] = [
    {
        id: 'sub_001',
        title: 'Cyberpunk Neon City Workflow',
        author: 'AlexChen_Art',
        type: 'template',
        category: 'Game & Anime',
        submittedAt: '2024-03-15 14:30',
        thumbnail: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/b9d23315-0af6-4df0-9886-224422204c3e/width=450/00004-3788780775.jpeg',
        description: 'A comprehensive workflow for generating high-contrast neon cityscapes with atmospheric fog.',
        status: 'pending'
    },
    {
        id: 'sub_002',
        title: 'E-Commerce Product Background Gen',
        author: 'StudioMaster',
        type: 'template',
        category: 'E-Commerce',
        submittedAt: '2024-03-15 10:15',
        thumbnail: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/46279930-072f-488b-b8c2-378835081292/width=450/00028-2856010398.jpeg',
        description: 'Automatically replace product backgrounds with studio quality scenes.',
        status: 'pending'
    },
    {
        id: 'sub_003',
        title: 'My First 3D Render',
        author: 'NewbieUser',
        type: 'post',
        category: 'Community Share',
        submittedAt: '2024-03-14 18:45',
        thumbnail: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/d8051515-6214-410a-8531-18928399589d/width=450/00084-2457850257.jpeg',
        description: 'Just testing out the new 3D features. Feedback welcome!',
        status: 'pending'
    },
    {
        id: 'sub_004',
        title: 'Cinematic Film Grain Effect',
        author: 'FilmBuff99',
        type: 'template',
        category: 'Film & Photo',
        submittedAt: '2024-03-14 09:20',
        thumbnail: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/2a35368f-0044-482a-a925-50950338784d/width=450/00147-2494903347.jpeg',
        description: 'Adds realistic film grain and color grading to any input image.',
        status: 'pending'
    }
];

export const AuditView: React.FC<AuditViewProps> = ({ t }) => {
    const { addToast } = useToast();
    const [items, setItems] = useState<PendingItem[]>(MOCK_PENDING_ITEMS);
    const [filter, setFilter] = useState<'all' | 'template' | 'post'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const handleApprove = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
        addToast(t?.audit?.toast_approved || 'Item approved and published successfully', 'success');
    };

    const handleReject = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
        addToast(t?.audit?.toast_rejected || 'Item rejected', 'info');
    };

    const filteredItems = items.filter(item => {
        const matchesFilter = filter === 'all' || item.type === filter;
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              item.author.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                        <FileText size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{items.filter(i => i.type === 'template').length}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{t?.audit?.stat_templates || 'Pending Templates'}</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500">
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{items.filter(i => i.type === 'post').length}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{t?.audit?.stat_posts || 'Pending Posts'}</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                        <Clock size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">4h 12m</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{t?.audit?.stat_avg_time || 'Avg. Wait Time'}</div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex bg-white dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-800">
                    <button 
                        onClick={() => setFilter('all')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${filter === 'all' ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        {t?.audit?.filter_all || 'All'}
                    </button>
                    <button 
                        onClick={() => setFilter('template')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${filter === 'template' ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        {t?.audit?.filter_templates || 'Templates'}
                    </button>
                    <button 
                        onClick={() => setFilter('post')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${filter === 'post' ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        {t?.audit?.filter_posts || 'Posts'}
                    </button>
                </div>

                <div className="relative w-full md:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder={t?.audit?.search_placeholder || 'Search by title or author...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg pl-9 pr-4 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800 text-xs text-gray-400 uppercase tracking-wider">
                                <th className="p-4 font-bold">{t?.audit?.col_item || 'Item'}</th>
                                <th className="p-4 font-bold">{t?.audit?.col_type || 'Type'}</th>
                                <th className="p-4 font-bold">{t?.audit?.col_author || 'Author'}</th>
                                <th className="p-4 font-bold">{t?.audit?.col_date || 'Submitted'}</th>
                                <th className="p-4 font-bold text-right">{t?.audit?.col_actions || 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400 text-sm">
                                        {t?.audit?.empty || 'No pending items found.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr key={item.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 dark:border-gray-700 relative flex-shrink-0">
                                                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white text-sm mb-0.5">{item.title}</div>
                                                    <div className="text-xs text-gray-500 max-w-[200px] truncate">{item.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                                                item.type === 'template' 
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800' 
                                                : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800'
                                            }`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                    {item.author.charAt(0)}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.author}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs text-gray-500 font-mono">{item.submittedAt}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors" title="Preview">
                                                    <Eye size={16} />
                                                </button>
                                                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                                                <button 
                                                    onClick={() => handleReject(item.id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-bold transition-colors"
                                                >
                                                    <X size={14} />
                                                    {t?.audit?.reject || 'Reject'}
                                                </button>
                                                <button 
                                                    onClick={() => handleApprove(item.id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 text-xs font-bold transition-colors shadow-sm shadow-green-200 dark:shadow-none"
                                                >
                                                    <Check size={14} />
                                                    {t?.audit?.approve || 'Approve'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
