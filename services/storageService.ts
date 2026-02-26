import { Project, User, WorkflowNode, WorkflowEdge, AppSettings, CommentThread, CommentMessage } from "../types";
import { api, getAuthToken } from "./api";
import { db, STORE_KEYS } from "./db";

// --- Storage Keys ---
const STORAGE_KEY_PROJECTS = 'enexus_projects';
const STORAGE_KEY_USER = 'enexus_user';
const STORAGE_KEY_API_KEY = 'enexus_api_key';
const STORAGE_KEY_SETTINGS = 'enexus_settings';

// --- Settings ---
const DEFAULT_SETTINGS: AppSettings = {
    autoHideHandles: false,
    showGrid: true,
    snapToGrid: true,
    zoomSensitivity: 1.5,
    adaptiveZoomMin: 0.4,
    adaptiveZoomMax: 1.2,
    performanceModeThreshold: 1.0,
    gridType: 'dots',
    gridOpacity: 0.05,
    canvasBgColor: '' // Empty means use theme default
};

export const getAppSettings = (): AppSettings => {
    try {
        const s = localStorage.getItem(STORAGE_KEY_SETTINGS);
        return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS;
    } catch (e) { return DEFAULT_SETTINGS; }
};

export const saveAppSettings = async (settings: AppSettings) => {
    try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
        if (getAuthToken()) {
            // TODO: Sync settings API
        }
    } catch (e) {}
};

// --- API Key ---
export const saveLocalApiKey = (key: string) => {
    try {
        if (!key) localStorage.removeItem(STORAGE_KEY_API_KEY);
        else localStorage.setItem(STORAGE_KEY_API_KEY, key);
    } catch (e) {}
};

export const getLocalApiKey = () => {
    try { return localStorage.getItem(STORAGE_KEY_API_KEY); } catch (e) { return null; }
};

// --- User Auth Helpers ---
export const getCurrentUser = (): User | null => {
    try {
        const u = localStorage.getItem(STORAGE_KEY_USER);
        return u ? JSON.parse(u) : null;
    } catch (e) { return null; }
};

export const updateUserInStorage = (user: User) => {
    try { localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user)); } catch (e) {}
};

// --- Projects (Hybrid: Local + Remote) ---

// Helper to migrate from LocalStorage to IndexedDB
const migrateFromLocalStorage = async () => {
    try {
        const p = localStorage.getItem(STORAGE_KEY_PROJECTS);
        if (p) {
            console.log("Migrating projects from LocalStorage to IndexedDB...");
            const projects = JSON.parse(p) as Project[];
            for (const project of projects) {
                // Ensure we don't overwrite newer data if IDB already has it (unlikely in this flow, but good practice)
                const existing = await db.get<Project>(STORE_KEYS.PROJECTS, project.id);
                if (!existing || existing.updatedAt < project.updatedAt) {
                    await db.put(STORE_KEYS.PROJECTS, project);
                }
            }
            // Clear LocalStorage after successful migration
            localStorage.removeItem(STORAGE_KEY_PROJECTS);
            console.log("Migration complete.");
        }
    } catch (e) {
        console.error("Migration failed:", e);
    }
};

const getLocalProjects = async (): Promise<Project[]> => {
    try {
        // Check migration first (only happens once effectively due to removeItem)
        await migrateFromLocalStorage();
        
        const projects = await db.getAll<Project>(STORE_KEYS.PROJECTS);
        
        // Sanitize: Check for expired Blob URLs
        let hasChanges = false;
        const sanitize = (val?: string) => (val && val.startsWith('blob:') ? '' : val);

        for (const proj of projects) {
            let projChanged = false;
            if (proj.nodes) {
                proj.nodes.forEach(node => {
                    if (node.data.value) {
                         const newVal = sanitize(node.data.value);
                         if (newVal !== node.data.value) { node.data.value = newVal; projChanged = true; }
                    }
                    if (node.data.outputResult) {
                         const newVal = sanitize(node.data.outputResult);
                         if (newVal !== node.data.outputResult) { node.data.outputResult = newVal; projChanged = true; }
                    }
                    if (node.data.outputList) {
                        node.data.outputList = node.data.outputList.map(v => {
                            const nv = sanitize(v);
                            if (nv !== v) projChanged = true;
                            return nv!;
                        }).filter(Boolean);
                    }
                    if (node.data.settings) {
                        if (node.data.settings.startImageBase64) {
                            const nv = sanitize(node.data.settings.startImageBase64);
                            if (nv !== node.data.settings.startImageBase64) { node.data.settings.startImageBase64 = nv; projChanged = true; }
                        }
                        if (node.data.settings.endImageBase64) {
                            const nv = sanitize(node.data.settings.endImageBase64);
                            if (nv !== node.data.settings.endImageBase64) { node.data.settings.endImageBase64 = nv; projChanged = true; }
                        }
                    }
                });
            }
            
            // Sanitize Chat History
            if (proj.chatHistory) {
                proj.chatHistory = proj.chatHistory.map(msg => {
                    if (msg.data?.url) {
                        const newUrl = sanitize(msg.data.url);
                        if (newUrl !== msg.data.url) {
                            msg.data.url = newUrl;
                            projChanged = true;
                        }
                    }
                    return msg;
                });
            }

            if (projChanged) {
                await db.put(STORE_KEYS.PROJECTS, proj);
                hasChanges = true;
            }
        }

        if (hasChanges) {
             console.log("Sanitized expired Blob URLs from storage.");
        }

        return projects.sort((a: Project, b: Project) => b.updatedAt - a.updatedAt);
    } catch (e) { return []; }
};

