# Node 连接逻辑技术文档（升级版 v2）

本文档说明系统中的节点（Node）连接逻辑、端口兼容性校验、快速添加自动连线策略，以及多模态/批量/预设合并等运行时规则。  
**v2 核心变化**：从 `DataType(ANY/STRING/IMAGE...)` 升级为 **Resource Type + Subtype** 的强语义类型系统，并引入 **Dataset 批量语义** 与 **Config 合并规则**。

---

## 0. 设计原则（必须统一）

1. **连线 = 资源依赖（Dependency）**，不是执行顺序（Order）。
2. **Node 是能力声明（Capability）**，输入资源是可选插槽（Slot），尤其是 Prompt。
3. **系统中唯一流动对象是 Resource**；端口只负责声明可接收/可输出的 Resource 类型集合。
4. **尽量避免 ANY**：ANY 会导致图“能连一切但无法推理”，仅允许用于 Debug/Log 等少数系统节点。

---

## 1. 核心概念与数据结构

### 1.1 资源类型系统（ResourceType / Subtype）

原 `DataType`（ANY/STRING/IMAGE）过粗，无法表达多模态与语义约束（如首帧/尾帧/歌词/蒙版/预设）。  
v2 引入 `ResourceType` 与 `ResourceSubtype`：

```typescript
// types/resource.ts

export type ResourceType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'mask'
  | 'config'
  | 'dataset'
  | 'json';

export type ResourceSubtype =
  // text
  | 'prompt' | 'script' | 'lyrics' | 'tts_text'
  // image
  | 'image' | 'ref' | 'first_frame' | 'last_frame' | 'thumb'
  // video
  | 'video' | 'ref_video'
  // audio
  | 'audio' | 'ref_audio' | 'voice'
  // mask
  | 'mask'
  // config
  | 'model' | 'style' | 'ratio' | 'quality' | 'safety' | 'gen_params'
  // json
  | 'meta' | 'payload'
  // dataset
  | 'dataset';

export type Resource = {
  id: string;
  type: ResourceType;
  subtype: ResourceSubtype;
  uri?: string;           // media asset URI
  payload?: any;          // text/config/json payload
  meta?: Record<string, any>;
};
