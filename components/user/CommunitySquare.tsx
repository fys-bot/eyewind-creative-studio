import React, { useState } from 'react';
import { translations, Language } from '../../utils/translations';
import { Search, Filter, Heart, MessageCircle, Eye, Share2, MoreHorizontal, User, Zap, Flame, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface CommunitySquareProps {
    lang: Language;
}

interface CommunityPost {
    id: string;
    title: string;
    author: {
        name: string;
        avatar?: string;
        isPro?: boolean;
    };
    image: string;
    likes: number;
    views: number;
    comments: number;
    timeAgo: string;
    tags: string[];
    isLiked?: boolean;
}

const MOCK_POSTS: CommunityPost[] = [
    {
        id: 'p1',
        title: 'Cyberpunk Cityscapes Workflow',
        author: { name: 'NeonArtist', isPro: true },
        image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/b9d23315-0af6-4df0-9886-224422204c3e/width=450/00004-3788780775.jpeg',
        likes: 1250,
        views: 8500,
        comments: 45,
        timeAgo: '2h ago',
        tags: ['Cyberpunk', 'City', 'Sci-Fi']
    },
    {
        id: 'p2',
        title: 'Realistic Portrait Retouching',
        author: { name: 'PhotoMaster' },
        image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/d8051515-6214-410a-8531-18928399589d/width=450/00084-2457850257.jpeg',
        likes: 890,
        views: 3200,
        comments: 21,
        timeAgo: '5h ago',
        tags: ['Portrait', 'Retouch', 'Photography']
    },
    {
        id: 'p3',
        title: 'Anime Character Concept',
        author: { name: 'OtakuDev', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
        image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/2a35368f-0044-482a-a925-50950338784d/width=450/00147-2494903347.jpeg',
        likes: 3400,
        views: 15000,
        comments: 120,
        timeAgo: '1d ago',
        tags: ['Anime', 'Character', 'Concept']
    },
    {
        id: 'p4',
        title: 'Interior Design - Nordic Style',
        author: { name: 'ArchVizPro', isPro: true },
        image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/46279930-072f-488b-b8c2-378835081292/width=450/00028-2856010398.jpeg',
        likes: 560,
        views: 2100,
        comments: 15,
        timeAgo: '3h ago',
        tags: ['Interior', 'ArchViz', 'Nordic']
    },
    {
        id: 'p5',
        title: 'Abstract Fluid Art Generator',
        author: { name: 'ArtBot' },
        image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/46279930-072f-488b-b8c2-378835081292/width=450/00028-2856010398.jpeg',
        likes: 420,
        views: 1800,
        comments: 8,
        timeAgo: '6h ago',
        tags: ['Abstract', 'Fluid', 'Art']
    },
    {
        id: 'p6',
        title: 'Logo Design Assistant',
        author: { name: 'DesignGuru' },
        image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/b9d23315-0af6-4df0-9886-224422204c3e/width=450/00004-3788780775.jpeg',
        likes: 780,
        views: 4500,
        comments: 32,
        timeAgo: '12h ago',
        tags: ['Logo', 'Design', 'Branding']
    }
];

const CommunitySquare: React.FC<CommunitySquareProps> = ({ lang }) => {
    const [filter, setFilter] = useState<'trending' | 'new' | 'following'>('trending');
    const [posts, setPosts] = useState(MOCK_POSTS);

    const handleLike = (id: string) => {
        setPosts(prev => prev.map(p => {
            if (p.id === id) {
                return { 
                    ...p, 
                    likes: p.isLiked ? p.likes - 1 : p.likes + 1,
                    isLiked: !p.isLiked
                };
            }
            return p;
        }));
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-8 animate-in fade-in duration-500">
            
            {/* Header / Search */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                        {lang === 'zh' || lang === 'tw' ? '创意广场' : 'Community Square'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {lang === 'zh' || lang === 'tw' 
                            ? '探索来自全球创作者的惊人作品和工作流。' 
                            : 'Discover amazing works and workflows from creators worldwide.'}
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder={lang === 'zh' || lang === 'tw' ? '搜索灵感...' : 'Search for inspiration...'}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                    </div>
                    <button className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors">
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-6 border-b border-gray-100 dark:border-gray-800 mb-8">
                <button 
                    onClick={() => setFilter('trending')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors relative ${filter === 'trending' ? 'text-black dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                    <Flame size={16} className={filter === 'trending' ? 'text-orange-500' : ''} />
                    {lang === 'zh' || lang === 'tw' ? '热门趋势' : 'Trending'}
                    {filter === 'trending' && <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white rounded-full" />}
                </button>
                <button 
                    onClick={() => setFilter('new')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors relative ${filter === 'new' ? 'text-black dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                    <Clock size={16} className={filter === 'new' ? 'text-blue-500' : ''} />
                    {lang === 'zh' || lang === 'tw' ? '最新发布' : 'New Arrivals'}
                    {filter === 'new' && <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white rounded-full" />}
                </button>
                <button 
                    onClick={() => setFilter('following')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors relative ${filter === 'following' ? 'text-black dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                    <User size={16} className={filter === 'following' ? 'text-purple-500' : ''} />
                    {lang === 'zh' || lang === 'tw' ? '关注' : 'Following'}
                    {filter === 'following' && <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white rounded-full" />}
                </button>
            </div>

            {/* Masonry Grid (Simulated with columns) */}
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                {posts.map((post) => (
                    <div key={post.id} className="break-inside-avoid group relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300">
                        
                        {/* Image */}
                        <div className="relative cursor-pointer overflow-hidden">
                            <img src={post.image} alt={post.title} className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            
                            {/* Overlay Actions */}
                            <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0">
                                <button className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black transition-colors">
                                    <Share2 size={16} />
                                </button>
                                <button className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black transition-colors">
                                    <MoreHorizontal size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-gray-900 dark:text-white text-base truncate pr-2 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors">
                                    {post.title}
                                </h3>
                            </div>

                            {/* Author */}
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                    {post.author.avatar ? (
                                        <img src={post.author.avatar} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">
                                            {post.author.name[0]}
                                        </div>
                                    )}
                                </div>
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                    {post.author.name}
                                    {post.author.isPro && <Zap size={10} className="text-yellow-500 fill-current" />}
                                </span>
                                <span className="text-xs text-gray-400">• {post.timeAgo}</span>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {post.tags.map(tag => (
                                    <span key={tag} className="text-[10px] bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-md">
                                        #{tag}
                                    </span>
                                ))}
                            </div>

                            {/* Stats */}
                            <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-800">
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => handleLike(post.id)}
                                        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${post.isLiked ? 'text-pink-500' : 'text-gray-500 dark:text-gray-400 hover:text-pink-500'}`}
                                    >
                                        <Heart size={14} className={post.isLiked ? 'fill-current' : ''} />
                                        {post.likes}
                                    </button>
                                    <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors">
                                        <MessageCircle size={14} />
                                        {post.comments}
                                    </button>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                    <Eye size={14} />
                                    {post.views}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Load More */}
            <div className="mt-12 text-center">
                <button className="px-8 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    {lang === 'zh' || lang === 'tw' ? '加载更多' : 'Load More'}
                </button>
            </div>
        </div>
    );
};

export default CommunitySquare;