// 1. Get Projects
export const fetchProjects = async (): Promise<Project[]> => {
    if (getAuthToken()) {
        try {
            const remoteProjects = await api.projects.list();
            
            // Intelligent Merge: Prefer newer local version to prevent overwrite by stale remote data
            const localProjects = await getLocalProjects();
            const projectMap = new Map<string, Project>();

            // 1. Start with remote projects (Source of Truth for existence)
            remoteProjects.forEach(p => projectMap.set(p.id, p));

            // 2. Overlay newer local versions
            for (const lp of localProjects) {
                const rp = projectMap.get(lp.id);
                if (rp) {
                    // If remote has it, but local is newer, keep local
                    if (lp.updatedAt > rp.updatedAt) {
                        projectMap.set(lp.id, lp);
                    }
                } else {
                    // FIXED: If remote doesn't have it, keep local version.
                    projectMap.set(lp.id, lp);
                }
            }

            const mergedProjects = Array.from(projectMap.values())
                .sort((a, b) => b.updatedAt - a.updatedAt);

            // Sync merged back to DB
            for (const p of mergedProjects) {
                await db.put(STORE_KEYS.PROJECTS, p);
            }
            
            return mergedProjects;
        } catch (e) {
            console.warn("Backend unreachable, falling back to local storage.", e);
        }
    }
    return getLocalProjects();
};

export const getProjects = async (): Promise<Project[]> => getLocalProjects();

// 2. Save Project
const blobToBase64 = async (blobUrl: string): Promise<string> => {
    try {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Failed to convert blob to base64:", blobUrl, e);
        return blobUrl; // Fallback, though likely to fail persistence
    }
};

export const saveProject = async (originalProject: Project): Promise<Project> => {
    // Deep copy to avoid mutating the original object (especially nodes/state)
    const project = JSON.parse(JSON.stringify(originalProject));

    // Convert all Blob URLs to Base64 before saving
    const tasks: Promise<void>[] = [];

    const processValue = (obj: any, key: string) => {
        const val = obj[key];
        if (typeof val === 'string' && val.startsWith('blob:')) {
            tasks.push(blobToBase64(val).then(b64 => { obj[key] = b64; }));
        }
    };

    // 1. Thumbnail
    processValue(project, 'thumbnail');

    // 2. Nodes
    if (project.nodes) {
        for (const node of project.nodes) {
            processValue(node.data, 'value');
            processValue(node.data, 'outputResult');
            
            if (node.data.outputList && Array.isArray(node.data.outputList)) {
                node.data.outputList.forEach((v: string, i: number) => {
                     if (typeof v === 'string' && v.startsWith('blob:')) {
                         tasks.push(blobToBase64(v).then(b64 => { node.data.outputList[i] = b64; }));
                     }
                });
            }
            
            if (node.data.settings) {
                processValue(node.data.settings, 'startImageBase64');
                processValue(node.data.settings, 'endImageBase64');
            }
        }
    }

    // 3. Chat History
    if (project.chatHistory) {
        for (const msg of project.chatHistory) {
             if (msg.data) processValue(msg.data, 'url');
        }
    }

    // Wait for all conversions to finish
    if (tasks.length > 0) {
        await Promise.all(tasks);
    }

    // 4. Save Local (Optimistic)
    try {
        project.updatedAt = Date.now();
        await db.put(STORE_KEYS.PROJECTS, project);
    } catch (e) {
        console.error("Local storage save failed:", e);
        throw new Error("Storage full or inaccessible");
    }

    // 5. Save Remote
    if (getAuthToken()) {
        try {
            await api.projects.save(project);
        } catch (e) { 
            console.error("Failed to save to backend", e); 
            // We don't throw here because local save might have succeeded
        }
    }
    
    return project;
};

