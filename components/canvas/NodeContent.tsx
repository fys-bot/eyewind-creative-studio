
import React from 'react';
import { AppSettings, WorkflowNode } from '../../types';
import { NodeViewProps } from './nodes/nodeViewUtils';

// Import Views
import { VideoGenView, VideoComposerView } from './nodes/VideoViews';
import { ImageGenView, ImageInputView, PreviewView, CharacterRefView } from './nodes/ImageViews';
import { TextInputView, ScriptAgentView, AudioGenView } from './nodes/TextAudioViews';
import { StickyNoteView } from './nodes/UtilityViews';
import { ImageMattingView, InpaintingView, ImageUpscaleView } from './nodes/EffectViews';
import { ProNodeView } from './nodes/ProNodeView';

interface NodeContentProps {
    node: WorkflowNode;
    isExpanded: boolean;
    layoutK: number;
    t: any;
    onUpdateData: (id: string, data: any) => void;
    contentHeight: number;
    borderRadius: number;
    zoom: number; // Added zoom prop
    settings?: AppSettings; // Added settings prop
    onStartDrag?: (id: string) => void; // Optional drag handler for Pro nodes
    onDelete?: (id: string) => void; // Optional delete handler
    onSelect?: (id: string, event?: React.MouseEvent) => void;
    onToggleExpand?: (id: string) => void;
    shellProvided?: boolean; // For NodePro: outer shell exists
}

export const NodeContent: React.FC<NodeContentProps> = (props) => {
    const { node } = props;
    // Cast props to NodeViewProps, assuming NodeViewProps includes the optional handlers if needed
    // or we extend NodeViewProps in the future. For now, ProNodeView will access them from props directly.
    const viewProps: any = props; 

    switch (node.type) {
        // Video Nodes
        case 'video_gen':
            return <VideoGenView {...viewProps} />;
        case 'video_composer':
            return <VideoComposerView {...viewProps} />;
        
        // Image Nodes
        case 'preview':
        case 'image_receiver': // Use PreviewView for ImageReceiver as well
            return <PreviewView {...viewProps} />;
        case 'image_input':
            return <ImageInputView {...viewProps} />;
        case 'character_ref':
            return <CharacterRefView {...viewProps} />;
        case 'image_gen':
            return <ImageGenView {...viewProps} />;
        case 'image_matting':
            return <ImageMattingView {...viewProps} />;
        case 'image_upscale':
            return <ImageUpscaleView {...viewProps} />;
        
        // Text & Audio Nodes
        case 'text_input':
            return <TextInputView {...viewProps} />;
        case 'script_agent':
            return <ScriptAgentView {...viewProps} />;
        case 'audio_gen':
            return <AudioGenView {...viewProps} />;
            
        // Utility
        case 'sticky_note':
            return <StickyNoteView {...viewProps} />;
            
        // Pro Nodes
        case 'pro_icon_gen':
        case 'pro_art_director':
            return <ProNodeView {...viewProps} />;
            
        // Icon Generator Inputs
        case 'icon_prompt':
            return <TextInputView {...viewProps} />; // Reuse TextInputView for now
        case 'icon_ref_image':
            return <ImageInputView {...viewProps} />; // Reuse ImageInputView for now

        default:
            return null;
    }
};
