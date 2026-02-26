
import { BaseNode, ResourceType, ResourceSubtype, ExecutionContext, PortDefinition } from "../nodeBase";
import { WorkflowNodeType } from "../../types";

export class VideoComposerNode extends BaseNode {
  type: WorkflowNodeType = 'video_composer';
  label = 'Media Composer';

  getInputs(): PortDefinition[] {
    return [
        { id: 'clips', label: 'Clips', type: 'video' },
        { id: 'audio', label: 'Audio', type: 'audio' }
    ];
  }

  getOutputs(): PortDefinition[] {
    return [{ id: 'final', label: 'Composition', type: 'video', subtype: 'video' }];
  }

  async execute(ctx: ExecutionContext): Promise<{ outputResult: string, outputList: string[], audioTrack?: string }> {
    const clips = Array.isArray(ctx.inputs['clips']) ? ctx.inputs['clips'] : (ctx.inputs['clips'] ? [ctx.inputs['clips']] : []);
    const audio = ctx.inputs['audio']; // 获取音频输入
    
    if (clips.length === 0) throw new Error("Connect at least one video clip.");

    await new Promise(r => setTimeout(r, 1500));
    
    // 这里我们简单地返回第一个视频作为封面，并透传音频轨道信息
    // 实际应用中，后端会进行混流合成
    return {
        outputResult: clips[0],
        outputList: clips,
        audioTrack: audio
    };
  }
}
