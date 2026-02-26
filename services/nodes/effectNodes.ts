import { BaseNode, ResourceType, ResourceSubtype, ExecutionContext, PortDefinition } from "../nodeBase";
import { WorkflowNodeType, ModelType, AspectRatio, Resolution } from "../../types";
import { generateImage, generateVideo } from "../generationService";

// --- 智能抠图节点 ---
export class ImageMattingNode extends BaseNode {
  type: WorkflowNodeType = 'image_matting';
  label = 'Smart Matting';

  getInputs(): PortDefinition[] {
    return [{ id: 'input', label: 'Image', type: 'image' }];
  }

  getOutputs(): PortDefinition[] {
    return [{ id: 'image', label: 'Cutout', type: 'image' }];
  }

  async execute(ctx: ExecutionContext): Promise<string> {
    const inputImage = ctx.inputs['input'] || ctx.settings.value;
    if (!inputImage) throw new Error("Requires an image input.");

    // Simulation for MVP:
    // In a real app, use @imgly/background-removal (Client) or rembg (Server).
    // Here we use Gemini to "simulate" a perfect cutout generation 
    // or just return the image if it's already processed, but we'll re-generate 
    // it with a prompt to force a white/clean background which is easier to mat.
    
    // "Isolate subject, pure white background, no shadows."
    return generateImage({
        model: ModelType.GEMINI_FLASH_IMAGE,
        prompt: "Isolate the main character/object from this image. Place it on a pure solid #00FF00 green screen background for chroma keying. High precision edges.",
        aspectRatio: AspectRatio.R_1_1,
        referenceImages: [inputImage]
    });
  }
}

// --- Color Grade Node (LUTs / Cinematic) ---
export class ColorGradeNode extends BaseNode {
  type: WorkflowNodeType = 'color_grade';
  label = 'Color Grade';

  getInputs(): PortDefinition[] {
    return [
        { id: 'media', label: 'Image/Video', type: 'any' } // Accepts Image or Video
    ];
  }

  getOutputs(): PortDefinition[] {
    return [{ id: 'media', label: 'Graded', type: 'any' }];
  }

  async execute(ctx: ExecutionContext): Promise<string> {
    const input = ctx.inputs['media'] || ctx.settings.value;
    if (!input) throw new Error("Requires media input.");
    
    // In a real implementation, this would apply a LUT using WebGL or FFmpeg.
    // For MVP, we pass the original media but mark it (in metadata ideally) 
    // or just return it as a "Pass through" if we can't process pixels client-side easily without canvas.
    // OR: We use the AI to "re-style" it if it's an image.
    
    // Let's assume this is a logical node for now that will be rendered with CSS filters in the Preview node.
    // But since execute needs to return a string (url), we return the input.
    // The Preview component needs to read the "lut" setting from this node to apply filter.
    
    // For AI-based grading (Re-lighting):
    /*
    return generateImage({
        model: ModelType.GEMINI_FLASH_IMAGE,
        prompt: " cinematic color grading, teal and orange, moody lighting, preserve original content structure",
        referenceImages: [input]
    });
    */
    
    return input; // Pass-through for now, Effect is visual only in Preview
  }
}

// --- Image Upscale Node ---
export class ImageUpscaleNode extends BaseNode {
  type: WorkflowNodeType = 'image_upscale';
  label = '4K Upscaler';

  getInputs(): PortDefinition[] {
    return [{ id: 'image', label: 'Image', type: 'image' }];
  }

  getOutputs(): PortDefinition[] {
    return [{ id: 'image', label: 'Upscaled', type: 'image', subtype: 'image' }];
  }

  async execute(ctx: ExecutionContext): Promise<string> {
    const image = ctx.inputs['image'] || ctx.settings.value;
    if (!image) throw new Error("Requires an image to upscale.");

    // Simulation:
    // "Upscale this image"
    return generateImage({
        model: ModelType.GEMINI_PRO_IMAGE,
        prompt: "High resolution, 4k, highly detailed, sharp focus. Preserve original content structure.",
        aspectRatio: AspectRatio.R_1_1,
        referenceImages: [image]
    });
  }
}
