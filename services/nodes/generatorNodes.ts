
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
    
    const hasRef = !!(ctx.inputs['image_ref'] || ctx.inputs['char_ref']);
    if (!prompt && !hasRef) {
        throw new Error("Please connect a text prompt or image reference.");
    }
    if (!prompt && hasRef) {
        prompt = "High quality image variation.";
    }

    // --- Prompt Enhancement with Source Labels ---
    const labels = ctx.inputLabels || {};
    const refLabel = labels['image_ref'];
    const charLabel = labels['char_ref'];
    let contextInfo = "";

    const refImages: string[] = [];
    if (ctx.inputs['image_ref']) refImages.push(ctx.inputs['image_ref']);
    if (ctx.inputs['char_ref']) refImages.push(ctx.inputs['char_ref']);
    
    // We append context info to help the model distinct inputs if referenced by name
    if (refLabel || charLabel) {
        contextInfo += " [Context: ";
        if (refLabel) contextInfo += `The 1st image is '${refLabel}'. `;
        if (charLabel) contextInfo += `The 2nd image is '${charLabel}'. `;
        contextInfo += "] ";
    }

    // Handle @ References
    if (ctx.references) {
        contextInfo += " [References: ";
        for (const [label, data] of Object.entries(ctx.references)) {
            if (typeof data !== 'string') continue;
            
            const isImage = data.startsWith('data:image') || data.startsWith('http');
            if (isImage) {
                refImages.push(data);
                contextInfo += `@${label} is image #${refImages.length}. `;
            } else {
                // Truncate if too long
                const textContent = data.length > 200 ? data.substring(0, 200) + "..." : data;
                contextInfo += `@${label} content: "${textContent}". `;
            }
        }
        contextInfo += "] ";
    }
    
    const finalPrompt = contextInfo + prompt;

    return generateImage({
      model: ctx.settings?.model || ModelType.GEMINI_FLASH_IMAGE,
      prompt: finalPrompt,
      aspectRatio: ctx.settings?.aspectRatio || AspectRatio.R_16_9,
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
