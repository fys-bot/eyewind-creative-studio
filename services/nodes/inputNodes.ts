
import { BaseNode, ResourceType, ResourceSubtype, ExecutionContext, PortDefinition } from "../nodeBase";
import { WorkflowNodeType } from "../../types";

export class TextInputNode extends BaseNode {
  type: WorkflowNodeType = 'text_input';
  label = 'Prompt Input';

  getInputs(): PortDefinition[] {
    return []; 
  }

  getOutputs(): PortDefinition[] {
    return [{ id: 'output', label: 'Text', type: 'text', subtype: 'prompt' }];
  }

  async execute(context: ExecutionContext): Promise<string> {
    return context.settings?.value || '';
  }
}

export class ImageInputNode extends BaseNode {
  type: WorkflowNodeType = 'image_input';
  label = 'Reference Asset';

  getInputs(): PortDefinition[] {
    return [];
  }

  getOutputs(): PortDefinition[] {
    return [{ id: 'output', label: 'Image', type: 'image', subtype: 'image' }];
  }

  async execute(context: ExecutionContext): Promise<string> {
    return context.settings?.value || '';
  }
}

export class CharacterRefNode extends BaseNode {
  type: WorkflowNodeType = 'character_ref';
  label = 'Character IP';

  getInputs(): PortDefinition[] {
    return [];
  }

  getOutputs(): PortDefinition[] {
    return [{ id: 'output', label: 'Char Sheet', type: 'image', subtype: 'ref' }];
  }

  async execute(context: ExecutionContext): Promise<string> {
    return context.settings?.value || '';
  }
}