// 3. Create Project
export const createNewProject = async (): Promise<Project> => {
    const newProject: Project = {
        id: Math.random().toString(36).substr(2, 9),
        name: 'Untitled Project',
        updatedAt: Date.now(),
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        tags: []
    };
    return await saveProject(newProject);
};

// 4. Update Thumbnail
export const updateProjectThumbnail = async (projectId: string, thumbnailUrl: string) => {
    const p = await db.get<Project>(STORE_KEYS.PROJECTS, projectId);
    if (p) {
        p.thumbnail = thumbnailUrl;
        await saveProject(p);
    }
};

// 5. Delete Project
export const deleteProject = async (projectId: string): Promise<Project[]> => {
    // Local
    await db.delete(STORE_KEYS.PROJECTS, projectId);

    // Remote
    if (getAuthToken()) {
        try {
            await api.projects.delete(projectId);
        } catch (e) {}
    }
    
    return getLocalProjects();
};

// 6. Rename Project
export const renameProject = async (projectId: string, newName: string): Promise<Project[]> => {
    const p = await db.get<Project>(STORE_KEYS.PROJECTS, projectId);
    if (p) {
        p.name = newName;
        await saveProject(p);
    }
    return getLocalProjects(); 
};

// 7. Duplicate
export const duplicateProject = async (projectId: string, onlyWorkflow: boolean = false, copyPrefix: string = 'Copy of '): Promise<Project[]> => {
    const source = await db.get<Project>(STORE_KEYS.PROJECTS, projectId);
    if (!source) return getLocalProjects();

    const newProject: Project = JSON.parse(JSON.stringify(source));
    newProject.id = Math.random().toString(36).substr(2, 9);
    newProject.name = `${copyPrefix}${source.name}`;
    newProject.updatedAt = Date.now();
    
    if (onlyWorkflow) {
        newProject.thumbnail = undefined;
        newProject.nodes = newProject.nodes.map(n => ({
            ...n,
            status: 'idle',
            data: { ...n.data, value: n.type.includes('input') ? '' : n.data.value, outputResult: undefined }
        }));
    }

    await saveProject(newProject);
    return fetchProjects(); // Refetch to ensure sync
};

export const updateProjectTags = async (projectId: string, tags: string[]): Promise<Project[]> => {
    const p = await db.get<Project>(STORE_KEYS.PROJECTS, projectId);
    if (p) {
        p.tags = tags;
        await saveProject(p);
    }
    return fetchProjects();
};

// --- Asset Upload Helper ---
export const uploadAsset = async (file: File): Promise<string> => {
    if (getAuthToken()) {
        try {
            const data = await api.upload(file);
            return data.url;
        } catch (e) { console.error("Upload failed", e); }
    }
    // Fallback to base64
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// --- Project Comments ---
export const getProjectComments = (projectId: string): CommentMessage[] => {
    try {
        const raw = localStorage.getItem(`enexus_comments_${projectId}`);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
};

export const addProjectComment = (projectId: string, msg: CommentMessage): CommentMessage[] => {
    try {
        const list = getProjectComments(projectId);
        const next = [...list, msg];
        localStorage.setItem(`enexus_comments_${projectId}`, JSON.stringify(next));
        return next;
    } catch { return []; }
};

// --- Comment Threads ---
export const getProjectCommentThreads = (projectId: string): CommentThread[] => {
    try {
        const raw = localStorage.getItem(`enexus_comment_threads_${projectId}`);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
};

export const saveProjectCommentThreads = (projectId: string, threads: CommentThread[]) => {
    try {
        localStorage.setItem(`enexus_comment_threads_${projectId}`, JSON.stringify(threads));
    } catch {}
};

export const createProjectCommentThread = (projectId: string, x: number, y: number): CommentThread => {
    const threads = getProjectCommentThreads(projectId);
    const thread: CommentThread = { id: Math.random().toString(36).slice(2), x, y, messages: [] };
    const next = [...threads, thread];
    saveProjectCommentThreads(projectId, next);
    return thread;
};

export const addProjectCommentMessage = (projectId: string, threadId: string, msg: CommentMessage): CommentThread[] => {
    const threads = getProjectCommentThreads(projectId);
    const next = threads.map(t => t.id === threadId ? { ...t, messages: [...t.messages, msg] } : t);
    saveProjectCommentThreads(projectId, next);
    return next;
};
