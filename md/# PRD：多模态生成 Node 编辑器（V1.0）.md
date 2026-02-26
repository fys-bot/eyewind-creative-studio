# PRD：多模态生成 Node 编辑器（V1.0）  
  
> 声明式 · 多模态 · 可生产化    
> 适用于：图片 / 视频 / 音频生成的 Node 图形化编辑器  
  
---  
  
## 1. 产品背景与目标  
  
### 1.1 背景  
  
随着图像、视频、音频大模型能力快速提升，传统的 **线性流程式 Node（Prompt → 生图 → 生视频）** 已无法满足以下需求：  
  
- 多输入（首尾帧 / 多参考 / 批量）  
- 多输出（入库 / 导出 / 发布 / 投放）  
- 高复用（Prompt / Preset / 资产）  
- 生产化（版本管理 / 批量 / 审计）  
  
---  
  
### 1.2 产品目标  
  
构建一个 **声明式、多模态、可生产化** 的 Node 编辑器，用于：  
  
- 图片生成  
- 视频生成  
- 音频生成  
- 批量素材生产与交付  
  
---  
  
### 1.3 核心设计理念  
  
- **Node 是能力声明，而不是流程步骤**  
- **连线表示资源依赖，而不是执行顺序**  
- **Resource 是系统唯一流动对象**  
  
---  
  
## 2. 用户画像  
  
| 用户角色 | 核心诉求 |  
|--------|--------|  
| 设计师 | 快速试效果、可复用模板 |  
| 运营 / 投放 | 批量生产素材、快速交付 |  
| AI 工程师 | 参数可控、模型可切换 |  
| 产品经理 | 流程清晰、结果稳定 |  
  
---  
  
## 3. 核心概念定义  
  
### 3.1 Resource（资源）  
  
Resource 是系统中唯一可在 Node 之间流转的对象，所有 Node 的输入与输出必须是 Resource。  
  
#### Resource 类型定义  
  
- `TextResource`（提示词 / 脚本 / 歌词）  
- `ImageResource`（图片 / 首帧 / 参考图）  
- `VideoResource`（视频素材 / 生成视频）  
- `AudioResource`（音频 / 配音 / BGM）  
- `MaskResource`（蒙版）  
- `ConfigResource`（参数 / 预设）  
- `DatasetResource`（批量资源集合）  
- `JsonResource`（元信息）  
  
---  
  
## 4. Node 类型总览  
  
### 4.1 Node 分类  
  
| 分类 | 说明 |  
|---|---|  
| 输入 Node | 引入外部资源 |  
| 生成 Node | 调用模型生成资源 |  
| 预设 Node | 提供参数 / 风格 / 模型 |  
| 输出 Node | 资源交付与发布 |  
  
---  
  
## 5. 输入 Node 设计  
  
### 5.1 Prompt Node  
  
**功能**  
- 创建与复用提示词  
  
**输入**  
- 无  
  
**输出**  
- `TextResource (prompt)`  
  
**UI 要求**  
- 多段输入  
- 支持变量占位（`{{subject}}`）  
- 支持语言标记  
  
---  
  
### 5.2 Media Input Node（Image / Video / Audio）  
  
**功能**  
- 上传或从资产库选择媒体资源  
  
**输出**  
- 对应类型的 Resource  
  
**特性**  
- 多选  
- 拖拽排序  
- 自动解析元信息（分辨率 / 时长）  
  
---  
  
### 5.3 Dataset Node（批量输入）  
  
**功能**  
- 批量资源输入，用于批量生成  
  
**输出**  
- `DatasetResource`  
  
**典型场景**  
- 多商品图  
- 多 Prompt 生图  
- 多 SKU 视频  
  
---  
  
## 6. 生成 Node 设计（核心）  
  
### 6.1 Image Generation Node  
  
**功能**  
- 调用图像生成模型生成图片  
  
#### 输入 Ports（全部可选）  
- Prompt（TextResource）  
- Ref Image（ImageResource / DatasetResource）  
- Mask（MaskResource）  
- Config（ConfigResource）  
  
#### 输出 Ports  
- Image（ImageResource）  
- Meta（JsonResource）  
  
#### UI 配置项  
- 模型选择  
- 分辨率  
- 生成数量  
- 随机种子  
- 高级参数（折叠）  
  
