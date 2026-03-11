
import { WorkflowNode, WorkflowEdge, WorkflowNodeType, ChatMessage } from "../types";
import { generateImage } from "./generationService";
import { generateTextViaGateway } from "./aiGatewayService";

// --- Chat Service (AI Gateway 版本) ---

interface ChatOption {
    label: string;
    value: string;
    action: 'generate_image' | 'create_workflow' | 'reply';
    payload?: any;
}

export class ChatManager {
    private modelName: string = 'gpt-4o'; // 默认聊天模型，通过 AI Gateway 路由

    constructor() {}

    // 检测用户意图
    private detectIntent(message: string): 'image_gen' | 'complex_request' | 'general' {
        const imageKeywords = ['生成图片', '画一张', 'create image', 'generate image', 'draw', 'picture of'];
        const complexKeywords = ['workflow', 'pipeline', '工作流', '流程', 'first...then', 'step by step', '首先', '然后'];
        
        const lowerMsg = message.toLowerCase();
        
        if (complexKeywords.some(k => lowerMsg.includes(k)) || message.length > 100) {
             return 'complex_request';
        }
        if (imageKeywords.some(k => lowerMsg.includes(k))) {
            return 'image_gen';
        }
        return 'general';
    }

    // 从消息中提取 prompt
    private extractPrompt(message: string): string {
        return message.replace(/^(帮我|请|please)?\s*(生成|画|generate|create)\s*(一张|个|an|a)?\s*(图片|image|picture)?\s*(of|about)?\s*/i, '').trim();
    }

