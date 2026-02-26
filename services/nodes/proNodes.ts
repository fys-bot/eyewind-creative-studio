
import { BaseNode, ResourceType, ResourceSubtype, PortDefinition, ExecutionContext } from '../nodeBase';
import { NodeProEngine } from '../../components/NODEPRO/engine';
import { IconGeneratorConfig, ArtDirectorConfig } from '../../components/NODEPRO/examples';

export class ProIconGenNode extends BaseNode {
  type = 'pro_icon_gen' as const;
  label = 'NOCRA Icons';

  getInputs(): PortDefinition[] {
    // Requires Prompt and Reference Image from upstream nodes
    return [
        { id: 'prompt', label: 'Prompt', type: 'text' },
        { id: 'ref_image', label: 'Ref Image', type: 'image' }
    ];
  }

  getOutputs(): PortDefinition[] {
    // Outputs the final generated Image URL
    return [{ id: 'output', label: 'Image', type: 'image', subtype: 'image' }];
  }

  async execute(ctx: ExecutionContext): Promise<{ outputResult: string, outputList: string[] }> {
    // 1. Gather inputs (from connections + settings)
    const inputs = {
        ...ctx.settings, // Contains basic settings (count, style, etc.)
        prompt: ctx.inputs['prompt'] || ctx.settings['prompt'], // Prefer connection
        reference_image: ctx.inputs['ref_image'] || ctx.settings['reference_image'] // Prefer connection
    };

    // 2. Execute Engine
    if (!IconGeneratorConfig) throw new Error("Pro Node Config not found");
    const result = await NodeProEngine.execute(IconGeneratorConfig, inputs);

    if (!result.success) {
        throw new Error("Pro Node Execution Failed");
    }

    // 3. Return result (Image URL)
    const output = result.data as string;
    
    return {
        outputResult: output,
        outputList: [output]
    };
  }
}

// --- New Dedicated Input Nodes ---

export class IconPromptNode extends BaseNode {
    type = 'icon_prompt' as const;
    label = '提示词 (Prompt)';

    getInputs(): PortDefinition[] { return []; }
    getOutputs(): PortDefinition[] {
        return [{ id: 'output', label: 'Text', type: 'text', subtype: 'prompt' }];
    }
    async execute(ctx: ExecutionContext) {
        return { outputResult: ctx.settings?.value || '', outputList: [] };
    }
}

export class IconRefImageNode extends BaseNode {
    type = 'icon_ref_image' as const;
    label = '参考图 (Ref Image)';

    getInputs(): PortDefinition[] { return []; }
    getOutputs(): PortDefinition[] {
        return [{ id: 'output', label: 'Image', type: 'image', subtype: 'ref' }];
    }
    async execute(ctx: ExecutionContext) {
        // Assume settings.value contains the base64 or url of the uploaded image
        return { outputResult: ctx.settings?.value || '', outputList: [] };
    }
}

export class ProArtDirectorNode extends BaseNode {
  type = 'pro_art_director' as const;
  label = 'AI Art Director';

  getInputs(): PortDefinition[] {
    return [{ id: 'prompt', label: 'Rough Idea', type: 'text' }];
  }

  getOutputs(): PortDefinition[] {
    return [{ id: 'output', label: 'Art Direction', type: 'text', subtype: 'prompt' }];
  }

  async execute(ctx: ExecutionContext): Promise<{ outputResult: string, outputList: string[] }> {
    const inputs = {
        ...ctx.settings,
        prompt: ctx.inputs['prompt'] || ctx.settings['prompt']
    };

    const result = await NodeProEngine.execute(ArtDirectorConfig, inputs);
    
    if (!result.success) throw new Error("Execution Failed");

    const output = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
    return {
        outputResult: output,
        outputList: [output]
    };
  }
}
