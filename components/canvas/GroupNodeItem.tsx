import React, { useState, useRef, useEffect } from 'react';
import { WorkflowNode, AppSettings } from '../../types';
import { Unlink, Trash2 } from 'lucide-react';

interface GroupNodeProps {
    node: WorkflowNode;
    selected: boolean;
    zoom: number; 
    isHighlighted?: boolean;
    isMultiSelection?: boolean; 
    onStartDrag: (id: string) => void;
    onClick: (e: React.MouseEvent) => void;
    onUpdateLabel?: (id: string, newLabel: string) => void; 
    onUngroup?: (id: string) => void; 
    onDelete?: (id: string) => void; // Standard delete (group + children usually, but currently just frame)
    onDeleteGroupContent?: (id: string) => void; // New: Delete content only
    onNodeTouchStart?: (id: string, e: React.TouchEvent) => void; 
    settings?: AppSettings; 
}

const GroupNodeItem: React.FC<GroupNodeProps> = ({ node, selected, zoom, isHighlighted, isMultiSelection, onStartDrag, onClick, onUpdateLabel, onUngroup, onDelete, onDeleteGroupContent, onNodeTouchStart, settings }) => {
    const { width = 400, height = 300, color = 'rgba(240, 240, 240, 0.5)' } = node.data.settings || {};
    const [isEditing, setIsEditing] = useState(false);
    const [labelValue, setLabelValue] = useState(node.data.label || 'Group');
    const inputRef = useRef<HTMLInputElement>(null);

    // --- Adaptive Title Scaling ---
    const minScale = settings?.adaptiveZoomMin ?? 0.4;
    const maxScale = settings?.adaptiveZoomMax ?? 2.5;
    const adaptiveScale = Math.min(Math.max(1 / zoom, minScale), maxScale);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleLabelSubmit = () => {
        setIsEditing(false);
        if (onUpdateLabel && labelValue.trim() !== node.data.label) {
            onUpdateLabel(node.id, labelValue.trim());
        }
    };

    return (
        <div
            id={`node-${node.id}`}
            className={`absolute rounded-[32px] group border-2 ${isHighlighted ? 'border-dashed border-blue-500 bg-blue-500/10' : 'border-dashed'}`}
            style={{
                left: node.x,
                top: node.y,
                width: width,
                height: height,
                backgroundColor: isHighlighted ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.03)', // Subtle Blue Tint
                borderColor: isHighlighted ? '#3b82f6' : (selected ? '#3b82f6' : '#cbd5e1'), 
                borderWidth: isHighlighted ? '3px' : '2px',
                borderStyle: 'dashed',
                zIndex: 0, 
                boxShadow: isHighlighted ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none',
                // Optimized Transition: Exclude 'left', 'top', 'width', 'height' to prevent drag lag/desync
                transitionProperty: 'background-color, border-color, box-shadow, border-width',
                transitionDuration: '200ms',
                transitionTimingFunction: 'ease-in-out'
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
                onStartDrag(node.id);
                onClick(e);
            }}
            // onTouchStart={(e) => {
            //    if (onNodeTouchStart) onNodeTouchStart(node.id, e);
            // }}
            onClick={onClick}
        >
            {/* Header / Drag Handle */}
            <div 
                className="absolute -top-3 left-6 flex items-center gap-2 origin-bottom-left"
                style={{
                    transform: `scale(${adaptiveScale})`
                }}
            >
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={labelValue}
                        onChange={(e) => setLabelValue(e.target.value)}
                        onBlur={handleLabelSubmit}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleLabelSubmit();
                            if (e.key === 'Escape') {
                                setIsEditing(false);
                                setLabelValue(node.data.label || 'Group');
                            }
                        }}
                        className="text-xs font-bold text-gray-700 bg-white px-3 py-1.5 rounded-lg shadow-sm outline-none border border-blue-500 min-w-[80px]"
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div 
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (!isMultiSelection) {
                                setIsEditing(true);
                            }
                        }}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 shadow-sm cursor-text hover:border-blue-400 transition-colors flex items-center gap-2 group/label"
                    >
                        <div className="w-1.5 h-3 bg-gray-300 rounded-full group-hover/label:bg-blue-400 transition-colors"></div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 select-none whitespace-nowrap">
                            {node.data.label || 'Group'}
                        </span>
                    </div>
                )}
            </div>

            {/* Action Buttons - Top Right */}
            {selected && !isEditing && (
                <div 
                    className="absolute -top-3 right-6 flex items-center gap-1 origin-bottom-right"
                    style={{
                        transform: `scale(${adaptiveScale})`
                    }}
                >
                    {/* Ungroup Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onUngroup) onUngroup(node.id);
                        }}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 shadow-sm hover:bg-gray-50 hover:border-gray-300 dark:hover:bg-gray-700 dark:hover:border-gray-600 transition-colors"
                        title="Ungroup"
                        onMouseDown={(e) => e.stopPropagation()} 
                    >
                        <Unlink size={14} className="text-gray-500 dark:text-gray-400" />
                    </button>

                    {/* Delete Content Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onDeleteGroupContent) onDeleteGroupContent(node.id);
                        }}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 shadow-sm hover:bg-red-50 hover:border-red-200 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:border-red-800 dark:hover:text-red-400 transition-colors"
                        title="Delete Group Content"
                        onMouseDown={(e) => e.stopPropagation()} 
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default GroupNodeItem;
