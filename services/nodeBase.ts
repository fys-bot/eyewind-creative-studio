
import { WorkflowNodeType } from "../types";
import { ResourceType, ResourceSubtype } from "../types/resource";

// --- 核心类型定义 ---

// export enum DataType {
//   STRING = 'STRING',
//   IMAGE = 'IMAGE', // Base64 or URL
//   VIDEO = 'VIDEO', // URL
//   AUDIO = 'AUDIO', // URL
//   ANY = 'ANY',     // 通用类型 (通常用于复杂对象的透传)
//   NONE = 'NONE'    // 触发型/无数据
// }

export type { ResourceType, ResourceSubtype };

export interface PortDefinition {
  id: string;      // 端口唯一标识 (如 'prompt', 'reference')
  label: string;   // UI显示名称
  type: ResourceType;  // 数据类型
  subtype?: ResourceSubtype; // 细分类型
}

export interface ExecutionContext {
  inputs: Record<string, any>; // 上游传入的数据，key 为端口 ID
  settings: any;               // 节点自身的配置 (UI 面板里的设置)
  globalApiKey?: string;       // 全局配置
  inputLabels?: Record<string, string>; // 上游节点的名称映射，用于 Prompt 增强
  references?: Record<string, any>;     // 提示词中 @ 引用解析出的数据
}

// --- 节点基类 ---

export abstract class BaseNode {
  abstract type: WorkflowNodeType;
  abstract label: string;

  abstract getInputs(): PortDefinition[];
  abstract getOutputs(): PortDefinition[];
  abstract execute(context: ExecutionContext): Promise<any>;

  validateConnection(targetPortId: string, sourceType: ResourceType, sourceSubtype?: ResourceSubtype): boolean {
    const input = this.getInputs().find(p => p.id === targetPortId);
    if (!input) return false;
    
    // 0. ANY wildcard (Debug/Log nodes)
    if (input.type === 'any' || sourceType === 'any') return true;

    // 1. Primary Type Match
    if (input.type !== sourceType) return false;

    // 2. Subtype Match (if defined on input port)
    // If input port specifies a subtype, source must match it (or be compatible)
    if (input.subtype && sourceSubtype && input.subtype !== sourceSubtype) {
        return false;
    }
    
    return true;
  }
}