    async sendMessage(
        message: string, 
        history: ChatMessage[], 
        contextNodes: WorkflowNode[] = [],
        options: { skipIntentCheck?: boolean } = {}
    ): Promise<ChatMessage[]> {

        // 0. 全局意图网关
        if (!options.skipIntentCheck) {
            return [{
                id: Date.now().toString(),
                role: 'model',
                content: "您希望如何处理这个需求？",
                type: 'options',
                data: {
                    title: "选择操作模式",
                    options: [
                        { 
                            label: "✨ 直接生成 (Direct)", 
                            value: "direct", 
                            action: 'reply', 
                            payload: { text: message } 
                        },
                        { 
                            label: "🛠️ 创建工作流 (Workflow)", 
                            value: "workflow", 
                            action: 'create_workflow', 
                            payload: { prompt: message } 
                        }
                    ]
                } as { title: string, options: ChatOption[] },
                timestamp: Date.now()
            }];
        }

        // 1. 意图分析
        const intent = this.detectIntent(message);

        // 2. 图片生成 — 缺少尺寸时询问
        if (intent === 'image_gen') {
            const sizeKeywords = ['16:9', '9:16', '1:1', '4:3', '3:4', 'landscape', 'portrait', 'square', '横屏', '竖屏', '正方形'];
            const hasSize = sizeKeywords.some(k => message.includes(k));

            if (!hasSize) {
                return [{
                    id: Date.now().toString(),
                    role: 'model',
                    content: "好的，请问您希望生成什么比例的图片？",
                    type: 'options',
                    data: {
                        title: "选择图片比例",
                        options: [
                            { label: "1:1 (正方形)", value: "1:1", action: 'generate_image', payload: { prompt: this.extractPrompt(message) } },
                            { label: "16:9 (横屏)", value: "16:9", action: 'generate_image', payload: { prompt: this.extractPrompt(message) } },
                            { label: "9:16 (竖屏)", value: "9:16", action: 'generate_image', payload: { prompt: this.extractPrompt(message) } },
                            { label: "3:4 (海报)", value: "3:4", action: 'generate_image', payload: { prompt: this.extractPrompt(message) } }
                        ]
                    } as { title: string, options: ChatOption[] },
                    timestamp: Date.now()
                }];
            }
        }

        // 3. 标准 LLM 流程 — 通过 AI Gateway
        let systemInstruction = `You are E-NEXUS AI, the Central Dispatch Agent (中枢调度智能体) for this SaaS product.
        
        Core Responsibilities:
        - Determine which agent/tool should handle the user request.
        - Control the calling sequence.
        - Aggregate results from tools.
        - Output final unified conclusion.
        - You coordinate resources to solve user problems.

        You help users design workflows for video, image, and audio generation.
        
        Available Node Types:
        - text_input: For prompts.
        - image_input: For reference images.
        - character_ref: For defining character consistent IP.
        - script_agent: Generates scripts/plans from concepts.
        - image_gen: Generates images (Inputs: prompt, image_ref, char_ref).
        - video_gen: Generates videos (Inputs: prompt, image (start/end frame)).
        - video_composer: Combines video clips.
        - audio_gen: TTS (Text to Speech).
        - preview: Shows results.
        
        Current Canvas Context: User has ${contextNodes.length} nodes on canvas.
        If the user refers to "this node" or "@NodeName", use the context provided.

        IMPORTANT: You must always reply in the same language as the user's input. If the user asks in Chinese, you MUST reply in Chinese.

        When the user asks to create a workflow, respond with a JSON block in this format:
        \`\`\`workflow
        {"nodes": [...], "edges": [...], "description": "..."}
        \`\`\`
        
        When the user asks to generate an image, respond with:
        \`\`\`image
        {"prompt": "...", "aspectRatio": "16:9"}
        \`\`\`
        `;

        // 构建 prompt — 包含历史消息
        const historyText = history
            .filter(h => h.role !== 'system' && h.type === 'text')
            .slice(-10) // 最近10条
            .map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
            .join('\n');

        const fullPrompt = historyText 
            ? `${historyText}\nUser: ${message}`
            : message;

        try {
            const text = await generateTextViaGateway({
                model: this.modelName,
                prompt: fullPrompt,
                systemPrompt: systemInstruction,
                temperature: 0.7
            });

            const newMessages: ChatMessage[] = [];

            // 解析特殊代码块
            const workflowMatch = text.match(/```workflow\s*([\s\S]*?)```/);
            const imageMatch = text.match(/```image\s*([\s\S]*?)```/);

            if (workflowMatch) {
                try {
                    const args = JSON.parse(workflowMatch[1]);
                    newMessages.push({
                        id: Date.now().toString(),
                        role: 'model',
                        content: args.description || "I've designed a workflow for you.",
                        type: 'workflow',
                        data: { nodes: args.nodes, edges: args.edges },
                        timestamp: Date.now()
                    });
                } catch {
                    newMessages.push({
                        id: Date.now().toString(),
                        role: 'model',
                        content: text,
                        type: 'text',
                        timestamp: Date.now()
                    });
                }
            } else if (imageMatch) {
                try {
                    const args = JSON.parse(imageMatch[1]);
                    if (!args.aspectRatio) {
                        newMessages.push({
                            id: Date.now().toString(),
                            role: 'model',
                            content: "好的，请问您希望生成什么比例的图片？",
                            type: 'options',
                            data: {
                                title: "选择图片比例",
                                options: [
                                    { label: "1:1 (正方形)", value: "1:1", action: 'generate_image', payload: { prompt: args.prompt } },
                                    { label: "16:9 (横屏)", value: "16:9", action: 'generate_image', payload: { prompt: args.prompt } },
                                    { label: "9:16 (竖屏)", value: "9:16", action: 'generate_image', payload: { prompt: args.prompt } },
                                    { label: "3:4 (海报)", value: "3:4", action: 'generate_image', payload: { prompt: args.prompt } }
                                ]
                            } as { title: string, options: ChatOption[] },
                            timestamp: Date.now()
                        });
                    } else {
                        const imageUrl = await generateImage({
                            model: 'flux-1.1-pro',
                            prompt: args.prompt,
                            aspectRatio: args.aspectRatio
                        });
                        newMessages.push({
                            id: Date.now().toString(),
                            role: 'model',
                            content: `Generated: ${args.prompt}`,
                            type: 'image',
                            data: { url: imageUrl },
                            timestamp: Date.now()
                        });
                    }
                } catch {
                    newMessages.push({
                        id: Date.now().toString(),
                        role: 'model',
                        content: text,
                        type: 'text',
                        timestamp: Date.now()
                    });
                }
            } else {
                newMessages.push({
                    id: Date.now().toString(),
                    role: 'model',
                    content: text,
                    type: 'text',
                    timestamp: Date.now()
                });
            }

            return newMessages;

        } catch (error: any) {
            console.error("Chat Error", error);
            const errMsg = error.message || JSON.stringify(error);
            return [{
                id: Date.now().toString(),
                role: 'model',
                content: `抱歉，遇到了错误: ${errMsg.slice(0, 200)}`,
                type: 'text',
                timestamp: Date.now()
            }];
        }
    }

    // 处理选项选择
    async handleOptionSelection(option: ChatOption, history: ChatMessage[], contextNodes: WorkflowNode[] = []): Promise<ChatMessage[]> {
        if (option.action === 'generate_image') {
             try {
                const imageUrl = await generateImage({
                    model: 'flux-1.1-pro',
                    prompt: option.payload.prompt,
                    aspectRatio: option.value as any
                });
                return [{
                    id: Date.now().toString(),
                    role: 'model',
                    content: `Generated ${option.value} image for: ${option.payload.prompt}`,
                    type: 'image',
                    data: { url: imageUrl },
                    timestamp: Date.now()
                }];
             } catch (e) {
                 return [{ id: Date.now().toString(), role: 'model', content: "Generation failed.", type: 'text', timestamp: Date.now() }];
             }
        }
        
        if (option.action === 'create_workflow') {
            return this.sendMessage(`Create a workflow for: ${option.payload.prompt}`, history, contextNodes, { skipIntentCheck: true });
        }

        if (option.action === 'reply') {
            return this.sendMessage(option.payload.text, history, contextNodes, { skipIntentCheck: true });
        }

        return [];
    }
}

export const chatService = new ChatManager();
