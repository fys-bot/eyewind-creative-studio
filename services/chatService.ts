
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { getLocalApiKey } from "./storageService";
import { WorkflowNode, WorkflowEdge, WorkflowNodeType, ChatMessage } from "../types";
import { generateImage } from "./generationService";

// --- Tool Definitions ---

const createWorkflowTool: FunctionDeclaration = {
  name: "create_workflow",
  description: "Generate a node-based workflow layout. Use this when the user asks to create, build, or design a workflow, pipeline, or process. Always layout nodes from left to right with approx 400px spacing.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      nodes: {
        type: Type.ARRAY,
        description: "List of nodes to create.",
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING, description: "Unique ID (e.g., 'n1')" },
                type: { type: Type.STRING, description: "One of: text_input, image_input, character_ref, script_agent, image_gen, video_gen, audio_gen, video_composer, preview, sticky_note, image_matting" },
                label: { type: Type.STRING, description: "Display label for the node" },
                x: { type: Type.NUMBER, description: "X coordinate (start at 0, increment by 400)" },
                y: { type: Type.NUMBER, description: "Y coordinate (start at 0)" },
                prompt: { type: Type.STRING, description: "Optional initial value or prompt for the node" }
            },
            required: ["id", "type", "x", "y", "label"]
        }
      },
      edges: {
         type: Type.ARRAY,
         description: "Connections between nodes.",
         items: {
             type: Type.OBJECT,
             properties: {
                 source: { type: Type.STRING },
                 target: { type: Type.STRING },
                 sourceHandle: { type: Type.STRING, description: "Usually 'output' or 'image' or 'video'" },
                 targetHandle: { type: Type.STRING, description: "Usually 'input', 'prompt', 'image_ref', 'clips'" }
             },
             required: ["source", "target"]
         }
      },
      description: { type: Type.STRING, description: "Short description of what this workflow does." }
    },
    required: ["nodes", "edges"]
  }
};

const generateImageTool: FunctionDeclaration = {
    name: "generate_image",
    description: "Generate an image based on a text prompt. Use this when the user explicitly asks to 'generate an image' or 'show me a picture'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            prompt: { type: Type.STRING, description: "The visual description of the image" },
            aspectRatio: { type: Type.STRING, description: "Aspect ratio (16:9, 1:1, 9:16)" }
        },
        required: ["prompt"]
    }
};

// --- Chat Service ---


interface ChatOption {
    label: string;
    value: string;
    action: 'generate_image' | 'create_workflow' | 'reply';
    payload?: any;
}

export class ChatManager {
    private ai: GoogleGenAI | null = null;
    private chatSession: any = null;
    private modelName: string = 'gemini-3-pro-preview'; // Use Pro for better tool use

    constructor() {
        this.init();
    }

    private async init() {
        const apiKey = getLocalApiKey() || process.env.API_KEY;
        if (apiKey) {
            this.ai = new GoogleGenAI({ apiKey });
        }
    }