---  
  
### 6.2 Video Generation Node  
  
**功能**  
- 调用视频生成模型  
  
#### 输入 Ports  
- Prompt（TextResource）  
- First Frame（ImageResource）  
- Last Frame（ImageResource）  
- Ref Video（VideoResource）  
- Config（ConfigResource）  
  
#### 输出 Ports  
- Video（VideoResource）  
- Thumbnail（ImageResource）  
- Meta（JsonResource）  
  
**说明**  
- 首尾帧均为可选  
- 无首帧也可生成视频  
- 不强依赖生图 Node  
  
---  
  
### 6.3 Audio Generation Node  
  
**功能**  
- 文生音 / 歌曲 / 配音生成  
  
#### 输入 Ports  
- Prompt / Lyrics（TextResource）  
- Ref Audio（AudioResource）  
- Config（ConfigResource）  
  
#### 输出 Ports  
- Audio（AudioResource）  
- Meta（JsonResource）  
  
---  
  
## 7. 预设 Node（Preset Nodes）  
  
### 7.1 Preset 类型  
  
- Model Preset  
- Style Preset  
- Ratio Preset  
- Quality Preset  
- Safety / Policy Preset  
  
**输出**  
- `ConfigResource`  
  
**特性**  
- 可被多个生成 Node 共享  
- 支持锁定 / 只读  
  
---  
  
## 8. 输出 Node 设计  
  
### 8.1 Save Asset Node（入库）  
  
**功能**  
- 将生成结果保存到资产库  
  
**输入**  
- 任意 Resource  
  
**特性**  
- 自动版本管理  
- 记录来源 Graph / Prompt / 模型  
  
---  
  
### 8.2 Export Node（导出）  
  
**功能**  
- 下载或打包导出生成结果  
  
**支持**  
- 单文件导出  
- ZIP 批量导出  
  
---  
  
### 8.3 Publish / Share Node  
  
**功能**  
- 发布至项目或生成分享链接  
  
---  
  
### 8.4 Push to External Node  
  
**功能**  
- 通过 Webhook / API 推送到外部系统（投放 / 游戏 / 电商）  
  
---  
  
## 9. 连线与类型校验规则  
  
### 9.1 类型约束  
  
- 仅允许同类型 Resource 连线  
- Dataset → 生成 Node = 自动进入批量模式  
  
---  
  
### 9.2 多输入合并策略  
  
- `concat`  
- `weighted`  
- `template-slot`（默认）  
  
---  
  
## 10. 执行与调度逻辑  
  
### 10.1 执行方式  
  
- 单 Node 手动运行  
- 自动回溯依赖  
- 支持并行与批量执行  
  
### 10.2 执行流程  
  
1. 用户点击生成 Node 的 Run  
2. 系统回溯所有依赖 Resource  
3. 调用模型执行生成  
4. 输出 Node 自动触发（可配置）  
  
---  
  
## 11. 资产与版本管理  
  
- 每次生成产生唯一 Job ID  
- 记录：  
  - Prompt  
  - 模型  
  - 参数  
  - 输入资源  
- 支持历史复用与回滚  
  
---  
  
## 12. 非功能性需求  
  
### 12.1 性能  
  
- 支持 50+ Node 的复杂 Graph  
- 批量任务异步执行  
  
### 12.2 扩展性  
  
- 新模型无需修改旧 Node  
- 新 Resource 类型可平滑扩展  
  
### 12.3 权限系统  
  
- Graph / Asset / Preset 分级权限  
- 支持团队协作  
  
---  
  
## 13. V1 不做范围（明确砍掉）  
  
- 不做强制线性流程  
- 不做 Node 内部互相调用  
- 不做 Prompt 强制依赖  
  
---  
  
## 14. 验收标准（Success Metrics）  
  
- 无 Prompt 也可生图 / 生视频  
- 一个 Prompt 可同时连接多个生成 Node  
- 视频 Node 可独立使用首尾帧  
- 生成结果可入库 / 导出 / 发布  
  
---  
  
## 15. 后续版本方向（V1.1+）  
  
- 条件 Node（if / loop）  
- 自动化流水线  
- 质量评估 Node  
- 成本 / Token 统计 Node  
  
---  
