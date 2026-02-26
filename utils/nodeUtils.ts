
import { WorkflowNode, WorkflowNodeType, AspectRatio } from '../types';
import { getNodePortPosition } from '../services/nodeEngine';

export const getExactHandlePosition = (nodes: WorkflowNode[], nodeId: string, handleId: string | undefined, type: 'source' | 'target', expandedNodeId: string | null, zoom: number) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const isExpanded = expandedNodeId === nodeId;
    // Pass current zoom to handle position calculator
    const pos = getNodePortPosition(node, handleId, type, isExpanded, zoom);
    
    let x = node.x + pos.x;
    let y = node.y + pos.y;

    // Apply offset correction for Expanded nodes (visual CSS transform shift)
    if (isExpanded) {
        const normalWidth = getNodeWidth(node, false);
        const expandedWidth = 600; // Matches nodeUtils.ts
        const deltaW = expandedWidth - normalWidth;
        
        // NodeItem applies transform: translate(-deltaW/2, -20px)
        x -= deltaW / 2;
        y -= 20;
    }

    return { x, y };
};

// Shared Width Logic - Single Source of Truth
export const getNodeWidth = (node: WorkflowNode, isExpanded: boolean): number => {
    // Defensive check
    if (!node || !node.data) return 280;

    // Optimized Sticky Note Width - SQUARE
    if (node.type === 'sticky_note') {
        return isExpanded ? 400 : 220;
    }

    if (isExpanded) {
        // Square expansion for Text Input nodes
        if (node.type === 'text_input') {
            return 400; 
        }
        return 600;
    }

    // Special compact width for Reference Asset nodes
    if (node.type === 'image_input') {
        return 220;
    }

    // Media nodes have dynamic widths based on aspect ratio
    // Removed 'image_input' from this list to use the specific width above
    if (['video_gen', 'image_gen', 'video_composer', 'preview', 'image_matting', 'pro_icon_gen', 'pro_art_director'].includes(node.type)) {
        // Pro Nodes default width
        if (node.type === 'pro_icon_gen' || node.type === 'pro_art_director') {
            return 400;
        }

        const ratio = node.data.settings?.aspectRatio;
        if (ratio === '9:16' || ratio === '3:4' || ratio === '2:3' || ratio === '4:5') {
             return 260; 
        } else if (ratio === '1:1') {
             return 300;
        } else {
             // 16:9, 21:9, 4:3, etc.
             return 360; 
        }
    }
    
    // Default width for text/logic nodes
    return 280;
};

export const getNodeContentHeight = (node: WorkflowNode, width: number): number => {
    // Defensive check
    if (!node || !node.data) return 100;

    if (node.type === 'video_gen') {
        const ar = node.data.settings?.aspectRatio || '16:9';
        const [w, h] = ar.split(':').map(Number);
        const ratio = (w && h) ? h/w : 9/16;
        // Add 40px for the footer bar to ensure video area maintains aspect ratio
        return (width * ratio) + 30; // Slightly reduced footer allowance
    }
    if (['image_gen'].includes(node.type)) {
        // Use dynamically calculated ratio if available
        if (node.data.settings?.imageRatio) {
            return (width / node.data.settings.imageRatio) + 30;
        }
        const ar = node.data.settings?.aspectRatio || '1:1';
        const [w, h] = ar.split(':').map(Number);
        const ratio = (w && h) ? h/w : 1;
        // Add 30px for the footer bar
        return (width * ratio) + 30;
    }
    if (['image_input', 'image_matting', 'preview'].includes(node.type)) {
        // Use dynamically calculated ratio if available (e.g. from imported image)
        if (node.data.settings?.imageRatio) {
            return width / node.data.settings.imageRatio;
        }
        const ar = node.data.settings?.aspectRatio || '1:1';
        const [w, h] = ar.split(':').map(Number);
        const ratio = (w && h) ? h/w : 1;
        return width * ratio;
    }
    if (node.type === 'sticky_note') return 300; // Increased from default
    if (node.type === 'script_agent') return 180;
    if (node.type === 'audio_gen') return 160;
    if (node.type === 'video_composer') return 160;
    if (node.type === 'pro_icon_gen' || node.type === 'pro_art_director') return 600; // Default tall for Pro Nodes
    if (node.type === 'text_input') {
        return width > 300 ? 300 : 100; // If expanded (width > 300), return 300 height for square shape
    }
    return 100;
};

 export const getNodeColor = (type: WorkflowNodeType) => {
    // Return pure black for selection outlines to match monochrome theme
    return '#000000';
};

export const createNodeObject = (type: WorkflowNodeType, x: number, y: number, customLabel?: string): WorkflowNode => {
    let label = customLabel;
    
    if (!label) {
        label = type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        // Default fallbacks if no custom label provided
        if (type === 'text_input') label = 'Prompt';
        if (type === 'image_input') label = 'Reference';
        if (type === 'image_gen') label = 'Visual Generator';
        if (type === 'video_gen') label = 'Motion Generator';
        if (type === 'sticky_note') label = 'Note';
    }

    return {
        id: Math.random().toString(36).substr(2, 9),
        type,
        x,
        y,
        data: {
            label,
            value: '',
            settings: {
                aspectRatio: AspectRatio.R_1_1, // Changed default to 1:1 for better initial card look
            }
        },
        status: 'idle'
    };
};
