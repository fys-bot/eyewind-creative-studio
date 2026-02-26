
import { ProNodeConfig } from './types';

/**
 * 示例配置：AI 图标生成器
 * 对应用户截图中的 "NOCRA Icons"
 */
export const IconGeneratorConfig: ProNodeConfig = {
    id: 'icon_generator_pro',
    name: 'NOCRA Icons',
    description: 'Professional AI Asset Generator for App Icons and Game Assets',
    version: '1.0.0',
    
    inputs: {
        prompt: {
            label: '提示词 1',
            placeholder: '输入剧情大纲、产品卖点或创意简报...',
            required: true
        },
        settings: [
            // 移除了内部提示词和参考图上传，改为依靠外部连线输入
            {
                key: 'model_tier',
                label: 'Model Tier',
                type: 'select',
                defaultValue: 'flash',
                options: [
                    { label: 'Flash 极速版 (gemini-2.5-flash)', value: 'flash' },
                    { label: 'Pro 专业版 (gemini-3-pro)', value: 'pro' }
                ]
            },
            {
                key: 'aspect_ratio',
                label: 'Aspect Ratio',
                type: 'select',
                defaultValue: '1:1',
                options: [
                    { label: '1:1 (方形)', value: '1:1' },
                    { label: '3:4', value: '3:4' },
                    { label: '4:3', value: '4:3' },
                    { label: '16:9', value: '16:9' },
                    { label: '9:16', value: '9:16' }
                ]
            },
            {
                key: 'count',
                label: 'Count (Grid)',
                type: 'slider',
                defaultValue: 1,
                min: 1,
                max: 36
            },
            {
                key: 'evolution',
                label: '等级进化 (Evolution Mode)',
                type: 'boolean',
                defaultValue: false
            },
            {
                key: 'vfx',
                label: '视觉特效 (VFX)',
                type: 'boolean',
                defaultValue: false
            },
            {
                key: 'style',
                label: '美术风格 (Style)',
                type: 'select',
                defaultValue: 'casual',
                options: [
                    { label: '欧美卡通 (Casual)', value: 'casual' },
                    { label: '3D 渲染 (3D Render)', value: '3d_render' },
                    { label: '复古像素 (Pixel Art)', value: 'pixel_art' },
                    { label: 'RPG 装备 (RPG Item)', value: 'rpg_item' },
                    { label: 'iOS 图标 (iOS Style)', value: 'ios' },
                    { label: 'Material 设计 (Material)', value: 'material' },
                    { label: '毛玻璃 (Glassmorphism)', value: 'glass' },
                    { label: '创意抽象 (Creative)', value: 'creative' }
                ]
            },
            {
                key: 'bg_color',
                label: '背景颜色 (Background)',
                type: 'select',
                defaultValue: 'white',
                options: [
                    { label: '纯白 (White)', value: '#FFFFFF' },
                    { label: '纯黑 (Black)', value: '#000000' },
                    { label: '蓝幕 (Blue)', value: '#0000FF' },
                    { label: '绿幕 (Green)', value: '#00FF00' }
                ]
            }
        ]
    },

    rules: {
        systemPrompt: `Generate a high-quality 2D sprite sheet containing multiple game or app icons.

**Layout & Context:**
- Layout: {count} items grid.
- Separation: Wide whitespace gaps (Critical for slicing).
- Background: Solid Hex Color {bg_color}. NO gradients, NO shadows casting off-screen.

**Style Definition:**
- Style: {style}
- If 'casual': Supercell style, vector look, thick outlines.
- If '3d_render': C4D, octane render, glossy plastic, high fidelity.
- If 'pixel_art': 32-bit pixel art, crisp edges.
- If 'rpg_item': Blizzard style, intricate details, hand-painted texture.
- If 'ios': iOS app icon style, rounded corners, sleek gradients, Apple design language.
- If 'material': Google Material Design, flat colors, subtle shadows, paper layers.
- If 'glass': Glassmorphism, translucent frosted glass, blurred background, vibrant colors.
- If 'creative': Abstract, surreal, avant-garde, breaking conventional forms.

**Content:**
- Subject: {prompt}
- VFX: {vfx ? "Magical glow and particles allowed" : "Clean silhouette, No external particles"}

**Special Mode Instructions:**
{evolution ? 
"- Create a Level 1 to Level {count} progression for a SINGLE concept.\n- Stage 1: Basic/Weak (Wood/Iron).\n- Stage {count}: Legendary/God-tier (Gold/Diamond/Light).\n- Show gradual visual upgrades." 
: 
"- Generate {count} distinct variations of the subject."}
`,
        outputFormat: 'text',
        constraints: [
            "Output ONLY the refined English prompt for image generation.",
            "Do not add conversational filler.",
            "Ensure the prompt is ready for Stable Diffusion, Midjourney or DALL-E."
        ]
    }
};

export const ArtDirectorConfig: ProNodeConfig = {
    id: 'art_director_pro',
    name: 'AI Art Director',
    description: 'Expert guidance for visual style and composition',
    version: '1.0.0',
    inputs: {
        prompt: {
            label: 'Describe your visual idea...',
            placeholder: 'e.g. A cyberpunk city at night with neon rain...',
            required: true
        },
        settings: [
            {
                key: 'mood',
                label: 'Mood',
                type: 'select',
                defaultValue: 'cinematic',
                options: [
                    { label: 'Cinematic', value: 'cinematic' },
                    { label: 'Dreamy', value: 'dreamy' },
                    { label: 'Dark/Gothic', value: 'dark' },
                    { label: 'Vibrant/Pop', value: 'vibrant' }
                ]
            },
            {
                key: 'composition',
                label: 'Composition',
                type: 'select',
                defaultValue: 'rule_of_thirds',
                options: [
                    { label: 'Rule of Thirds', value: 'rule_of_thirds' },
                    { label: 'Symmetrical', value: 'symmetrical' },
                    { label: 'Wide Angle', value: 'wide_angle' },
                    { label: 'Macro/Close-up', value: 'macro' }
                ]
            }
        ]
    },
    rules: {
        systemPrompt: `You are a world-class Art Director.
        Your goal is to take a rough idea and refine it into a visually stunning art direction brief.
        Focus on:
        - Color Palette
        - Lighting Setup
        - Composition
        - Texture and Atmosphere
        
        Output a structured description that can be used by artists or AI generators.`,
        outputFormat: 'text',
        constraints: [
            "Be specific about lighting and colors.",
            "Use professional art terminology.",
            "Keep it inspiring but actionable."
        ]
    }
};
