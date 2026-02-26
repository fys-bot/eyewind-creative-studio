import React, { useState } from 'react';
import { Project } from '../../types';
import { translations, Language } from '../../utils/translations';
import { Copy, Plus, User, Heart, Download, Filter, Tag } from 'lucide-react';
import { createNewProject, saveProject } from '../../services/storageService';

interface WorkflowMarketplaceProps {
    onOpenProject: (project: Project) => void;
    lang: Language;
}

// Expanded Mock Templates for various industries
const MOCK_TEMPLATES = [
    // --- E-Commerce (电商) ---
    {
        id: 'tpl_ecommerce_1',
        name: 'AI Model Swap',
        description: 'Replace mannequin with realistic AI fashion model for clothing showcase.',
        thumbnail: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/b9d23315-0af6-4df0-9886-224422204c3e/width=450/00004-3788780775.jpeg',
        author: 'Official',
        category: 'E-Commerce',
        tags: ['Fashion', 'Model', 'Product'],
        downloads: 2450,
        likes: 890,
        nodes: [
            { id: 'n1', type: 'image_input', x: 100, y: 100, label: 'Mannequin Photo' },
            { id: 'n2', type: 'image_matting', x: 500, y: 100, label: 'Extract Clothes' },
            { id: 'n3', type: 'image_gen', x: 900, y: 100, data: { settings: { model: 'flux-dev' }, value: 'Professional fashion model wearing the clothes, studio lighting' }, label: 'Model Gen' },
            { id: 'n4', type: 'preview', x: 1300, y: 100, label: 'Final Look' }
        ],
        edges: [
            { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'image', targetHandle: 'image' },
            { id: 'e2', source: 'n2', target: 'n3', sourceHandle: 'mask', targetHandle: 'mask' },
            { id: 'e3', source: 'n3', target: 'n4', sourceHandle: 'image', targetHandle: 'input' }
        ]
    },
    {
        id: 'tpl_ecommerce_2',
        name: 'Product Background Gen',
        description: 'Place your product in any scene. Perfect for marketing materials.',
        thumbnail: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/46279930-072f-488b-b8c2-378835081292/width=450/00028-2856010398.jpeg',
        author: 'Official',
        category: 'E-Commerce',
        tags: ['Product', 'Background', 'Marketing'],
        downloads: 3100,
        likes: 1200,
        nodes: [
            { id: 'n1', type: 'image_input', x: 100, y: 100, label: 'Product Photo' },
            { id: 'n2', type: 'image_matting', x: 500, y: 100, label: 'Remove BG' },
            { id: 'n3', type: 'text_input', x: 100, y: 300, data: { value: 'Luxury marble table, soft sunlight, bokeh background' }, label: 'Scene Prompt' },
            { id: 'n4', type: 'image_gen', x: 900, y: 200, label: 'Scene Synthesis' },
            { id: 'n5', type: 'preview', x: 1300, y: 200, label: 'Marketing Image' }
        ],
        edges: [
            { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'image', targetHandle: 'image' },
            { id: 'e2', source: 'n2', target: 'n4', sourceHandle: 'image', targetHandle: 'image' }, // Using image as reference
            { id: 'e3', source: 'n3', target: 'n4', sourceHandle: 'output', targetHandle: 'prompt' },
            { id: 'e4', source: 'n4', target: 'n5', sourceHandle: 'image', targetHandle: 'input' }
        ]
    },

    // --- Social Media & Ads (社交/广告) ---
    {
        id: 'tpl_social_1',
        name: 'Viral Short Video',
        description: 'Create engaging short videos from a simple script. Auto-generates scenes and motion.',
        thumbnail: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/2a35368f-0044-482a-a925-50950338784d/width=450/00147-2494903347.jpeg',
        author: 'Official',
        category: 'Social Media',
        tags: ['Shorts', 'TikTok', 'Viral'],
        downloads: 5600,
        likes: 2100,
        nodes: [
            { id: 'n1', type: 'text_input', x: 100, y: 100, data: { value: 'A mysterious detective finding a clue in rainy London.' }, label: 'Script Idea' },
            { id: 'n2', type: 'script_agent', x: 500, y: 100, label: 'Script Writer' },
            { id: 'n3', type: 'image_gen', x: 900, y: 100, label: 'Scene Gen 1' },
            { id: 'n4', type: 'video_gen', x: 1300, y: 100, label: 'Animate Scene' },
            { id: 'n5', type: 'preview', x: 1700, y: 100, label: 'Video Result' }
        ],
        edges: [
            { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'output', targetHandle: 'topic' },
            { id: 'e2', source: 'n2', target: 'n3', sourceHandle: 'script', targetHandle: 'prompt' },
            { id: 'e3', source: 'n3', target: 'n4', sourceHandle: 'image', targetHandle: 'image' },
            { id: 'e4', source: 'n4', target: 'n5', sourceHandle: 'video', targetHandle: 'input' }
        ]
    },
    {
        id: 'tpl_social_2',
        name: 'Talking Avatar',
        description: 'Bring portraits to life with voice sync. Great for explainer videos.',
        thumbnail: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/d8051515-6214-410a-8531-18928399589d/width=450/00084-2457850257.jpeg',
        author: 'Community',
        category: 'Social Media',
        tags: ['Avatar', 'LipSync', 'Explainer'],
        downloads: 1800,
        likes: 650,
        nodes: [
            { id: 'n1', type: 'image_input', x: 100, y: 100, label: 'Avatar Image' },
            { id: 'n2', type: 'text_input', x: 100, y: 300, data: { value: 'Hello everyone, welcome to my channel!' }, label: 'Speech Text' },
            { id: 'n3', type: 'audio_gen', x: 500, y: 300, label: 'TTS Voice' },
            { id: 'n4', type: 'video_gen', x: 900, y: 200, label: 'Lip Sync Gen' },
            { id: 'n5', type: 'preview', x: 1300, y: 200, label: 'Talking Head' }
        ],
        edges: [
            { id: 'e1', source: 'n1', target: 'n4', sourceHandle: 'image', targetHandle: 'image' },
            { id: 'e2', source: 'n2', target: 'n3', sourceHandle: 'output', targetHandle: 'text' },
            { id: 'e3', source: 'n3', target: 'n4', sourceHandle: 'audio', targetHandle: 'audio' }, // Assuming audio input support
            { id: 'e4', source: 'n4', target: 'n5', sourceHandle: 'video', targetHandle: 'input' }
        ]
    },

    // --- Game & Anime (游戏/动漫) ---
    {
        id: 'tpl_game_1',
        name: 'Character Sheet Gen',
        description: 'Generate consistent character concept art with front, side, and back views.',
        thumbnail: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/b9d23315-0af6-4df0-9886-224422204c3e/width=450/00004-3788780775.jpeg',
        author: 'Official',
        category: 'Game & Anime',
        tags: ['Concept Art', 'Character', 'Reference'],
        downloads: 4200,
        likes: 1500,
        nodes: [
            { id: 'n1', type: 'text_input', x: 100, y: 100, data: { value: 'Cyberpunk female warrior, neon armor, katana' }, label: 'Character Desc' },
            { id: 'n2', type: 'image_gen', x: 500, y: 100, data: { value: 'character sheet, front view, side view, back view, white background', settings: { aspectRatio: '3:2' } }, label: 'Sheet Generator' },
            { id: 'n3', type: 'ai_refine', x: 900, y: 100, label: 'Detail Upscale' },
            { id: 'n4', type: 'preview', x: 1300, y: 100, label: 'Final Sheet' }
        ],
        edges: [
            { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'output', targetHandle: 'prompt' },
            { id: 'e2', source: 'n2', target: 'n3', sourceHandle: 'image', targetHandle: 'image' },
            { id: 'e3', source: 'n3', target: 'n4', sourceHandle: 'image', targetHandle: 'input' }
        ]
    },
    {
        id: 'tpl_game_2',
        name: 'Game Asset / Icon',
        description: 'Create high-quality game icons and items with transparent backgrounds.',
        thumbnail: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/46279930-072f-488b-b8c2-378835081292/width=450/00028-2856010398.jpeg',
        author: 'Community',
        category: 'Game & Anime',
        tags: ['Icon', 'UI', 'Assets'],
        downloads: 2800,
        likes: 950,
        nodes: [
            { id: 'n1', type: 'text_input', x: 100, y: 100, data: { value: 'Magical potion bottle, glowing blue liquid, gold stopper, isometric view' }, label: 'Item Prompt' },
            { id: 'n2', type: 'image_gen', x: 500, y: 100, label: 'Icon Gen' },
            { id: 'n3', type: 'image_matting', x: 900, y: 100, label: 'Remove BG' },
            { id: 'n4', type: 'preview', x: 1300, y: 100, label: 'Game Asset' }
        ],
        edges: [
            { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'output', targetHandle: 'prompt' },
            { id: 'e2', source: 'n2', target: 'n3', sourceHandle: 'image', targetHandle: 'image' },
            { id: 'e3', source: 'n3', target: 'n4', sourceHandle: 'image', targetHandle: 'input' }
        ]
    },

    // --- Architecture & Design (建筑/设计) ---

    {
        id: 'tpl_arch_2',
        name: 'Interior Design',
        description: 'Visualize interior design variations for any room.',
        thumbnail: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/2a35368f-0044-482a-a925-50950338784d/width=450/00147-2494903347.jpeg',
        author: 'Community',
        category: 'Architecture',
        tags: ['Interior', 'Design', 'Room'],
        downloads: 2900,
        likes: 850,
        nodes: [
            { id: 'n1', type: 'image_input', x: 100, y: 100, label: 'Empty Room' },
            { id: 'n2', type: 'text_input', x: 100, y: 300, data: { value: 'Scandinavian living room, cozy sofa, warm lighting, plants' }, label: 'Design Style' },
            { id: 'n3', type: 'image_gen', x: 500, y: 200, label: 'Design Gen' },
            { id: 'n4', type: 'preview', x: 900, y: 200, label: 'Interior' }
        ],
        edges: [
            { id: 'e1', source: 'n1', target: 'n3', sourceHandle: 'image', targetHandle: 'image' }, // Img2Img
            { id: 'e2', source: 'n2', target: 'n3', sourceHandle: 'output', targetHandle: 'prompt' },
            { id: 'e3', source: 'n3', target: 'n4', sourceHandle: 'image', targetHandle: 'input' }
        ]
    },

    // --- Film & Photography (影视/摄影) ---
    {
        id: 'tpl_film_1',
        name: 'Cinematic Shot Gen',
        description: 'Generate movie-quality shots with precise camera control.',
        thumbnail: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/b9d23315-0af6-4df0-9886-224422204c3e/width=450/00004-3788780775.jpeg',
        author: 'Official',
        category: 'Film & Photo',
        tags: ['Cinematic', 'Movie', '4K'],
        downloads: 4800,
        likes: 1600,
        nodes: [
            { id: 'n1', type: 'text_input', x: 100, y: 100, data: { value: 'Cinematic wide shot, sci-fi city, teal and orange grading, anamorphic lens' }, label: 'Scene Prompt' },
            { id: 'n2', type: 'image_gen', x: 500, y: 100, data: { settings: { aspectRatio: '21:9' } }, label: 'Wide Shot Gen' },
            { id: 'n3', type: 'video_gen', x: 900, y: 100, data: { settings: { duration: 5 } }, label: 'Camera Move' },
            { id: 'n4', type: 'preview', x: 1300, y: 100, label: 'Movie Clip' }
        ],
        edges: [
            { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'output', targetHandle: 'prompt' },
            { id: 'e2', source: 'n2', target: 'n3', sourceHandle: 'image', targetHandle: 'image' },
            { id: 'e3', source: 'n3', target: 'n4', sourceHandle: 'video', targetHandle: 'input' }
        ]
    },
    {
        id: 'tpl_film_2',
        name: 'Old Photo Restoration',
        description: 'Restore and colorize old black and white photos.',
        thumbnail: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/46279930-072f-488b-b8c2-378835081292/width=450/00028-2856010398.jpeg',
        author: 'Official',
        category: 'Film & Photo',
        tags: ['Restore', 'Colorize', 'Fix'],
        downloads: 2100,
        likes: 780,
        nodes: [
            { id: 'n1', type: 'image_input', x: 100, y: 100, label: 'Old Photo' },
            { id: 'n2', type: 'ai_refine', x: 500, y: 100, data: { value: 'restore faces, remove scratches' }, label: 'Restore' },
            { id: 'n3', type: 'image_gen', x: 900, y: 100, data: { value: 'colorize' }, label: 'Colorize' }, // Assuming gen can handle img2img colorize logic
            { id: 'n4', type: 'preview', x: 1300, y: 100, label: 'Restored' }
        ],
        edges: [
            { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'image', targetHandle: 'image' },
            { id: 'e2', source: 'n2', target: 'n3', sourceHandle: 'image', targetHandle: 'image' },
            { id: 'e3', source: 'n3', target: 'n4', sourceHandle: 'image', targetHandle: 'input' }
        ]
    }
];

