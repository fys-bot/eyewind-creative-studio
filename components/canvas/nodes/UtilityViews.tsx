
import React from 'react';
import { NodeViewProps } from './nodeViewUtils';
import { ArrowLeftRight, Image as ImageIcon } from 'lucide-react';

export const ImageCompareView: React.FC<NodeViewProps> = ({ node, contentHeight }) => {
    return (
        <div className="w-full bg-slate-100 dark:bg-slate-900 overflow-hidden flex flex-col items-center justify-center relative group" style={{ height: contentHeight }}>
             {node.data.outputResult ? (
                 <>
                    <img src={node.data.outputResult} className="w-full h-full object-contain" />
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">Result</div>
                 </>
             ) : (
                 <div className="flex flex-col items-center gap-2 text-slate-400">
                     <ArrowLeftRight size={24} />
                     <span className="text-[10px]">Compare</span>
                 </div>
             )}
        </div>
    );
};

export const StickyNoteView: React.FC<NodeViewProps> = ({ node, onUpdateData }) => {
    const color = node.data.settings?.color || 'yellow';
    
    const getBgClass = () => {
        switch(color) {
            case 'blue': return 'bg-blue-50 dark:bg-blue-900/10';
            case 'green': return 'bg-green-50 dark:bg-green-900/10';
            case 'pink': return 'bg-pink-50 dark:bg-pink-900/10';
            case 'purple': return 'bg-purple-50 dark:bg-purple-900/10';
            case 'gray': return 'bg-gray-50 dark:bg-gray-800';
            default: return 'bg-yellow-50 dark:bg-yellow-900/10';
        }
    };

    const getPlaceholderClass = () => {
         switch(color) {
            case 'blue': return 'placeholder-blue-800/30 dark:placeholder-blue-100/30 text-gray-800 dark:text-blue-100';
            case 'green': return 'placeholder-green-800/30 dark:placeholder-green-100/30 text-gray-800 dark:text-green-100';
            case 'pink': return 'placeholder-pink-800/30 dark:placeholder-pink-100/30 text-gray-800 dark:text-pink-100';
            case 'purple': return 'placeholder-purple-800/30 dark:placeholder-purple-100/30 text-gray-800 dark:text-purple-100';
            case 'gray': return 'placeholder-gray-400 dark:placeholder-gray-500 text-gray-800 dark:text-gray-200';
            default: return 'placeholder-yellow-800/30 dark:placeholder-yellow-100/30 text-gray-800 dark:text-yellow-100';
        }
    };

    return (
        <div className={`h-full w-full ${getBgClass()} p-0 overflow-hidden rounded-b-xl transition-colors duration-300`}>
            <textarea
                className={`w-full h-full bg-transparent p-4 resize-none outline-none text-sm font-medium leading-relaxed custom-scrollbar cursor-text select-text ${getPlaceholderClass()}`}
                placeholder="Type your notes here..."
                value={node.data.value}
                onChange={(e) => onUpdateData(node.id, { value: e.target.value })}
                onMouseDown={(e) => e.stopPropagation()} 
                onWheel={(e) => e.stopPropagation()}
                style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}
            />
        </div>
    );
};
