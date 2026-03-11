import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Search, X, Check, Star } from 'lucide-react';

interface ModelItem {
    id: string;
    label: string;
    provider?: string;
}

interface ModelSelectorProps {
    models: ModelItem[];
    value?: string;
    onChange: (modelId: string) => void;
    isLoading?: boolean;
    placeholder?: string;
    icon?: React.ReactNode;
    className?: string;
}

const FAVORITES_KEY = 'enexus_favorite_models';

const getFavorites = (): Set<string> => {
    try {
        const raw = localStorage.getItem(FAVORITES_KEY);
        return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
    } catch { return new Set<string>(); }
};

const saveFavorites = (favs: Set<string>) => {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs])); } catch {}
};

const getGroupName = (model: ModelItem): string => {
    if (model.id.includes('/')) {
        const prefix = model.id.split('/')[0];
        return prefix.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
    return model.provider || 'Other';
};

const getCanonicalName = (id: string): string => id.includes('/') ? id.split('/').pop()! : id;

const getDisplayName = (model: ModelItem): string =>
    model.label || (model.id.includes('/') ? model.id.split('/').pop()!.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim() : model.id);

const getHoverTitle = (model: ModelItem): string => model.id;

const ModelSelector: React.FC<ModelSelectorProps> = ({ models, value, onChange, isLoading, placeholder = 'Select Model', icon, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [favorites, setFavorites] = useState<Set<string>>(() => getFavorites());
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        // 使用 pointerdown capture 阶段，不受父组件 stopPropagation 影响
        const handler = (e: PointerEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('pointerdown', handler, true);
        return () => document.removeEventListener('pointerdown', handler, true);
    }, [isOpen]);

    useEffect(() => { if (isOpen && searchRef.current) setTimeout(() => searchRef.current?.focus(), 50); }, [isOpen]);

    const toggleFavorite = useCallback((modelId: string, e: React.MouseEvent) => {
        e.stopPropagation(); e.preventDefault();
        setFavorites(prev => {
            const next = new Set<string>(prev);
            if (next.has(modelId)) next.delete(modelId); else next.add(modelId);
            saveFavorites(next);
            return next;
        });
    }, []);

    const dedupedModels = useMemo(() => {
        const seen = new Map<string, ModelItem>();
        for (const m of models) { const c = getCanonicalName(m.id); if (!seen.has(c)) seen.set(c, m); }
        return [...seen.values()];
    }, [models]);

    const { groups, favoriteModels, totalCount } = useMemo(() => {
        const query = search.toLowerCase().trim();
        const filtered = query
            ? dedupedModels.filter(m => m.id.toLowerCase().includes(query) || m.label?.toLowerCase().includes(query) || getGroupName(m).toLowerCase().includes(query))
            : dedupedModels;
        const favModels = filtered.filter(m => favorites.has(m.id));
        const map = new Map<string, ModelItem[]>();
        for (const m of filtered) { const g = getGroupName(m); if (!map.has(g)) map.set(g, []); map.get(g)!.push(m); }
        for (const [, items] of map) items.sort((a, b) => getDisplayName(b).localeCompare(getDisplayName(a)));
        const priority = ['Google', 'Openai', 'OpenAI', 'Alibaba', 'Bytedance', 'ByteDance', 'Meta', 'Stability', 'Black Forest Labs'];
        const sorted = [...map.entries()].sort((a, b) => {
            const ai = priority.findIndex(p => a[0].toLowerCase() === p.toLowerCase());
            const bi = priority.findIndex(p => b[0].toLowerCase() === p.toLowerCase());
            if (ai >= 0 && bi >= 0) return ai - bi; if (ai >= 0) return -1; if (bi >= 0) return 1;
            return a[0].localeCompare(b[0]);
        });
        return { groups: sorted, favoriteModels: favModels, totalCount: filtered.length };
    }, [dedupedModels, search, favorites]);

    const selectedModel = dedupedModels.find(m => m.id === value);
    const displayLabel = selectedModel ? getDisplayName(selectedModel) : placeholder;

    useEffect(() => {
        const el = listRef.current;
        if (!el || !isOpen) return;
        const handler = (e: WheelEvent) => {
            e.stopPropagation();
            const { scrollTop, scrollHeight, clientHeight } = el;
            if ((scrollTop <= 0 && e.deltaY < 0) || (scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0)) e.preventDefault();
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, [isOpen]);

    const renderModelItem = (m: ModelItem, showGroup?: boolean) => (
        <button key={m.id} onClick={(e) => { e.stopPropagation(); onChange(m.id); setIsOpen(false); setSearch(''); }}
            className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors group ${m.id === value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
            title={getHoverTitle(m)}>
            {m.id === value && <Check size={12} className="flex-shrink-0 text-blue-500" />}
            <span className={`truncate flex-1 ${m.id === value ? '' : 'ml-5'}`}>
                {getDisplayName(m)}{showGroup ? <span className="text-gray-400 ml-1 text-[10px]">({getGroupName(m)})</span> : null}
            </span>
            <span onClick={(e) => toggleFavorite(m.id, e)}
                className={`flex-shrink-0 cursor-pointer transition-all ${favorites.has(m.id) ? 'text-yellow-400 hover:text-yellow-500' : 'text-transparent group-hover:text-gray-300 dark:group-hover:text-gray-600 hover:!text-yellow-400'}`}>
                <Star size={11} fill={favorites.has(m.id) ? 'currentColor' : 'none'} />
            </span>
        </button>
    );

    return (
        <div ref={containerRef} className={`relative ${className || ''}`}>
            <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer shadow-sm">
                {icon && <span className="flex-shrink-0 text-gray-400">{icon}</span>}
                <span className="flex-1 text-left truncate">{isLoading ? 'Loading...' : displayLabel}</span>
                <ChevronDown size={12} className={`text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 bottom-full mb-1 z-[9999] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col animate-in fade-in zoom-in-95 origin-bottom"
                    style={{ height: '340px', minWidth: '240px' }} onMouseDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                    {/* Search */}
                    <div className="shrink-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-2 rounded-t-xl">
                        <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input ref={searchRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search models..." onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}
                                className="w-full pl-7 pr-7 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg outline-none focus:border-blue-400 dark:focus:border-blue-600 text-gray-700 dark:text-gray-200 placeholder:text-gray-400" />
                            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>}
                        </div>
                        <div className="text-[9px] text-gray-400 mt-1 px-1">{totalCount} models</div>
                    </div>
                    {/* Model List */}
                    <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain"
                        style={{ touchAction: 'pan-y' }} onTouchMove={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>

                        {/* Favorites Section */}
                        {favoriteModels.length > 0 && (
                            <div>
                                <div className="sticky top-0 px-3 py-1 text-[10px] font-bold text-yellow-500 dark:text-yellow-400 uppercase tracking-wider bg-yellow-50/95 dark:bg-yellow-900/20 backdrop-blur-sm border-b border-yellow-100/50 dark:border-yellow-800/30 z-[2] flex items-center gap-1">
                                    <Star size={9} fill="currentColor" /> 收藏 <span className="text-yellow-400/60 font-normal">({favoriteModels.length})</span>
                                </div>
                                {favoriteModels.map(m => renderModelItem(m, true))}
                            </div>
                        )}

                        {groups.length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-400">No models found</div>
                        ) : groups.map(([groupName, groupModels]) => (
                            <div key={groupName}>
                                <div className="sticky top-0 px-3 py-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100/50 dark:border-gray-700/50 z-[1]">
                                    {groupName} <span className="text-gray-300 dark:text-gray-600 font-normal">({groupModels.length})</span>
                                </div>
                                {groupModels.map(m => renderModelItem(m))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModelSelector;
