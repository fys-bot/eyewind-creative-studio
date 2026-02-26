# 多模态大模型 API 连接器清单（海外补充版）

> 适用场景：Connector Market / AI Studio / 多模型编排系统
>
> 原则：只收录**可对接 API / SDK / 企业级服务**，非纯 Demo

---

## 一、Anthropic（Claude）

**Provider**：Anthropic

| API 名称 | 文本 | 图片 | 音频 | 视频 | 主要能力 | 官方文档 |
|---|---|---|---|---|---|---|
| Claude API | ✅ | ✅（理解） | ❌ | ❌ | 长上下文 / 高可靠性 | https://docs.anthropic.com |

---

## 二、Meta（LLaMA / ImageBind）

**Provider**：Meta

| API / 模型 | 文本 | 图片 | 音频 | 视频 | 主要能力 | 官方文档 |
|---|---|---|---|---|---|---|
| LLaMA API | ✅ | ❌ | ❌ | ❌ | 开源 LLM 生态 | https://ai.meta.com/llama |
| ImageBind | ❌ | ✅ | ✅ | ✅ | 多模态对齐 | https://ai.meta.com/imagebind |

---

## 三、Mistral AI

**Provider**：Mistral AI

| API 名称 | 文本 | 图片 | 音频 | 视频 | 主要能力 | 官方文档 |
|---|---|---|---|---|---|---|
| Mistral API | ✅ | ❌ | ❌ | ❌ | 高性能欧洲 LLM | https://docs.mistral.ai |
| Pixtral | ✅ | ✅ | ❌ | ❌ | 视觉语言模型 | https://docs.mistral.ai/vision |

---

## 四、Stability AI

**Provider**：Stability AI

| API 名称 | 文本 | 图片 | 音频 | 视频 | 主要能力 | 官方文档 |
|---|---|---|---|---|---|---|
| SDXL / SD3 API | ❌ | ✅ | ❌ | ❌ | 图像生成 | https://platform.stability.ai/docs |
| Stable Video Diffusion | ❌ | ❌ | ❌ | ✅ | 视频生成 | https://platform.stability.ai/docs/api-reference#tag/Videos |

---

## 五、Runway

**Provider**：Runway

| API 名称 | 文本 | 图片 | 音频 | 视频 | 主要能力 | 官方文档 |
|---|---|---|---|---|---|---|
| Runway Gen API | ❌ | ✅ | ❌ | ✅ | 创意视频生成 | https://docs.runwayml.com |

---

## 六、Adobe

**Provider**：Adobe

| API 名称 | 文本 | 图片 | 音频 | 视频 | 主要能力 | 官方文档 |
|---|---|---|---|---|---|---|
| Firefly API | ❌ | ✅ | ❌ | ❌ | 商用图像生成 | https://developer.adobe.com/firefly |
| Adobe Video API | ❌ | ❌ | ❌ | ✅ | 企业视频处理 | https://developer.adobe.com/creative-cloud/apis |

---

## 七、Amazon AWS（Bedrock + AI Services）

**Provider**：Amazon Web Services

| API 名称 | 文本 | 图片 | 音频 | 视频 | 主要能力 | 官方文档 |
|---|---|---|---|---|---|---|
| Bedrock API | ✅ | ✅ | ❌ | ❌ | 多模型市场 | https://docs.aws.amazon.com/bedrock |
| Rekognition | ❌ | ✅ | ❌ | ✅ | 视觉理解 | https://docs.aws.amazon.com/rekognition |
| Transcribe | ❌ | ❌ | ✅ | ❌ | 语音识别 | https://docs.aws.amazon.com/transcribe |
| Polly | ❌ | ❌ | ✅ | ❌ | 语音合成 | https://docs.aws.amazon.com/polly |

---

## 八、Microsoft Azure AI

**Provider**：Microsoft

| API 名称 | 文本 | 图片 | 音频 | 视频 | 主要能力 | 官方文档 |
|---|---|---|---|---|---|---|
| Azure OpenAI | ✅ | ✅ | ✅ | ❌ | 企业级 OpenAI | https://learn.microsoft.com/azure/ai-services/openai |
| Azure Vision | ❌ | ✅ | ❌ | ❌ | 图像理解 | https://learn.microsoft.com/azure/ai-services/computer-vision |
| Azure Speech | ❌ | ❌ | ✅ | ❌ | 语音服务 | https://learn.microsoft.com/azure/ai-services/speech-service |

---

## 九、ElevenLabs

**Provider**：ElevenLabs

| API 名称 | 文本 | 图片 | 音频 | 视频 | 主要能力 | 官方文档 |
|---|---|---|---|---|---|---|
| ElevenLabs API | ❌ | ❌ | ✅ | ❌ | TTS / 配音 | https://docs.elevenlabs.io |

---

## 十、AssemblyAI / Deepgram

| Provider | 文本 | 图片 | 音频 | 视频 | 官方文档 |
|---|---|---|---|---|---|
| AssemblyAI | ❌ | ❌ | ✅ | ❌ | https://www.assemblyai.com/docs |
| Deepgram | ❌ | ❌ | ✅ | ❌ | https://developers.deepgram.com |

---

## 十一、视频 / 数字人补充

| Provider | 文本 | 图片 | 音频 | 视频 | 官方文档 |
|---|---|---|---|---|---|
| Synthesia | ❌ | ❌ | ❌ | ✅ | https://docs.synthesia.io |
| HeyGen | ❌ | ❌ | ❌ | ✅ | https://docs.heygen.com |
| D-ID | ❌ | ❌ | ❌ | ✅ | https://docs.d-id.com |

---

## 十二、聚合 & 推理平台（强烈推荐）

| Provider | 文本 | 图片 | 音频 | 视频 | 官方文档 |
|---|---|---|---|---|---|
| OpenRouter | ✅ | ❌ | ❌ | ❌ | https://openrouter.ai/docs |
| Replicate | ❌ | ✅ | ❌ | ✅ | https://replicate.com/docs |
| FAL.ai | ❌ | ✅ | ❌ | ✅ | https://fal.ai/docs |
| Together AI | ✅ | ❌ | ❌ | ❌ | https://docs.together.ai |

---

> 本文档为「海外优选 API 能力池」，可直接与国内表合并，形成完整 Connector Registry。

