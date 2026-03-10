import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

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

/** Extract group name from model ID prefix (before /) or fallback to provider */
const getGroupName = (model: ModelItem): string => {
    if (model.id.includes('/')) {
        const prefix = model.id.split('/')[0];
        return prefix.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
    return model.provider || 'Other';
};

/** Get the canonical model name (part after last /) for dedup */
const getCanonicalName = (id: string): string => {
    return id.includes('/') ? id.split('/').pop()! : id;
};

/** Get display name — 从 model ID 提取可读名称（如 gpt-image-1） */
const getDisplayName = (model: ModelItem): string => {
    const namePart = model.id.includes('/') ? model.id.split('/').pop()! : model.id;
    return namePart
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .replace(/ To /g, ' to ')
        .trim();
};

/** Get hover title — 优先用 label，否则用完整 ID */
const getHoverTitle = (model: ModelItem): string => {
    if (model.label && model.label !== getDisplayName(model)) {
        return `${model.label} (${model.id})`;
    }
    return model.id;
};

const MAX_PER_GROUP = 3; // 每组默认显示的模型数

const ModelSelector: React.FC<ModelSelectorProps> = ({ models, value, onChange, isLoading, placeholder = 'Select Model', icon, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [showAll, setShowAll] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && searchRef.current) {
            setTimeout(() => searchRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Deduplicate models: same canonical name (part after /) → keep first occurrence
    const dedupedModels = useMemo(() => {
        const seen = new Map<string, ModelItem>();
        for (const m of models) {
            const canonical = getCanonicalName(m.id);
            if (!seen.has(canonical)) {
                seen.set(canonical, m);
            }
        }
        return [...seen.values()];
    }, [models]);

    // Group and filter
    const { groups, totalCount } = useMemo(() => {
        const query = search.toLowerCase().trim();
        const filtered = query
            ? dedupedModels.filter(m =>
                m.id.toLowerCase().includes(query) ||
                m.label?.toLowerCase().includes(query) ||
                getGroupName(m).toLowerCase().includes(query) ||
                getCanonicalName(m.id).toLowerCase().includes(query)
            )
            : dedupedModels;

        const map = new Map<string, ModelItem[]>();
        for (const m of filtered) {
            const group = getGroupName(m);
            if (!map.has(group)) map.set(group, []);
            map.get(group)!.push(m);
        }

        // 组内按显示名降序排序，版本号高的在前（最新模型优先）
        for (const [, items] of map) {
            items.sort((a, b) => getDisplayName(b).localeCompare(getDisplayName(a)));
        }

        const priority = ['Google', 'Openai', 'OpenAI', 'Alibaba', 'Bytedance', 'ByteDance', 'Meta', 'Stability', 'Black Forest Labs'];
        const sorted = [...map.entries()].sort((a, b) => {
            const ai = priority.findIndex(p => a[0].toLowerCase() === p.toLowerCase());
            const bi = priority.findIndex(p => b[0].toLowerCase() === p.toLowerCase());
            if (ai >= 0 && bi >= 0) return ai - bi;
            if (ai >= 0) return -1;
            if (bi >= 0) return 1;
            return a[0].localeCompare(b[0]);
        });

        return { groups: sorted, totalCount: filtered.length };
    }, [dedupedModels, search]);

    const selectedModel = dedupedModels.find(m => m.id === value);
    const displayLabel = selectedModel ? getDisplayName(selectedModel) : placeholder;

    /** Prevent scroll from leaking to parent/canvas using native listener (passive: false) */
    useEffect(() => {
        const el = listRef.current;
        if (!el || !isOpen) return;
        const handler = (e: WheelEvent) => {
            e.stopPropagation();
            const { scrollTop, scrollHeight, clientHeight } = el;
            const atTop = scrollTop <= 0 && e.deltaY < 0;
            const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0;
            if (atTop || atBottom) {
                e.preventDefault();
            }
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, [isOpen]);

    return (
        <div ref={containerRef} className={`relative ${className || ''}`}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer shadow-sm"
            >
                {icon && <span className="flex-shrink-0 text-gray-400">{icon}</span>}
                <span className="flex-1 text-left truncate">{isLoading ? 'Loading...' : displayLabel}</span>
                <ChevronDown size={12} className={`text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => { setIsOpen(false); setSearch(''); }} />
                    <div
                        className="absolute left-0 right-0 bottom-full mb-1 z-[9999] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col animate-in fade-in zoom-in-95 origin-bottom"
                        style={{ height: '340px', minWidth: '240px' }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                    >
                        {/* Search */}
                        <div className="shrink-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-2 rounded-t-xl">
                            <div className="relative">
                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search models..."
                                    className="w-full pl-7 pr-7 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg outline-none focus:border-blue-400 dark:focus:border-blue-600 text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                />
                                {search && (
                                    <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                            <div className="text-[9px] text-gray-400 mt-1 px-1">{totalCount} models</div>
                        </div>

                        {/* Model List */}
                        <div
                            ref={listRef}
                            className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain"
                            style={{ touchAction: 'pan-y' }}
                            onTouchMove={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            {groups.length === 0 ? (
                                <div className="p-4 text-center text-xs text-gray-400">No models found</div>
                            ) : (
                                groups.map(([groupName, groupModels]) => {
                                    const isSearching = search.trim().length > 0;
                                    let visibleModels: ModelItem[];
                                    
                                    if (showAll || isSearching) {
                                        visibleModels = groupModels;
                                    } else {
                                        // 智能挑选：优先 pro/ultra/turbo 等高质量模型，去掉 edit/preview 等变体
                                        const scored = groupModels.map(m => {
                                            const name = getDisplayName(m).toLowerCase();
                                            const id = m.id.toLowerCase();
                                            let score = 0;
                                            // 高分：pro/ultra/turbo/max 等旗舰关键词
                                            if (/\bpro\b/.test(name) && !/\bedit\b/.test(name)) score += 10;
                                            if (/\bultra\b/.test(name) && !/\bedit\b/.test(name)) score += 10;
                                            if (/\bturbo\b/.test(name)) score += 8;
                                            if (/\bmax\b/.test(name)) score += 8;
                                            if (/\bplus\b/.test(name)) score += 6;
                                            if (/\bfast\b/.test(name) && !/\bedit\b/.test(name)) score += 4;
                                            // 降分：edit/preview/draft 等变体
                                            if (/\bedit\b/.test(name)) score -= 3;
                                            if (/\bpreview\b/.test(name)) score -= 2;
                                            if (/\bdraft\b/.test(name)) score -= 3;
                                            // 版本号加分（越高越好）
                                            const verMatch = id.match(/(\d+)\.(\d+)/);
                                            if (verMatch) score += parseFloat(`${verMatch[1]}.${verMatch[2]}`);
                                            // v3 > v2 > v1
                                            const vMatch = id.match(/v(\d+)/);
                                            if (vMatch) score += parseInt(vMatch[1]) * 2;
                                            return { model: m, score };
                                        });
                                        scored.sort((a, b) => b.score - a.score);
                                        visibleModels = scored.slice(0, MAX_PER_GROUP).map(s => s.model);
                                    }
                                    
                                    const hiddenCount = groupModels.length - visibleModels.length;
                                    const visibleIds = new Set(visibleModels.map(m => m.id));
                                    const selectedInHidden = !showAll && !isSearching && value && hiddenCount > 0 && !visibleIds.has(value) && groupModels.some(m => m.id === value);
                                    const selectedModel = selectedInHidden ? groupModels.find(m => m.id === value) : null;

                                    return (
                                    <div key={groupName}>
                                        <div className="sticky top-0 px-3 py-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100/50 dark:border-gray-700/50 z-[1]">
                                            {groupName} <span className="text-gray-300 dark:text-gray-600 font-normal">({groupModels.length})</span>
                                        </div>
                                        {visibleModels.map(m => (
                                            <button
                                                key={m.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onChange(m.id);
                                                    setIsOpen(false);
                                                    setSearch('');
                                                }}
                                                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                                                    m.id === value
                                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                }`}
                                                title={getHoverTitle(m)}
                                            >
                                                {m.id === value && <Check size={12} className="flex-shrink-0 text-blue-500" />}
                                                <span className={`truncate ${m.id === value ? '' : 'ml-5'}`}>{getDisplayName(m)}</span>
                                            </button>
                                        ))}
                                        {/* 当前选中模型在隐藏区域时单独显示 */}
                                        {selectedModel && (
                                            <button
                                                key={selectedModel.id}
                                                onClick={(e) => { e.stopPropagation(); }}
                                                className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                                title={getHoverTitle(selectedModel)}
                                            >
                                                <Check size={12} className="flex-shrink-0 text-blue-500" />
                                                <span className="truncate">{getDisplayName(selectedModel)}</span>
                                            </button>
                                        )}
                                        {/* 显示隐藏数量提示 */}
                                        {hiddenCount > 0 && !isSearching && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowAll(true); }}
                                                className="w-full text-left px-3 py-1 text-[10px] text-blue-500 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors"
                                            >
                                                +{hiddenCount} more...
                                            </button>
                                        )}
                                    </div>
                                    );
                                })
                            )}
                        </div>

                        {/* 底部：展开/收起全部按钮 */}
                        {!search.trim() && totalCount > groups.length * MAX_PER_GROUP && (
                            <div className="shrink-0 border-t border-gray-100 dark:border-gray-700 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-b-xl">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowAll(!showAll); }}
                                    className="w-full text-center text-[10px] font-medium text-blue-500 hover:text-blue-600 transition-colors py-0.5"
                                >
                                    {showAll ? '收起精选' : `展开全部 ${totalCount} 个模型`}
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ModelSelector;
