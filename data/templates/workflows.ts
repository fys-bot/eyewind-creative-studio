import { AspectRatio, ModelType, Resolution, WorkflowTemplate, WorkflowNodeType } from "../../types";

export const PROFESSIONAL_TEMPLATES: WorkflowTemplate[] = [
    {
        id: 'tpl_scifi_film',
        name: '电影级科幻短片生成',
        description: '全自动科幻电影制作流：从剧本大纲到分镜生成，再到动态视频与配乐合成，一站式生成赛博朋克风格短片。',
        icon: 'Clapperboard',
        category: 'film',
        nodes: [
            // 第一阶段：剧本与策划 (Group 1)
            {
                id: 'group_pre_prod',
                type: 'group',
                x: 0,
                y: 0,
                status: 'idle',
                data: {
                    label: '第一阶段：剧本与分镜策划',
                    settings: { width: 900, height: 600 }
                }
            },
            {
                id: 'input_theme',
                type: 'text_input',
                x: 50,
                y: 80,
                status: 'idle',
                parentId: 'group_pre_prod',
                data: {
                    label: '电影主题输入',
                    value: '一个赛博朋克风格的雨夜，霓虹灯闪烁，一名侦探在街角发现了一个损坏的机器人，引发了对人类意识的思考。'
                }
            },
            {
                id: 'agent_script',
                type: 'script_agent',
                x: 500,
                y: 80,
                status: 'idle',
                parentId: 'group_pre_prod',
                data: {
                    label: 'AI 编剧 (Director)',
                    settings: {
                        model: 'gemini-1.5-pro',
                        role: 'director'
                    },
                    value: '请根据主题生成一段详细的电影分镜脚本，包含3个关键场景的画面描述、运镜方式和氛围描写。'
                }
            },
            
            // 第二阶段：视觉概念设计 (Group 2)
            {
                id: 'group_visual',
                type: 'group',
                x: 1000,
                y: 0,
                status: 'idle',
                data: {
                    label: '第二阶段：视觉概念生成',
                    settings: { width: 900, height: 600 }
                }
            },
            {
                id: 'gen_keyframe_1',
                type: 'image_gen',
                x: 1050,
                y: 80,
                status: 'idle',
                parentId: 'group_visual',
                data: {
                    label: '场景一：关键帧生成',
                    settings: {
                        model: ModelType.MIDJOURNEY_V6,
                        aspectRatio: AspectRatio.R_21_9,
                        resolution: Resolution.R_2K
                    },
                    value: 'Cinematic shot, Cyberpunk city street at night, heavy rain, neon lights reflection on wet ground, detective looking at a broken robot, high detail, 8k resolution, blade runner style --ar 21:9'
                }
            },
            {
                id: 'gen_keyframe_2',
                type: 'image_gen',
                x: 1500,
                y: 80,
                status: 'idle',
                parentId: 'group_visual',
                data: {
                    label: '场景二：特写生成',
                    settings: {
                        model: ModelType.MIDJOURNEY_V6,
                        aspectRatio: AspectRatio.R_21_9
                    },
                    value: 'Close up shot, mechanical eye of a broken robot, sparks flying, emotional expression, intricate mechanical details, cinematic lighting --ar 21:9'
                }
            },

            // 第三阶段：动态视频生成 (Group 3)
            {
                id: 'group_production',
                type: 'group',
                x: 0,
                y: 700,
                status: 'idle',
                data: {
                    label: '第三阶段：视频动态化',
                    settings: { width: 900, height: 600 }
                }
            },
            {
                id: 'video_gen_1',
                type: 'video_gen',
                x: 50,
                y: 780,
                status: 'idle',
                parentId: 'group_production',
                data: {
                    label: '视频生成 (Runway Gen-3)',
                    settings: {
                        model: ModelType.RUNWAY_GEN3,
                        duration: 8,
                        aspectRatio: AspectRatio.R_21_9
                    },
                    value: 'Camera slowly pans forward, rain falling heavily, atmospheric smoke, cinematic movement'
                }
            },
            {
                id: 'video_gen_2',
                type: 'video_gen',
                x: 500,
                y: 780,
                status: 'idle',
                parentId: 'group_production',
                data: {
                    label: '视频生成 (Kling)',
                    settings: {
                        model: ModelType.KLING,
                        duration: 5
                    },
                    value: 'Sparks flickering from the robot eye, subtle mechanical movements, sad atmosphere'
                }
            },

            // 第四阶段：音频与后期 (Group 4)
            {
                id: 'group_post',
                type: 'group',
                x: 1000,
                y: 700,
                status: 'idle',
                data: {
                    label: '第四阶段：配乐与合成',
                    settings: { width: 900, height: 600 }
                }
            },
            {
                id: 'audio_bgm',
                type: 'audio_gen',
                x: 1050,
                y: 780,
                status: 'idle',
                parentId: 'group_post',
                data: {
                    label: '背景音乐生成',
                    settings: {
                        model: ModelType.EYEWIND_AUDIO,
                        duration: 15
                    },
                    value: 'Dark synthwave, mysterious, slow tempo, rain sound effects, cyberpunk atmosphere'
                }
            },
            {
                id: 'final_composer',
                type: 'video_composer',
                x: 1500,
                y: 780,
                status: 'idle',
                parentId: 'group_post',
                data: {
                    label: '最终成片合成',
                    value: 'Combine video clips and background music'
                }
            }
        ],
        edges: [
            { id: 'e1', source: 'input_theme', target: 'agent_script' },
            { id: 'e2', source: 'agent_script', target: 'gen_keyframe_1' },
            { id: 'e3', source: 'agent_script', target: 'gen_keyframe_2' },
            { id: 'e4', source: 'gen_keyframe_1', target: 'video_gen_1' },
            { id: 'e5', source: 'gen_keyframe_2', target: 'video_gen_2' },
            { id: 'e6', source: 'video_gen_1', target: 'final_composer' },
            { id: 'e7', source: 'video_gen_2', target: 'final_composer' },
            { id: 'e8', source: 'audio_bgm', target: 'final_composer' }
        ]
    },
    {
        id: 'tpl_ecommerce_ad',
        name: '电商产品广告海报流',
        description: '电商运营必备：上传产品白底图，自动生成高大上的场景背景，并进行光影融合与4K超清放大。',
        icon: 'ShoppingBag',
        category: 'ecommerce',
        nodes: [
            {
                id: 'input_product',
                type: 'image_input',
                x: 50,
                y: 50,
                status: 'idle',
                data: {
                    label: '上传产品图',
                    value: '', // 用户需上传
                }
            },
            {
                id: 'process_matting',
                type: 'image_matting',
                x: 400,
                y: 50,
                status: 'idle',
                data: {
                    label: '智能抠图',
                    value: 'Remove background, keep product only'
                }
            },
            {
                id: 'gen_background',
                type: 'image_gen',
                x: 50,
                y: 400,
                status: 'idle',
                data: {
                    label: '场景背景生成',
                    settings: {
                        model: ModelType.EYEWIND_IMAGE,
                        aspectRatio: AspectRatio.R_3_4
                    },
                    value: 'Minimalist podium, soft pastel lighting, luxury studio setting, high quality, 3d render, abstract shapes --ar 3:4'
                }
            },
            {
                id: 'process_composite',
                type: 'video_composer', // 暂时用合成器代替图像合成
                x: 400,
                y: 400,
                status: 'idle',
                data: {
                    label: '产品与背景融合',
                    value: 'Composite product onto background with shadow matching'
                }
            },
            {
                id: 'process_upscale',
                type: 'image_upscale',
                x: 750,
                y: 225,
                status: 'idle',
                data: {
                    label: '4K 超清放大',
                    value: 'Upscale 2x, Denoise'
                }
            }
        ],
        edges: [
            { id: 'e1', source: 'input_product', target: 'process_matting' },
            { id: 'e2', source: 'process_matting', target: 'process_composite' },
            { id: 'e3', source: 'gen_background', target: 'process_composite' },
            { id: 'e4', source: 'process_composite', target: 'process_upscale' }
        ]
    },
    {
        id: 'tpl_social_viral',
        name: '短视频爆款文案与视频',
        description: '自媒体神器：输入一个热门话题，自动生成吸引人的口播文案，并匹配相应的画面素材，生成短视频。',
        icon: 'Smartphone',
        category: 'ads',
        nodes: [
            {
                id: 'input_topic',
                type: 'text_input',
                x: 50,
                y: 100,
                status: 'idle',
                data: {
                    label: '热门话题',
                    value: '为什么现在的年轻人都不爱谈恋爱了？'
                }
            },
            {
                id: 'agent_copywriter',
                type: 'script_agent',
                x: 450,
                y: 100,
                status: 'idle',
                data: {
                    label: '金牌文案 (Copywriter)',
                    settings: { role: 'marketing' },
                    value: '请针对该话题写一段15秒的短视频口播文案，风格幽默犀利，并在最后留下悬念引导评论。'
                }
            },
            {
                id: 'gen_tts',
                type: 'audio_gen',
                x: 850,
                y: 0,
                status: 'idle',
                data: {
                    label: '语音合成 (TTS)',
                    settings: { 
                        model: ModelType.GEMINI_TTS,
                        // voice: 'Puck' 
                    },
                    value: 'Generate speech from script'
                }
            },
            {
                id: 'gen_visuals',
                type: 'video_gen',
                x: 850,
                y: 300,
                status: 'idle',
                data: {
                    label: '匹配画面生成',
                    settings: {
                        model: ModelType.VEO_FAST,
                        aspectRatio: AspectRatio.R_9_16
                    },
                    value: 'Young people sitting alone in coffee shop looking at phones, modern city lifestyle, lonely but peaceful atmosphere --ar 9:16'
                }
            }
        ],
        edges: [
            { id: 'e1', source: 'input_topic', target: 'agent_copywriter' },
            { id: 'e2', source: 'agent_copywriter', target: 'gen_tts' },
            { id: 'e3', source: 'agent_copywriter', target: 'gen_visuals' }
        ]
    },
    {
        id: 'tpl_game_char',
        name: '游戏角色三视图设计',
        description: '游戏开发辅助：输入角色描述，自动生成正视图、侧视图和背视图，并生成详细的角色设定文档。',
        icon: 'Gamepad2',
        category: 'acg',
        nodes: [
            {
                id: 'input_desc',
                type: 'text_input',
                x: 50,
                y: 200,
                status: 'idle',
                data: {
                    label: '角色描述',
                    value: '一位身穿银色铠甲的女性圣骑士，手持发光的长剑，金色长发，表情坚毅，幻想风格。'
                }
            },
            {
                id: 'agent_designer',
                type: 'script_agent',
                x: 450,
                y: 200,
                status: 'idle',
                data: {
                    label: '角色策划 (Game Designer)',
                    settings: { role: 'game_designer' },
                    value: '请完善该角色的背景故事、技能设定和性格特征，输出一份详细的角色设定文档。'
                }
            },
            {
                id: 'gen_char_sheet',
                type: 'image_gen',
                x: 900,
                y: 50,
                status: 'idle',
                data: {
                    label: '三视图生成',
                    settings: {
                        model: ModelType.MIDJOURNEY_V6,
                        aspectRatio: AspectRatio.R_3_2
                    },
                    value: 'Character sheet of a female paladin in silver armor, holding a glowing sword, golden hair, front view, side view, back view, white background, concept art style, high detail --ar 3:2'
                }
            },
            {
                id: 'gen_avatar',
                type: 'image_gen',
                x: 900,
                y: 400,
                status: 'idle',
                data: {
                    label: '头像/立绘生成',
                    settings: {
                        model: ModelType.EYEWIND_IMAGE,
                        aspectRatio: AspectRatio.R_3_4
                    },
                    value: 'Portrait of a female paladin, epic lighting, fantasy art style, detailed face --ar 3:4'
                }
            }
        ],
        edges: [
            { id: 'e1', source: 'input_desc', target: 'agent_designer' },
            { id: 'e2', source: 'input_desc', target: 'gen_char_sheet' },
            { id: 'e3', source: 'input_desc', target: 'gen_avatar' }
        ]
    },
    {
        id: 'tpl_photo_fix',
        name: '老照片修复与上色',
        description: '工具箱：修复模糊、破损的老照片，并进行智能上色，让回忆重现光彩。',
        icon: 'Wand2',
        category: 'tools',
        nodes: [
            {
                id: 'input_old_photo',
                type: 'image_input',
                x: 50,
                y: 150,
                status: 'idle',
                data: {
                    label: '上传老照片',
                    value: ''
                }
            },
            {
                id: 'process_restore',
                type: 'image_upscale', // 暂用 upscale 代表修复
                x: 400,
                y: 150,
                status: 'idle',
                data: {
                    label: '画质修复与放大',
                    value: 'Restore faces, remove scratches, upscale 2x'
                }
            },
            {
                id: 'process_color',
                type: 'color_grade', // 暂用调色代表上色
                x: 750,
                y: 150,
                status: 'idle',
                data: {
                    label: '智能上色',
                    value: 'Colorize black and white photo, natural colors'
                }
            },
            {
                id: 'process_compare',
                type: 'image_compare',
                x: 1100,
                y: 150,
                status: 'idle',
                data: {
                    label: '修复前后对比',
                    value: ''
                }
            }
        ],
        edges: [
            { id: 'e1', source: 'input_old_photo', target: 'process_restore' },
            { id: 'e2', source: 'process_restore', target: 'process_color' },
            { id: 'e3', source: 'input_old_photo', target: 'process_compare' }, // Before
            { id: 'e4', source: 'process_color', target: 'process_compare' }   // After
        ]
    },
    {
        id: 'tpl_daily_vlog',
        name: '生活 Vlog 智能剪辑',
        description: '记录美好生活：上传日常拍摄的碎片视频，自动剪辑成踩点 Vlog，并配上温馨治愈的音乐。',
        icon: 'Coffee',
        category: 'life',
        nodes: [
            {
                id: 'input_videos',
                type: 'image_input', // 暂时用图片输入代替视频上传
                x: 50,
                y: 50,
                status: 'idle',
                data: {
                    label: '上传视频素材',
                    value: ''
                }
            },
            {
                id: 'process_cut',
                type: 'video_composer',
                x: 400,
                y: 50,
                status: 'idle',
                data: {
                    label: '智能踩点剪辑',
                    value: 'Auto cut to beat, remove silent parts'
                }
            },
            {
                id: 'gen_music',
                type: 'audio_gen',
                x: 400,
                y: 300,
                status: 'idle',
                data: {
                    label: '治愈系配乐',
                    settings: {
                        model: ModelType.EYEWIND_AUDIO,
                        duration: 30
                    },
                    value: 'Relaxing lo-fi hip hop, cozy atmosphere, morning coffee vibe'
                }
            },
            {
                id: 'process_filter',
                type: 'color_grade',
                x: 750,
                y: 150,
                status: 'idle',
                data: {
                    label: '日系滤镜',
                    value: 'Japanese film style, soft light, low contrast'
                }
            }
        ],
        edges: [
            { id: 'e1', source: 'input_videos', target: 'process_cut' },
            { id: 'e2', source: 'gen_music', target: 'process_cut' },
            { id: 'e3', source: 'process_cut', target: 'process_filter' }
        ]
    },
    {
        id: 'tpl_meme_maker',
        name: '趣味表情包生成器',
        description: '斗图必备：输入一句话，自动生成一组搞怪有趣的表情包，支持自定义换脸。',
        icon: 'Smile',
        category: 'fun',
        nodes: [
            {
                id: 'input_text',
                type: 'text_input',
                x: 50,
                y: 100,
                status: 'idle',
                data: {
                    label: '梗/文案',
                    value: '打工是不可能打工的'
                }
            },
            {
                id: 'gen_meme',
                type: 'image_gen',
                x: 450,
                y: 100,
                status: 'idle',
                data: {
                    label: '表情包生成',
                    settings: {
                        model: ModelType.GEMINI_PRO_IMAGE,
                        aspectRatio: AspectRatio.R_1_1
                    },
                    value: 'Funny meme sticker, cute cat saying "No work today", simple line art, white background --ar 1:1'
                }
            }
        ],
        edges: [
            { id: 'e1', source: 'input_text', target: 'gen_meme' }
        ]
    }
];
