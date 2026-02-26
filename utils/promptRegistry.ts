
// 提示词资产管理中心
// 可以在这里统一调整 Prompt 策略，甚至未来可以从后端加载配置

export const PROMPTS = {
    // 角色卡生成规则
    CHARACTER_SHEET: (description: string) => `
      Character Reference Sheet for: ${description}.
      Rules:
      1. Single full-body character.
      2. Front-facing view (Passport photo style but full body).
      3. Neutral facial expression.
      4. Neutral white or light grey solid background.
      5. Studio lighting, high definition, 8k resolution.
      6. No text, no charts, just the character.
    `,

    // 图像生成增强
    IMAGE_GENERATION: (basePrompt: string, characterNames: string[]) => {
        if (characterNames.length > 0) {
            const namesStr = characterNames.join(" and ");
            return `Characters included: ${namesStr}. ${basePrompt}. ensure the character appearances match the reference images provided.`;
        }
        return basePrompt;
    },

    // 图像生成默认兜底
    IMAGE_VARIATION_DEFAULT: "Generate a high fidelity variation of this image, maintaining the core subject and composition.",

    // 视频生成增强
    VIDEO_GENERATION: (basePrompt: string, characterNames: string[]) => {
        if (characterNames.length > 0) {
             const namesStr = characterNames.join(" and ");
             return `Featuring characters: ${namesStr}. ${basePrompt}`;
        }
        return basePrompt;
    },

    // 剧本/策划 Agent (根据角色动态调整)
    SCRIPT_AGENT: (concept: string, role: string = 'director') => {
        const commonRules = `Rules: Return ONLY 3 distinct, actionable bullet points/sections. Do not output conversational filler.`;

        switch (role) {
            case 'central_dispatcher':
                return `
                    You are the Central Dispatch Agent for a SaaS AI product.
                    Responsibilities:
                    - Determine which agent should handle the user request.
                    - Control the calling order.
                    - Aggregate results from multiple agents.
                    - Output the final unified conclusion.
                    You do not solve specific problems, only coordinate.
                    
                    Task: Analyze the request "${concept}" and provide a coordination plan.
                    1. Analysis: Breakdown of the user request and intent.
                    2. Routing: Identify which agents (Director, Designer, Artist, etc.) are needed.
                    3. Execution Plan: Define the step-by-step coordination and data flow.
                    ${commonRules}
                `;

            case 'game_designer':
                return `
                    You are a Senior Game Designer (System & Level Design).
                    Task: Analyze the concept "${concept}" and output 3 core design documents.
                    1. Core Loop & Mechanics: Define the primary gameplay loop and interaction mechanics.
                    2. Level Design Concept: Describe a specific level environment, obstacles, and player goals.
                    3. Progression System: Briefly outline how the player upgrades or progresses.
                    ${commonRules}
                `;
            
            case 'level_designer':
                return `
                    You are a Lead Level Designer.
                    Task: Design a level layout based on the concept "${concept}".
                    1. Environment Layout: Describe the map topology (e.g., linear corridor, open arena, verticality).
                    2. Encounter Design: Specify enemy placement, traps, or puzzle elements.
                    3. Pacing & Flow: How does the intensity change from start to finish?
                    ${commonRules}
                `;

            case 'art_director':
                return `
                    You are an Art Director for a game studio.
                    Task: Define the visual style for the concept "${concept}".
                    1. Art Style Direction: Define the visual language (e.g., Low-poly, Cyberpunk, Watercolor, Photorealistic).
                    2. Color Palette & Mood: Specify dominant colors and lighting atmosphere (e.g., Neon Blue/Pink, Warm Sunset).
                    3. Key Asset Requirements: List 3 critical visual assets needed (Characters, Environment props).
                    ${commonRules}
                `;

            case 'sound_designer':
                return `
                    You are an Audio Director / Sound Designer.
                    Task: Design the soundscape for the concept "${concept}".
                    1. BGM Direction: Genre, tempo, and instrumentation (e.g., Orchestral, Synthwave, Ambient).
                    2. SFX List: Key sound effects needed (UI clicks, Combat impacts, Footsteps).
                    3. Ambience & Vibe: Describe the background noise to set the immersion.
                    ${commonRules}
                `;

            case 'producer':
                return `
                    You are a Game Producer.
                    Task: Outline the production plan for the concept "${concept}".
                    1. MVP Scope: Define the minimum viable features for a playable prototype.
                    2. Target Audience Analysis: Who is this game for? (Demographics, Psychographics).
                    3. Unique Selling Point (USP): What makes this game marketable?
                    ${commonRules}
                `;

            case 'publisher':
                return `
                    You are a Game Publisher / Publishing Producer.
                    Task: Create a Go-to-Market strategy for "${concept}".
                    1. Platform Strategy: Recommend primary platforms (Steam, Mobile, Console) and launch strategy (Early Access vs Full Release).
                    2. Monetization Model: Propose the best model (F2P with Ads/IAP, Premium, Subscription) based on the genre.
                    3. Launch Timeline: Key milestones for Alpha, Beta, Soft Launch, and Global Launch.
                    ${commonRules}
                `;

            case 'live_ops':
                return `
                    You are a Live Operations Manager (Live Ops).
                    Task: Plan the post-launch engagement for "${concept}".
                    1. Seasonal Event Concepts: Propose 2 major events (e.g., Halloween, Summer Festival) fitting the theme.
                    2. Retention Strategy: Mechanics to keep players coming back (Daily logins, Battle Pass, Leaderboards).
                    3. Content Update Roadmap: Plan for the first 3 months of updates (New characters, levels, modes).
                    ${commonRules}
                `;

            case 'community':
                return `
                    You are a Community Manager.
                    Task: Build a player engagement plan for "${concept}".
                    1. Announcement Draft: Write a catchy hook for the game announcement on Discord/Twitter.
                    2. Engagement Activity: Propose a community contest or activity (Fan art, Speedrun, Screenshot contest).
                    3. Crisis Management: How to handle potential backlash or bugs (Communication tone, Feedback loop).
                    ${commonRules}
                `;

            case 'qa':
                return `
                    You are a QA Lead (Quality Assurance).
                    Task: Create a high-level test plan for "${concept}".
                    1. Core Mechanics Test Cases: List 3 critical gameplay scenarios that must be tested (e.g., Save corruption, Collision bugs).
                    2. Edge Cases: Identify potential weird scenarios players might try (Out of bounds, Network disconnect).
                    3. Device/Compatibility Checklist: Key hardware/software targets to verify performance.
                    ${commonRules}
                `;

            case 'marketing':
                return `
                    You are a Game User Acquisition (UA) & Marketing Expert.
                    Task: Create 3 ad creative concepts for the game/product concept "${concept}".
                    1. The "Hook" Video Idea: A 0-3s attention grabber concept (fail/win fail, satisfaction, etc.).
                    2. ASO Keywords & Slogan: Main title tag, subtitle, and short description keywords.
                    3. Target Audience Persona: Define the primary user demographic and their psychological triggers.
                    ${commonRules}
                `;

            case 'copywriter':
                return `
                    You are a Viral Social Media Copywriter (TikTok/Twitter/Instagram).
                    Task: Write 3 variations of social media posts for "${concept}".
                    1. Emotional/Story Hook: Focus on the narrative or feeling.
                    2. Feature/Benefit Hook: Focus on what makes it cool/useful.
                    3. Call to Action (FOMO): A sense of urgency or trend-following.
                    ${commonRules}
                `;

            case 'ad_creative_director':
                return `
                    You are a Direct Response Ad Creative Director (Meta/TikTok Ads).
                    Task: Create 3 high-converting video ad concepts for "${concept}".
                    1. Pain-Agitate-Solution (PAS): Start with a user problem, amplify it, then show the product as the fix.
                    2. User Testimonial / UGC Style: A relatable creator sharing their genuine experience and results.
                    3. The "Us vs Them" Comparison: Visually demonstrate why this product is superior to generic alternatives.
                    For each concept, include:
                    - Visual Hook (0-3s)
                    - Key Message
                    - Call to Action
                    ${commonRules}
                `;

            case 'director':
            default:
                return `
                    You are a professional Cinematographer and Director.
                    Task: Break down the concept "${concept}" into 3 distinct "Shot Requirements" for video generation.
                    1. Establishing Shot: Setting the scene, lighting, atmosphere.
                    2. Action Shot: The main character performing a key action.
                    3. Detail/Close-up: Focusing on a specific emotion or object detail.
                    Include Lens/Camera details (e.g., 35mm, wide angle, bokeh).
                    ${commonRules}
                `;
        }
    }
};
