
import { BaseNode, ResourceType, ResourceSubtype, ExecutionContext, PortDefinition } from "../nodeBase";
import { WorkflowNodeType } from "../../types";

export class PreviewNode extends BaseNode {
  type: WorkflowNodeType = 'preview';
  label = 'Preview / Pass';

  getInputs(): PortDefinition[] {
    return [{ id: 'input', label: 'Input', type: 'any' }];
  }

  getOutputs(): PortDefinition[] {
    // Passthrough output
    return [{ id: 'output', label: 'Passthrough', type: 'any' }];
  }

  async execute(ctx: ExecutionContext): Promise<any> {
    // Return input as is
    return ctx.inputs['input'] || ctx.settings.value;
  }
}

export class ImageReceiverNode extends BaseNode {
  type: WorkflowNodeType = 'image_receiver';
  label = '图片接收器 (Receiver)';

  getInputs(): PortDefinition[] {
    return [{ id: 'input', label: 'Image In', type: 'image' }];
  }

  getOutputs(): PortDefinition[] {
    // End of line, no output usually, but can pass through
    return [{ id: 'output', label: 'Passthrough', type: 'image' }];
  }

  async execute(ctx: ExecutionContext): Promise<any> {
    const input = ctx.inputs['input'];
    // Just pass it through, the UI will display it
    return input || null;
  }
}

export class StickyNoteNode extends BaseNode {
  type: WorkflowNodeType = 'sticky_note';
  label = 'Note';

  getInputs(): PortDefinition[] {
    return []; // No inputs
  }

  getOutputs(): PortDefinition[] {
    return []; // No outputs
  }

  async execute(ctx: ExecutionContext): Promise<string> {
    // Returns its text content
    return ctx.settings.value || '';
  }
}

export class ImageCompareNode extends BaseNode {
  type: WorkflowNodeType = 'image_compare';
  label = 'Compare';

  getInputs(): PortDefinition[] {
    return [
        { id: 'before', label: 'Before', type: 'image' },
        { id: 'after', label: 'After', type: 'image' }
    ];
  }

  getOutputs(): PortDefinition[] {
    // Passthrough After
    return [{ id: 'output', label: 'After', type: 'image' }];
  }

  async execute(ctx: ExecutionContext): Promise<any> {
    const before = ctx.inputs['before'];
    const after = ctx.inputs['after'];
    
    // In a real app, we would return a structure that the UI renders as a slider.
    // For now, we pass 'after' so the flow continues, 
    // but we might store 'before' in a side-channel or just rely on the UI to see inputs.
    return after || before || '';
  }
}
