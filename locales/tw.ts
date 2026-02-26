
export const tw = {
    appTitle: "Desora.Art 創意工坊",
    beta: "專業版",
    apiKey: "API 金鑰",
    addNode: "添加組件",
    save: "儲存", 
    backToHome: "專案列表",
    login: "登入",
    logout: "登出",
    upgrade: "升級",
    header: {
        back: "返回面板",
        save: "儲存專案",
        saveOnline: "雲端儲存 (Online)",
        exportLocal: "導出工程包 (.nexus)",
        savedSuccess: "專案已同步至雲端！",
        exportSuccess: "專案已導出。"
    },
    nav: {
        users: "帳號資訊",
        settings: "偏好設定",
        usage: "用量統計",
        connectors: "連接器"
    },
    usage: {
        title: "積分餘額",
        refill_date: "重置日期",
        recent_activity: "近期動態",
        activity_video: "影片生成",
        activity_image: "圖像生成",
        activity_chat: "AI 思考/邏輯",
        credits: "積分",
        ago_minutes: "分鐘前",
        ago_hours: "小時前"
    },
    settings: {
        title: "偏好設定",
        appearance: "外觀",
        interaction: "畫布與交互",
        dark_mode: "深色模式",
        light_mode: "淺色模式",
        auto_hide_handles: "自動隱藏連接點",
        auto_hide_desc: "僅在滑鼠懸停節點時顯示端口，保持畫面整潔。",
        show_grid: "顯示網格"
    },
    connectors: {
        title: "連接器",
        subtitle: "管理 AI 提供商與第三方集成。",
        tab_apps: "官方 API",
        tab_custom_api: "自定義 API",
        tab_mcp: "自定義 MCP",
        search_placeholder: "搜索連接器...",
        add_custom: "添加私有模型",
        no_connectors: "未找到連接器。",
        form_title: "添加私有模型",
        form_name: "模型名稱",
        form_endpoint: "API 端點",
        form_key: "API 金鑰",
        form_model_id: "模型 ID (可選)",
        form_save: "儲存連接",
        delete_confirm: "確認刪除此私有模型？",
        status_connected: "已連接",
        status_connect: "連接",
        status_config: "配置"
    },
    chat: {
        welcome: "嗨，我是您的 AI 設計師。讓我們開始今天的創作吧！您可以讓我生成圖片，甚至為您構建工作流程。",
        insert: "插入畫布",
        select_node: "選擇節點",
        create_new: "新建節點",
        insert_success: "已插入！"
    },
    categories: {
      input: "資產與輸入",
      agent: "邏輯與策劃",
      generate: "AI 生成器",
      output: "後期與合成",
      pro: "Pro 功能體"
    },
    nodeTypes: {
      text_input: "提示詞 (Prompt)",
      image_input: "參考素材 (Asset)", 
      character_ref: "角色 IP (Character)",
      image_gen: "視覺生成 (Visual)",
      image_upscale: "高清放大 (Upscale)",
      ai_refine: "潤色專家 (Refiner)",
      script_agent: "編劇/策劃 (Writer)",
      video_gen: "動態生成 (Motion)",
      audio_gen: "音訊生成 (Audio)",
      video_composer: "媒體合成 (Composer)",
      preview: "展示/透傳 (Preview)",
      sticky_note: "便條 (Note)",
      pro_icon_gen: "NOCRA Icons",
      pro_art_director: "AI 美術指導"
    },
    agent: {
        role_label: "AI 設定 (Role)",
        concept_placeholder: "輸入核心創意、故事梗概或產品賣點...",
        roles: {
            director: "劇情導演 / 編劇",
            game_designer: "遊戲系統策劃 (System)",
            level_designer: "遊戲關卡策劃 (Level)",
            art_director: "遊戲美術指導 (AD)",
            sound_designer: "音效/音頻總監",
            producer: "遊戲製作人 (Producer)",
            publisher: "遊戲發行製作人 (Issuing)",
            live_ops: "遊戲運營經理 (Live Ops)",
            community: "社群經理 (Community)",
            qa: "QA 測試主管 (Testing)",
            marketing: "市場運營 / UA投放",
            central_dispatcher: "中樞調度 (Central Dispatch)",
            copywriter: "社群文案 (IG/TikTok)"
        }
    },
    portLabels: {
      "Prompt": "提示詞",
      "Image Ref": "參考圖",
      "Character": "角色IP",
      "Concept": "創意概念",
      "Product": "產品資訊",
      "Script": "生成內容",
      "Text": "文本",
      "Image": "圖片",
      "Char Sheet": "角色卡",
      "Generated Image": "生成圖",
      "Ref Frame": "參考幀",
      "Video": "影片/動態",
      "Audio": "音訊",
      "Clips": "片段輸入",
      "Composition": "合成結果",
      "Raw Text": "原始內容",
      "Refined": "優化結果",
      "Upscaled": "4K結果",
      "Input": "輸入",
      "Output": "輸出",
      "Passthrough": "透傳輸出",
      "Cutout": "去背結果",
      "Rigged Char": "精靈圖",
      "Motion": "動作指令",
      "Anim Preview": "動畫預覽"
    },
    dataTypes: {
      "STRING": "文本",
      "IMAGE": "圖片",
      "VIDEO": "影片",
      "AUDIO": "音訊",
      "ANY": "通用"
    },
    placeholders: {
      text: "輸入劇情大綱、產品賣點或創意簡報...",
      script: "AI 將在此生成劇本、文案或企劃案...",
      video: "等待視覺信號輸入...",
      composer: "連接圖片或影片進行拼接...",
      character: "上傳角色三視圖或設計稿...",
      ref_image_gen: "描述需要的畫面風格...",
      audio_input: "輸入文本生成語音或音效...",
      audio_output: "音訊輸出",
      unnamed: "未命名",
      connect_idea: "連接創意節點...",
      waiting_input: "等待上游輸入..."
    },
    templates: {
      title: "專業工作流",
      empty: "空白畫布",
      smart_composition_name: "智能合成 / 移花接木",
      smart_composition_desc: "將【圖1】的物體/產品，完美融入【圖2】的場景或UI界面中。",
      app_store_assets_name: "App Store / Play Store 全套資產",
      app_store_assets_desc: "一鍵生成 8 張核心宣傳圖：包含 4 張豎版手機截圖 + 4 張橫版置頂大圖。",
      cinematic_video_name: "電影工業流",
      cinematic_video_desc: "劇本 -> 導演Agent -> 影片生成。經典 Text-to-Video 創作流。",
      character_ip_workflow_name: "角色 IP 一致性",
      character_ip_workflow_desc: "從角色設定卡出發，批量生成同一角色在不同場景下的表現。"
    },
    dashboard: {
      title: "創意工坊",
      newProject: "新建專案",
      import: "導入專案",
      lastUpdated: "更新於",
      untitled: "未命名專案",
      filterAll: "全部",
      menu: {
        rename: "重新命名",
        duplicate: "建立副本",
        duplicateWorkflow: "複製工作流",
        delete: "刪除",
        tags: "標籤管理",
        copyPrefix: "副本 - "
      },
      tags: {
        title: "標籤",
        placeholder: "新標籤...",
        add: "添加",
        empty: "無標籤"
      },
      deleteConfirm: {
        title: "刪除專案？",
        description: "此操作將永久刪除畫布及所有生成的資產。",
        confirm: "確認刪除",
        cancel: "取消"
      }
    },
    loading: {
      initializing: "工坊啟動中...",
      fetching: "讀取專案...",
      assets: "同步素材...",
      graph: "構建邏輯...",
      finalizing: "就緒",
      tips: [
        "提示: '視覺生成' 節點不僅做影片關鍵幀，也能做海報和 UI 界面。",
        "提示: 將角色 IP 節點連接到多個生成器，保持人物一致性。",
        "提示: 雙擊節點標題可自定義名稱，如'第一章'、'主頁設計'。"
      ]
    },
    processingTitle: "素材處理器",
    filters: "濾鏡",
    loadingOpenCV: "引擎加載中...",
    useImage: "使用素材",
    actions: {
      run: "執行",
      regenerate: "重試",
      download: "導出",
      copy: "複製",
      copied: "已複製",
      processing: "生成中...",
      completed: "完成",
      upload: "上傳",
      replace_image: "替換",
      select_model: "模型",
      aspect_ratio: "比例",
      voice: "音色",
      confirm_del: "刪除?",
      generate: "生成",
      rename_tooltip: "重命名",
      writing_script: "撰寫中..."
    },
    video_settings: {
        input_pos: "參考幀",
        start_frame: "起始",
        end_frame: "結束"
    },
    character: {
      tab_upload: "上傳",
      tab_generate: "生成",
      name_placeholder: "角色名稱",
      desc_placeholder: "外貌特徵描述...",
      gen_btn: "生成 IP 檔案",
      rule_tip: "建議: 正面、白底、全身。",
      id_label: "IP ID",
      active_ref: "已鏈接",
      active_id: "生效中",
      locked_tip: "IP 已鎖定，將應用於下游。"
    },
    alerts: {
      confirmDelete: "移除組件？",
      projectSaved: "已儲存"
    },
    auth: {
      title: "登入 Desora.Art",
      subtitle: "Unified Creative Studio",
      email_label: "信箱",
      email_placeholder: "輸入信箱",
      password_label: "密碼",
      password_placeholder: "••••••••",
      forgot_password: "忘記密碼？",
      sign_in: "登入",
      or_continue: "其他方式",
      no_account: "沒有帳號？",
      sign_up: "註冊",
      policy: "登入即代表同意服務條款。"
    },
    zoom: {
        in: "放大",
        out: "縮小",
        fit: "適合螢幕",
        reset: "縮放至100%"
    }
};