    // New helper to detect intent quickly
    private detectIntent(message: string): 'image_gen' | 'complex_request' | 'general' {
        // Simple regex-based heuristics for speed
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

    // Extract prompt from message (simple cleanup)
    private extractPrompt(message: string): string {
        return message.replace(/^(帮我|请|please)?\s*(生成|画|generate|create)\s*(一张|个|an|a)?\s*(图片|image|picture)?\s*(of|about)?\s*/i, '').trim();
    }

    async sendMessage(
        message: string, 
        history: ChatMessage[], 
        contextNodes: WorkflowNode[] = [],
        options: { skipIntentCheck?: boolean } = {}
    ): Promise<ChatMessage[]> {
        if (!this.ai) await this.init();
        
        // Handle missing API Key gracefully
        if (!this.ai) {
            return [{
                id: Date.now().toString(),
                role: 'model',
                content: "Please configure your Gemini API Key in Settings to use the Chat Assistant.",
                type: 'text',
                timestamp: Date.now()
            }];
        }

        // 0. Global Intent Gateway
        // Prompt user for Direct Generation vs Workflow Creation for every request
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

        // 1. Intent Analysis
        const intent = this.detectIntent(message);

        // 2. Handle Image Generation Missing Slots
        if (intent === 'image_gen') {
            // Check if size is mentioned
            const sizeKeywords = ['16:9', '9:16', '1:1', '4:3', '3:4', 'landscape', 'portrait', 'square', '横屏', '竖屏', '正方形'];
            const hasSize = sizeKeywords.some(k => message.includes(k));

            if (!hasSize) {
                // Return options request immediately without calling LLM
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

        // 3. Removed legacy complex_request heuristic as it is replaced by Global Gateway

        // 4. Standard LLM Flow (with Tools)
        // Prepare System Instruction with Context
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
        `;

        // We construct a fresh request mostly to keep it stateless/robust for this demo, 
        const contents = history.filter(h => h.role !== 'system' && h.type === 'text').map(h => ({
            role: h.role,
            parts: [{ text: h.content }]
        }));
        
        // Add current message
        contents.push({ role: 'user', parts: [{ text: message }] });

        try {
            const result = await this.ai.models.generateContent({
                model: this.modelName,
                contents: contents,
                config: {
                    systemInstruction: systemInstruction,
                    tools: [{ functionDeclarations: [createWorkflowTool, generateImageTool] }]
                }
            });

            const response = result.candidates?.[0];
            const newMessages: ChatMessage[] = [];

            // 1. Handle Function Calls
            const functionCalls = response?.content?.parts?.filter(p => p.functionCall).map(p => p.functionCall);
            
            if (functionCalls && functionCalls.length > 0) {
                for (const call of functionCalls) {
                    if (call.name === 'create_workflow') {
                        const args = call.args as any;
                        newMessages.push({
                            id: Date.now().toString(),
                            role: 'model',
                            content: args.description || "I've designed a workflow for you.",
                            type: 'workflow',
                            data: { nodes: args.nodes, edges: args.edges },
                            timestamp: Date.now()
                        });
                    } else if (call.name === 'generate_image') {
                        const args = call.args as any;
                        
                        // Check if aspectRatio is provided by the model or tool call
                        // If NOT provided, intercept and ask user instead of generating default 1:1
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
                            // Stop processing other calls if we are asking for clarification
                            break; 
                        }

                        // If aspectRatio IS provided, proceed with generation
                        const imageUrl = await generateImage({
                            model: 'gemini-2.5-flash-image', // Use fast model for chat
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
                }
            } else {
                // 2. Handle Text Response
                const text = response?.content?.parts?.map(p => p.text).join('') || "I didn't understand that.";
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
            
            // Handle Gemini specific API errors
            const errMsg = error.message || JSON.stringify(error);
            if (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID')) {
                 return [{
                    id: Date.now().toString(),
                    role: 'model',
                    content: "Your Gemini API Key seems to be invalid or expired. Please update it in Settings.",
                    type: 'text',
                    timestamp: Date.now()
                }];
            }

            return [{
                id: Date.now().toString(),
                role: 'model',
                content: `Sorry, I encountered an error: ${errMsg.slice(0, 100)}...`,
                type: 'text',
                timestamp: Date.now()
            }];
        }
    }

    // New method to handle option selection
    async handleOptionSelection(option: ChatOption, history: ChatMessage[], contextNodes: WorkflowNode[] = []): Promise<ChatMessage[]> {
        if (option.action === 'generate_image') {
             // Directly trigger image generation
             try {
                const imageUrl = await generateImage({
                    model: 'gemini-2.5-flash-image',
                    prompt: option.payload.prompt,
                    aspectRatio: option.value as any // Cast to any to bypass strict enum check for now, or ensure value matches AspectRatio
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
            // Trigger workflow creation via LLM, forcing the tool call
            return this.sendMessage(`Create a workflow for: ${option.payload.prompt}`, history, contextNodes, { skipIntentCheck: true });
        }

        if (option.action === 'reply') {
            // Treat as normal user message
            return this.sendMessage(option.payload.text, history, contextNodes, { skipIntentCheck: true });
        }

        return [];
    }
}

export const chatService = new ChatManager();
