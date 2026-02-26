# 多模态大模型 API 连接器清单（官方文档版）

> 用途：Connector Registry / 能力市场 / AI Studio 接入
>
> 覆盖：文本 / 图片 / 音频 / 视频
>
> 特点：**官方 API + 官方文档 + 能力标记清晰**，可直接入库

---

## 一、Google（Gemini / Imagen / Veo）

**Provider**：Google  
**官网**：https://ai.google.dev  
**云控制台**：https://cloud.google.com/vertex-ai

| API 名称 | 文本 | 图片 | 音频 | 视频 | 主要能力 | 官方文档 |
|---|---|---|---|---|---|---|
| Gemini API | ✅ | ✅ | ✅ | ✅（理解） | 多模态推理 / 1M+ 上下文 | https://ai.google.dev/docs |
| Gemini Image（Nano Banana） | ❌ | ✅ | ❌ | ❌ | 图片理解 / 编辑 / 融合 | https://ai.google.dev/docs/image |
| Imagen 3 | ❌ | ✅ | ❌ | ❌ | 文生图 / 商业安全 | https://cloud.google.com/vertex-ai/docs/generative-ai/image |
| Veo | ❌ | ❌ | ❌ | ✅ | 文生视频 | https://cloud.google.com/vertex-ai/docs/generative-ai/video |
| Gemini Audio | ❌ | ❌ | ✅ | ❌ | 语音理解 | https://ai.google.dev/docs/audio |

---

## 二、OpenAI（GPT / Image / Audio / Video）

**Provider**：OpenAI  
**官网**：https://openai.com

| API 名称 | 文本 | 图片 | 音频 | 视频 | 主要能力 | 官方文档 |
|---|---|---|---|---|---|---|
| Responses API | ✅ | ✅ | ✅ | ❌ | 通用多模态 | https://platform.openai.com/docs |
| Images API | ❌ | ✅ | ❌ | ❌ | 文生图 / 编辑 | https://platform.openai.com/docs/guides/images |
| Audio API | ❌ | ❌ | ✅ | ❌ | STT / TTS | https://platform.openai.com/docs/guides/audio |
| Sora API | ❌ | ❌ | ❌ | ✅ | 文生视频 | https://platform.openai.com/docs/guides/video |

---

## 三、阿里云（通义千问 / 万相）

**Provider**：Alibaba Cloud  
**平台**：DashScope

| API 名称 | 文本 | 图片 | 音频 | 视频 | 主要能力 | 官方文档 |
|---|---|---|---|---|---|---|
| Qwen API | ✅ | ❌ | ❌ | ❌ | 文本推理 | https://help.aliyun.com/zh/dashscope |
| Qwen-VL | ✅ | ✅ | ❌ | ❌ | 图文理解 | https://help.aliyun.com/zh/dashscope/developer-reference/qwen-vl |
| Wanxiang（万相） | ❌ | ✅ | ❌ | ❌ | 文生图 | https://help.aliyun.com/zh/dashscope/developer-reference/text-to-image |
| Audio Generation | ❌ | ❌ | ✅ | ❌ | TTS / 语音 | https://help.aliyun.com/zh/dashscope/developer-reference/audio-generation |

---

## 四、字节跳动（火山引擎 / 豆包）

**Provider**：ByteDance  
**平台**：Volcengine

| API 名称 | 文本 | 图片 | 音频 | 视频 | 主要能力 | 官方文档 |
|---|---|---|---|---|---|---|
| Doubao API | ✅ | ❌ | ❌ | ❌ | 通用大模型 | https://www.volcengine.com/docs/82379 |
| Doubao-Vision | ✅ | ✅ | ❌ | ❌ | 图像理解 | https://www.volcengine.com/docs/82379/1263271 |
| Image Generation | ❌ | ✅ | ❌ | ❌ | 文生图 | https://www.volcengine.com/docs/6793 |
| Video Generation | ❌ | ❌ | ❌ | ✅ | 文生视频 | https://www.volcengine.com/docs/82379/1263274 |
| Speech API | ❌ | ❌ | ✅ | ❌ | 语音识别 / 合成 | https://www.volcengine.com/docs/6561 |

---

## 五、腾讯（混元）

**Provider**：Tencent Cloud

| API 名称 | 文本 | 图片 | 音频 | 视频 | 主要能力 | 官方文档 |
|---|---|---|---|---|---|---|
| Hunyuan LLM | ✅ | ❌ | ❌ | ❌ | 文本生成 | https://cloud.tencent.com/document/product/1729 |
| Hunyuan Vision | ✅ | ✅ | ❌ | ❌ | 图像理解 | https://cloud.tencent.com/document/product/1729/105701 |
| Image Generation | ❌ | ✅ | ❌ | ❌ | 文生图 | https://cloud.tencent.com/document/product/1729/105698 |
| Video Generation | ❌ | ❌ | ❌ | ✅ | 文生视频 | https://cloud.tencent.com/document/product/1729/105706 |
| Speech API | ❌ | ❌ | ✅ | ❌ | 语音服务 | https://cloud.tencent.com/document/product/1093 |

---

## 六、百度（文心）

**Provider**：Baidu AI Cloud

| API 名称 | 文本 | 图片 | 音频 | 视频 | 主要能力 | 官方文档 |
|---|---|---|---|---|---|---|
| ERNIE API | ✅ | ❌ | ❌ | ❌ | 文本生成 | https://cloud.baidu.com/doc/WENXINWORKSHOP |
| ERNIE-ViLG | ❌ | ✅ | ❌ | ❌ | 文生图 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/ilke6djn5 |
| Speech API | ❌ | ❌ | ✅ | ❌ | 语音识别 | https://cloud.baidu.com/doc/SPEECH |

---

## 七、海外企业级补充

| Provider | 说明 | 官方文档 |
|---|---|---|
| Anthropic（Claude） | 长文本 / 企业可靠性 | https://docs.anthropic.com |
| Amazon Bedrock | 多模型市场 | https://docs.aws.amazon.com/bedrock |
| Azure OpenAI | 企业合规 OpenAI | https://learn.microsoft.com/azure/ai-services/openai |

---

## 八、推荐 Connector 字段 Schema（示例）

```json
{
  "provider": "Google",
  "api_name": "Gemini Image",
  "modalities": ["image"],
  "supports_text": false,
  "supports_image": true,
  "supports_audio": false,
  "supports_video": false,
  "capabilities": ["image_understanding", "image_edit", "image_fusion"],
  "docs": "https://ai.google.dev/docs/image",
  "type": "API"
}
```

---

> 本文档适合直接用于：
> - AI Studio / Connector Market
> - 内部平台 API 接入白皮书
> - 产品 & 研发对齐文档

