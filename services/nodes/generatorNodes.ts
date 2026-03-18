
import { BaseNode, ResourceType, ResourceSubtype, ExecutionContext, PortDefinition } from "../nodeBase";
import { WorkflowNodeType, ModelType, AspectRatio, Resolution } from "../../types";
import { generateImage, generateVideo, generateSpeech } from "../generationService";

export class ImageGenNode extends BaseNode {
  type: WorkflowNodeType = 'image_gen';
  label = 'Visual Generator';

  getInputs(): PortDefinition[] {
    return [
      { id: 'prompt', label: 'Prompt', type: 'text', subtype: 'prompt' },
      { id: 'image_ref', label: 'Image Ref', type: 'image' },
      { id: 'char_ref', label: 'Character', type: 'image' }
    ];
  }

  getOutputs(): PortDefinition[] {
    return [{ id: 'image', label: 'Generated Image', type: 'image', subtype: 'image' }];
  }

  async execute(ctx: ExecutionContext): Promise<string> {
    let prompt = ctx.settings.value || "";
    // If upstream prompt is connected, use it
    if (ctx.inputs['prompt'] && typeof ctx.inputs['prompt'] === 'string') {
        prompt = ctx.inputs['prompt'];
    }
    
    console.log('[ImageGenNode] 所有输入:', Object.keys(ctx.inputs));
    console.log('[ImageGenNode] 输入详情:', Object.entries(ctx.inputs).map(([k, v]) => `${k}: ${typeof v === 'string' ? v.substring(0, 60) + '...' : typeof v}`));
    
    const hasRef = !!(ctx.inputs['image_ref'] || ctx.inputs['char_ref']);
    if (!prompt && !hasRef) {
        throw new Error("Please connect a text prompt or image reference.");
    }
    if (!prompt && hasRef) {
        prompt = "High quality image variation.";
    }

    const refImages: string[] = [];
    if (ctx.inputs['image_ref']) refImages.push(ctx.inputs['image_ref']);
    if (ctx.inputs['char_ref']) refImages.push(ctx.inputs['char_ref']);
    
    console.log('[ImageGenNode] 参考图收集:', {
        hasImageRef: !!ctx.inputs['image_ref'],
        hasCharRef: !!ctx.inputs['char_ref'],
        imageRefType: ctx.inputs['image_ref'] ? (ctx.inputs['image_ref'].substring(0, 30) + '...') : 'none',
        refCount: refImages.length
    });
    
    // We append context info to help the model distinct inputs if referenced by name
    // 注意：图片已通过 referenceImages 传递，不要把链接/文案放到 prompt 里，否则模型会把文字画到图片中

    // Handle @ References — 只收集图片到 refImages，文本引用拼到 prompt
    let contextInfo = "";
    if (ctx.references) {
        for (const [label, data] of Object.entries(ctx.references)) {
            if (typeof data !== 'string') continue;
            
            const isImage = data.startsWith('data:image') || data.startsWith('http');
            if (isImage) {
                refImages.push(data);
            } else {
                const textContent = data.length > 200 ? data.substring(0, 200) + "..." : data;
                contextInfo += `[${label}: ${textContent}] `;
            }
        }
    }
    
    const finalPrompt = prompt + (contextInfo ? '\n' + contextInfo : '');

    return generateImage({
      model: ctx.settings?.model || 'flux-1.1-pro',
      prompt: finalPrompt,
      size: ctx.settings?.size || '1024x1024',
      aspectRatio: ctx.settings?.aspectRatio, // 保留用于兼容部分模型
      referenceImages: refImages,
      resolution: ctx.settings?.resolution
    });
  }
}

export class VideoGenNode extends BaseNode {
  type: WorkflowNodeType = 'video_gen';
  label = 'Motion Generator';

  getInputs(): PortDefinition[] {
    return [
      { id: 'prompt', label: 'Prompt', type: 'text', subtype: 'prompt' },
      { id: 'start_image', label: 'Start Frame', type: 'image' },
      { id: 'end_image', label: 'End Frame', type: 'image' }
    ];
  }

  getOutputs(): PortDefinition[] {
    return [{ id: 'video', label: 'Video', type: 'video', subtype: 'video' }];
  }

  async execute(ctx: ExecutionContext): Promise<string> {
    let prompt = ctx.settings.value || ""; 
    
    const promptInput = ctx.inputs['prompt'];
    
    // Only override manual prompt if input is valid and non-empty
    if (typeof promptInput === 'string' && promptInput.trim().length > 0) {
        prompt = promptInput;
    }

    // Image Priority Logic:
    // 1. Port inputs (start_image, end_image)
    // 2. Manual settings fallback
    let startImage = ctx.inputs['start_image'];
    let endImage = ctx.inputs['end_image'];

    if (!startImage && ctx.settings?.startImageBase64) {
        startImage = ctx.settings.startImageBase64;
    }
    if (!endImage && ctx.settings?.endImageBase64) {
        endImage = ctx.settings.endImageBase64;
    }

    // Handle @ References
    if (ctx.references) {
        let refInfo = " [References: ";
        let foundFirstImage = false;
        for (const [label, data] of Object.entries(ctx.references)) {
            if (typeof data !== 'string') continue;

            const isImage = data.startsWith('data:image') || data.startsWith('http');
            if (isImage) {
                refInfo += `@${label} is an image reference. `;
                // If no start image yet, use this one
                if (!startImage && !foundFirstImage) {
                    startImage = data;
                    foundFirstImage = true;
                    refInfo += "(Used as Start Frame) ";
                }
            } else {
                const textContent = data.length > 200 ? data.substring(0, 200) + "..." : data;
                refInfo += `@${label}: "${textContent}". `;
            }
        }
        refInfo += "] ";
        prompt += refInfo;
    }

    if (!prompt && !startImage && !endImage) {
        throw new Error("Video generation requires a text prompt or a start/end image.");
    }

    return generateVideo({
      model: ctx.settings?.model,
      prompt: prompt,
      aspectRatio: ctx.settings?.aspectRatio,
      durationSeconds: ctx.settings?.duration || 4,
      resolution: ctx.settings?.resolution,
      startImage: startImage,
      endImage: endImage,
      // @ts-ignore
      withAudio: ctx.settings?.withAudio
    });
  }
}

export class AudioGenNode extends BaseNode {
  type: WorkflowNodeType = 'audio_gen';
  label = 'Audio Emitter';

  getInputs(): PortDefinition[] {
    return [{ id: 'text', label: 'Text', type: 'text' }];
  }

  getOutputs(): PortDefinition[] {
    return [{ id: 'audio', label: 'Audio', type: 'audio', subtype: 'audio' }];
  }

  async execute(ctx: ExecutionContext): Promise<string> {
    const text = ctx.inputs['text'] || ctx.settings.value;
    if (!text) throw new Error("Audio generation requires text input.");

    return generateSpeech({
      text: text,
      voice: ctx.settings?.voice || 'Kore',
      model: ctx.settings?.model,
      type: ctx.settings?.audioType
    });
  }
}
