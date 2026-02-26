
import { BaseNode, ResourceType, ResourceSubtype, ExecutionContext, PortDefinition } from "../nodeBase";
import { WorkflowNodeType, ModelType } from "../../types";
import { generateScript } from "../generationService";
import { googleGenerateText } from "../geminiService";

// --- Script/Story Agent ---
export class ScriptAgentNode extends BaseNode {
  type: WorkflowNodeType = 'script_agent';
  label = 'Story Writer';

  getInputs(): PortDefinition[] {
    return [
        { id: 'concept', label: 'Core Concept', type: 'text' }
    ];
  }

  getOutputs(): PortDefinition[] {
    return [{ id: 'script', label: 'Script', type: 'text', subtype: 'script' }];
  }

  async execute(ctx: ExecutionContext): Promise<{ outputResult: string, outputList: string[] }> {
    // If we have a chat result and no new input, maybe return that?
    // For now, let's keep the batch behavior: if input provided, generate new script.
    
    let concept = ctx.inputs['concept'] || ctx.settings.value || ctx.settings.prompt || "Describe a simple creative concept to generate content.";

    // Append References
    if (ctx.references) {
        let refInfo = "\n[References Context]:\n";
        for (const [label, data] of Object.entries(ctx.references)) {
            if (typeof data === 'string') {
                const textContent = data.startsWith('data:') ? `(Image/Data: ${label})` : data;
                 // Truncate if too long
                 const safeText = textContent.length > 500 ? textContent.substring(0, 500) + "..." : textContent;
                refInfo += `@${label}: ${safeText}\n`;
            }
        }
        concept += refInfo;
    }

    // 获取角色设定，默认为 director
    const role = ctx.settings.role || 'director';

    const scenes = await generateScript(concept, ctx.settings?.model, role);
    return {
      outputResult: scenes.join('\n\n'),
      outputList: scenes
    };
  }
}

export class AiRefineNode extends BaseNode {
  type: WorkflowNodeType = 'ai_refine';
  label = 'AI Refine';

  getInputs(): PortDefinition[] {
    return [{ id: 'input', label: 'Raw Text', type: 'text' }];
  }

  getOutputs(): PortDefinition[] {
    return [{ id: 'refined', label: 'Polished', type: 'text', subtype: 'prompt' }];
  }

  async execute(ctx: ExecutionContext): Promise<{ outputResult: string }> {
     let input = ctx.inputs['input'] || ctx.settings.value;
     if (!input) throw new Error("Input text required");
     
     // Append References
     if (ctx.references) {
        let refInfo = "\n[References Context]:\n";
        for (const [label, data] of Object.entries(ctx.references)) {
             if (typeof data === 'string') {
                const textContent = data.startsWith('data:') ? `(Image/Data: ${label})` : data;
                refInfo += `@${label}: ${textContent}\n`;
            }
        }
        input += refInfo;
     }

     const prompt = `Refine this prompt for better AI generation results (Image/Video): "${input}". Return only the refined prompt text, no explanations.`;
     const result = await googleGenerateText({ model: 'gemini-3-flash-preview', prompt });
     
     return { outputResult: result };
  }
}

export class PromptTranslatorNode extends BaseNode {
  type: WorkflowNodeType = 'prompt_translator';
  label = 'Prompt EN Translator';

  getInputs(): PortDefinition[] {
    return [{ id: 'input', label: 'Prompt (Any Lang)', type: 'text' }];
  }

  getOutputs(): PortDefinition[] {
    return [{ id: 'translated', label: 'English Prompt', type: 'text', subtype: 'prompt' }];
  }

  async execute(ctx: ExecutionContext): Promise<{ outputResult: string }> {
     const input = ctx.inputs['input'] || ctx.settings.value;
     if (!input) throw new Error("Input text required");
     
     // Detect if input is Chinese, if so translate to English (best for AI), else to Chinese?
     // Or just "Translate to English" as default since most AI models prefer English.
     const prompt = `Translate the following text to English for AI Image Prompt usage. If it is already English, just refine it. Text: "${input}". Return only the translated text.`;
     const result = await googleGenerateText({ model: 'gemini-3-flash-preview', prompt });
     
     return { outputResult: result };
  }
}