const WorkflowMarketplace: React.FC<WorkflowMarketplaceProps> = ({ onOpenProject, lang }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    
    const categories = ['All', 'E-Commerce', 'Social Media', 'Game & Anime', 'Architecture', 'Film & Photo'];
    
    const filteredTemplates = selectedCategory === 'All' 
        ? MOCK_TEMPLATES 
        : MOCK_TEMPLATES.filter(t => t.category === selectedCategory || t.category?.includes(selectedCategory));

    const handleUseTemplate = async (template: any) => {
        // Create new project from template
        const newProject = await createNewProject();
        newProject.name = template.name;
        newProject.description = template.description;
        newProject.thumbnail = template.thumbnail;
        newProject.nodes = template.nodes || [];
        newProject.edges = template.edges || [];
        newProject.tags = [...(template.tags || []), 'forked', template.category || 'General'];
        
        await saveProject(newProject);
        onOpenProject(newProject);
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-8 animate-in fade-in duration-500">
            
            {/* Header Banner */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900 to-indigo-900 mb-10 h-64 flex items-center px-10 shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/d8051515-6214-410a-8531-18928399589d/width=1200/00084-2457850257.jpeg')] opacity-20 bg-cover bg-center mix-blend-overlay"></div>
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
                        {lang === 'zh' || lang === 'tw' ? '发现无限创意可能' : 'Discover Limitless Creativity'}
                    </h1>
                    <p className="text-lg text-blue-100 mb-8 max-w-lg leading-relaxed">
                        {lang === 'zh' || lang === 'tw' 
                            ? '探索针对电商、游戏、影视等行业的专业级工作流模板，一键复用，加速落地。' 
                            : 'Explore professional workflow templates for E-commerce, Gaming, Film, and more. Clone and create in seconds.'}
                    </p>
                    <div className="flex gap-4">
                        <button className="px-6 py-3 bg-white text-blue-900 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg flex items-center gap-2">
                            <Filter size={18} />
                            {lang === 'zh' || lang === 'tw' ? '浏览精选' : 'Browse Featured'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar">
                {categories.map((cat) => (
                    <button 
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                            selectedCategory === cat 
                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg scale-105' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        {cat === 'E-Commerce' && (lang === 'zh' || lang === 'tw') ? '电商营销' : 
                         cat === 'Social Media' && (lang === 'zh' || lang === 'tw') ? '社交媒体' :
                         cat === 'Game & Anime' && (lang === 'zh' || lang === 'tw') ? '游戏动漫' :
                         cat === 'Architecture' && (lang === 'zh' || lang === 'tw') ? '建筑设计' :
                         cat === 'Film & Photo' && (lang === 'zh' || lang === 'tw') ? '影视摄影' :
                         cat === 'All' && (lang === 'zh' || lang === 'tw') ? '全部' : cat}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTemplates.map((tpl) => (
                    <div key={tpl.id} className="group flex flex-col gap-3">
                        {/* Card Image */}
                        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 shadow-sm group-hover:shadow-xl transition-all cursor-pointer">
                            <img src={tpl.thumbnail} alt={tpl.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                <button 
                                    onClick={() => handleUseTemplate(tpl)}
                                    className="w-full py-3 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300"
                                >
                                    <Copy size={16} />
                                    {lang === 'zh' || lang === 'tw' ? '使用此模板' : 'Use Template'}
                                </button>
                            </div>
                            
                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-bold border border-white/10 flex items-center gap-1.5 shadow-lg">
                                {tpl.author === 'Official' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>}
                                {tpl.author}
                            </div>

                            {/* Category Badge */}
                            <div className="absolute top-3 right-3 bg-white/90 dark:bg-black/80 backdrop-blur-md text-gray-900 dark:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-lg border border-black/5 dark:border-white/10">
                                {tpl.category}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="px-1">
                            <div className="flex items-center justify-between mb-1.5">
                                <h3 className="font-bold text-gray-900 dark:text-white truncate pr-2 text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{tpl.name}</h3>
                                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    <span className="flex items-center gap-1"><Download size={12}/> {tpl.downloads}</span>
                                    <span className="flex items-center gap-1"><Heart size={12}/> {tpl.likes}</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-3 h-8">
                                {tpl.description}
                            </p>
                            
                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5">
                                {tpl.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-md font-medium flex items-center gap-1">
                                        <Tag size={8} className="opacity-50"/>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WorkflowMarketplace;
