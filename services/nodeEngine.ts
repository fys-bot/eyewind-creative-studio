
import { WorkflowNodeType, WorkflowNode } from "../types";
import { getNodeContentHeight, getNodeWidth } from "../utils/nodeUtils";
import { BaseNode, ResourceType, ResourceSubtype, PortDefinition, ExecutionContext } from "./nodeBase";

// Import Node Implementations
import { TextInputNode, ImageInputNode } from "./nodes/inputNodes";
import { ScriptAgentNode } from "./nodes/agentNodes";
import { ImageGenNode, VideoGenNode, AudioGenNode } from "./nodes/generatorNodes";
import { VideoComposerNode } from "./nodes/composerNodes";
import { PreviewNode, StickyNoteNode, ImageReceiverNode } from "./nodes/utilityNodes";
import { 
  ImageMattingNode, 
  ImageUpscaleNode,
} from "./nodes/effectNodes";
import { ProIconGenNode, ProArtDirectorNode, IconPromptNode, IconRefImageNode } from "./nodes/proNodes";

// Re-export common types so other files don't break
export { BaseNode };
export type { ResourceType, ResourceSubtype, PortDefinition, ExecutionContext };

// --- 节点注册表 (Registry) ---

class NodeRegistry {
  private nodes: Map<WorkflowNodeType, BaseNode> = new Map();

  constructor() {
    this.register(new TextInputNode());
    this.register(new ImageInputNode());
    this.register(new ScriptAgentNode());
    this.register(new ImageGenNode());
    this.register(new VideoGenNode());
    this.register(new AudioGenNode());
    this.register(new VideoComposerNode());
    this.register(new PreviewNode());
    this.register(new StickyNoteNode());
    this.register(new ImageReceiverNode());
    this.register(new ImageMattingNode());
    this.register(new ImageUpscaleNode());
    this.register(new ProIconGenNode());
    this.register(new ProArtDirectorNode());
    this.register(new IconPromptNode());
    this.register(new IconRefImageNode());
  }

  private register(node: BaseNode) {
    this.nodes.set(node.type, node);
  }

  public get(type: WorkflowNodeType): BaseNode {
    const node = this.nodes.get(type);
    if (!node) {
      console.warn(`Node type ${type} not found in registry.`);
      return this.nodes.get('text_input')!; 
    }
    return node;
  }
}

export const nodeRegistry = new NodeRegistry();

// --- 辅助：计算端口位置 (布局核心) ---

export const getNodePortPosition = (
    node: WorkflowNode,
    portId: string | undefined,
    type: 'source' | 'target', // 'source' = output (Right), 'target' = input (Left)
    isExpanded: boolean = false,
    zoom: number = 1
): { x: number, y: number } => {
    const processor = nodeRegistry.get(node.type);
    const ports = type === 'source' ? processor.getOutputs() : processor.getInputs();
    
    let index = 0;
    if (portId) {
        index = ports.findIndex(p => p.id === portId);
        if (index === -1) index = 0; 
    }

    // Use shared width calculation logic
    const currentWidth = getNodeWidth(node, isExpanded);
    
    // Calculate Height
    // Media nodes have 0 padding in CSS, others have 32px
    const isMediaNode = ['video_gen', 'image_gen', 'video_composer', 'preview', 'image_input', 'image_matting', 'image_upscale', 'image_compare', 'image_receiver'].includes(node.type);
    
    // Fixed scale (1) ensures consistent geometry regardless of zoom
    const layoutScale = 1; 

    // --- Adaptive Header Logic (Must match NodeItem.tsx) ---
    // Default range [0.4, 2.5]
    const minScale = 0.4;
    const maxScale = 2.5;
    // Calculate adaptive scale based on zoom
    const adaptiveScale = Math.min(Math.max(1 / zoom, minScale), maxScale);
    
    const HEADER_HEIGHT_VISUAL = 40 * layoutScale * adaptiveScale;

    const contentH = getNodeContentHeight(node, currentWidth);
    
    // Calculate total interactive body height
    let bodyH = contentH;
    if (!isMediaNode) {
        bodyH += 32 * layoutScale; // Add padding for text nodes
    }
    
    const startY = HEADER_HEIGHT_VISUAL;
    
    // Distribute ports evenly within the body height
    const step = bodyH / (ports.length + 1);
    const top = startY + (step * (index + 1));

    return {
        x: type === 'target' ? 0 : currentWidth,
        y: top
    };
};
