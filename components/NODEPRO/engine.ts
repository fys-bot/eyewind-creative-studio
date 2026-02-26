
import { ProNodeConfig, ProExecutionResult } from './types';
import { googleGenerateImage, googleGenerateText } from '../../services/geminiService';
import { generateImage } from '../../services/generationService';
import { ModelType } from '../../types';

/**
 * NodePro 核心执行引擎
 * 负责解析配置、构建 System Prompt 并调用 LLM 或 Image Model
 */
export class NodeProEngine {
    
    /**
     * 执行 Pro 节点任务
     * @param config 节点配置 (定义了输入结构和规则)
     * @param inputValues 用户实际填写的输入值 (Key-Value)
     * @returns 执行结果
     */
    static async execute(config: ProNodeConfig, inputValues: Record<string, any>): Promise<ProExecutionResult> {
        try {
            // 1. 构建 Prompt 上下文
            const context = this.buildContext(config, inputValues);
            
            // 2. 组装最终 Prompt (用于生成图片描述)
            const systemInstruction = config.rules.systemPrompt
                .replace('{count}', inputValues['count'] || '1')
                .replace('{bg_color}', inputValues['bg_color'] || 'white')
                .replace('{style}', inputValues['style'] || 'casual')
                .replace('{prompt}', inputValues['prompt'] || '')
                .replace('{vfx ? "Magical glow and particles allowed" : "Clean silhouette, No external particles"}', inputValues['vfx'] ? "Magical glow and particles allowed" : "Clean silhouette, No external particles")
                .replace('{evolution ? \n"- Create a Level 1 to Level {count} progression for a SINGLE concept.\\n- Stage 1: Basic/Weak (Wood/Iron).\\n- Stage {count}: Legendary/God-tier (Gold/Diamond/Light).\\n- Show gradual visual upgrades." \n: \n"- Generate {count} distinct variations of the subject."}', inputValues['evolution'] ? 
                    `- Create a Level 1 to Level ${inputValues['count'] || 1} progression for a SINGLE concept.\n- Stage 1: Basic/Weak (Wood/Iron).\n- Stage ${inputValues['count'] || 1}: Legendary/God-tier (Gold/Diamond/Light).\n- Show gradual visual upgrades.` : 
                    `- Generate ${inputValues['count'] || 1} distinct variations of the subject.`
                );

            const finalPrompt = `${systemInstruction}\n\nUser Request: ${inputValues['prompt']}`;

            console.log("NodePro Final Prompt:", finalPrompt);

            // 3. 直接调用绘图模型 (Gemini Pro Vision / Imagen 3)
            // IconGenerator 的核心是产出图片，而非文本
            
            const modelTier = inputValues['model_tier'] || 'flash';
            const model = modelTier === 'pro' ? ModelType.GEMINI_PRO_IMAGE : ModelType.GEMINI_FLASH_IMAGE;
            const aspectRatio = inputValues['aspect_ratio'] || '1:1';

            // 调用统一生成服务
            const imageUrl = await generateImage({
                model: model,
                prompt: finalPrompt,
                aspectRatio: aspectRatio,
                resolution: '1024x1024' as any // Force cast to match Resolution type or use valid value
            });

            return {
                success: true,
                data: imageUrl, // 直接返回图片 URL
                metadata: {
                    timestamp: Date.now(),
                    modelUsed: model
                }
            };

        } catch (error: any) {
            console.error("NodePro Execution Error:", error);
            return {
                success: false,
                data: null,
                metadata: {
                    timestamp: Date.now(),
                    modelUsed: 'unknown'
                }
            };
        }
    }

    /**
     * 将用户输入值转换为 Prompt 文本片段 (辅助调试用)
     */
    private static buildContext(config: ProNodeConfig, inputValues: Record<string, any>): string {
        let context = "";
        if (config.inputs.prompt) {
            context += `Main Prompt: "${inputValues['prompt'] || ''}"\n`;
        }
        config.inputs.settings.forEach(setting => {
            const val = inputValues[setting.key] ?? setting.defaultValue;
            context += `${setting.label}: ${val}\n`;
        });
        return context;
    }
}
