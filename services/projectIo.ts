
import JSZip from 'jszip';
import { Project } from '../types';

// Detect mime type extension
const getExtension = (blob: Blob, url: string): string => {
    if (blob.type === 'video/mp4') return 'mp4';
    if (blob.type === 'image/png') return 'png';
    if (blob.type === 'image/jpeg') return 'jpg';
    if (blob.type === 'image/webp') return 'webp';
    if (blob.type === 'audio/wav') return 'wav';
    if (blob.type === 'audio/mpeg') return 'mp3';
    // Fallback based on simple logic or url
    return 'bin';
};

// --- Export Logic ---

export const exportProjectPackage = async (
    project: Project, 
    onProgress?: (msg: string, percent: number) => void
): Promise<Blob> => {
    const zip = new JSZip();
    const assetsFolder = zip.folder("assets");
    
    // Deep clone to modify paths without affecting current state
    const pkgProject: Project = JSON.parse(JSON.stringify(project));
    
    // Tracking for deduplication
    const processedUrls = new Map<string, string>();
    const nodesCount = pkgProject.nodes.length;
    
    // Helper to process a value
    const processAsset = async (val: string, prefix: string): Promise<string> => {
        if (!val || typeof val !== 'string') return val;
        
        // 1. Process blob URLs (generated content) OR HTTP/HTTPS URLs (Local/Remote uploads)
        if (val.startsWith('blob:') || val.startsWith('http:') || val.startsWith('https:')) {
            if (processedUrls.has(val)) return processedUrls.get(val)!;

            try {
                const response = await fetch(val);
                if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
                
                const blob = await response.blob();
                const ext = getExtension(blob, val);
                const filename = `${prefix}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
                const path = `assets/${filename}`;
                
                if (assetsFolder) {
                    assetsFolder.file(filename, blob);
                    processedUrls.set(val, path);
                    return path;
                }
            } catch (e) {
                console.warn(`Failed to package asset: ${val}`, e);
                // Try to fallback to base64 if it's a local image that failed fetch? 
                // No, if fetch fails, we can't do much. Keep original.
                return val; 
            }
        } 
        // 2. Process Data URLs (Base64) - Optimize JSON size
        else if (val.startsWith('data:')) {
            if (processedUrls.has(val)) return processedUrls.get(val)!;

            const matches = val.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            if (matches) {
                const mime = matches[1];
                const base64Data = matches[2];
                
                let ext = 'bin';
                if (mime.includes('png')) ext = 'png';
                else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
                else if (mime.includes('webp')) ext = 'webp';
                else if (mime.includes('mp4')) ext = 'mp4';
                else if (mime.includes('wav')) ext = 'wav';
                else if (mime.includes('mpeg') || mime.includes('mp3')) ext = 'mp3';

                const filename = `${prefix}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
                const path = `assets/${filename}`;
                
                if (assetsFolder) {
                    assetsFolder.file(filename, base64Data, { base64: true });
                    processedUrls.set(val, path);
                    return path;
                }
            }
        }

        return val;
    };

    // Iterate Nodes
    for (let i = 0; i < pkgProject.nodes.length; i++) {
        const node = pkgProject.nodes[i];
        if (onProgress) onProgress(`Packing node ${i + 1}/${nodesCount}`, 20 + Math.floor((i / nodesCount) * 60));

        // 1. Output Result (Single)
        if (node.data.outputResult) {
            node.data.outputResult = await processAsset(node.data.outputResult, `${node.id}_out`);
        }

        // 2. Output List (Multiple)
        if (node.data.outputList) {
            for (let j = 0; j < node.data.outputList.length; j++) {
                node.data.outputList[j] = await processAsset(node.data.outputList[j], `${node.id}_list_${j}`);
            }
        }

        // 3. Inputs (Values)
        if (node.data.value && (node.data.value.startsWith('blob:') || node.data.value.startsWith('data:'))) {
            node.data.value = await processAsset(node.data.value, `${node.id}_val`);
        }
        
        // 4. Settings Images
        if (node.data.settings) {
             const s = node.data.settings;
             if (s.startImageBase64 && (s.startImageBase64.startsWith('blob:') || s.startImageBase64.startsWith('data:'))) {
                 s.startImageBase64 = await processAsset(s.startImageBase64, `${node.id}_start`);
             }
             if (s.endImageBase64 && (s.endImageBase64.startsWith('blob:') || s.endImageBase64.startsWith('data:'))) {
                 s.endImageBase64 = await processAsset(s.endImageBase64, `${node.id}_end`);
             }
        }
    }

    // Add Metadata
    pkgProject.updatedAt = Date.now();
    zip.file("project.json", JSON.stringify(pkgProject, null, 2));
    
    if (onProgress) onProgress("Compressing package...", 90);
    
    return await zip.generateAsync({ type: "blob" });
};

// --- Import Logic ---

export const importProjectPackage = async (
    file: File,
    onProgress?: (msg: string) => void
): Promise<Project> => {
    if (onProgress) onProgress("Unzipping package...");
    
    const zip = await JSZip.loadAsync(file);
    const projectFile = zip.file("project.json");
    if (!projectFile) throw new Error("Invalid .nexus package: Missing project.json");

    const projectJson = await projectFile.async("string");
    const project: Project = JSON.parse(projectJson);

    // Helper to restore
    const restoreAsset = async (val: string): Promise<string> => {
        if (val && typeof val === 'string' && val.startsWith('assets/')) {
            try {
                const file = zip.file(val);
                if (file) {
                    // Determine mime type from extension
                    const ext = val.split('.').pop()?.toLowerCase();
                    let type = 'application/octet-stream';
                    if (ext === 'mp4') type = 'video/mp4';
                    else if (ext === 'png') type = 'image/png';
                    else if (ext === 'jpg' || ext === 'jpeg') type = 'image/jpeg';
                    else if (ext === 'wav') type = 'audio/wav';
                    else if (ext === 'mp3') type = 'audio/mpeg';
                    else if (ext === 'webp') type = 'image/webp';

                    const blob = await file.async("blob");
                    const typedBlob = new Blob([blob], { type });
                    
                    // Convert to Data URL (Base64) for persistent storage compatibility
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(typedBlob);
                    });
                } else {
                    console.warn(`Asset missing in package: ${val}`);
                    return ""; // Return empty string instead of broken path to avoid 404s
                }
            } catch (e) {
                console.warn(`Failed to restore asset ${val}`, e);
                return ""; // Fail gracefully
            }
        }
        return val;
    };

    if (onProgress) onProgress("Restoring assets...");

    // Restore Assets
    for (const node of project.nodes) {
        if (node.data.outputResult) node.data.outputResult = await restoreAsset(node.data.outputResult);
        if (node.data.value) node.data.value = await restoreAsset(node.data.value);
        
        if (node.data.outputList) {
            for (let i = 0; i < node.data.outputList.length; i++) {
                node.data.outputList[i] = await restoreAsset(node.data.outputList[i]);
            }
        }
        
        if (node.data.settings) {
             const s = node.data.settings;
             if (s.startImageBase64?.startsWith('assets/')) s.startImageBase64 = await restoreAsset(s.startImageBase64);
             if (s.endImageBase64?.startsWith('assets/')) s.endImageBase64 = await restoreAsset(s.endImageBase64);
        }
    }

    // Renew ID to prevent collision if imported multiple times
    project.id = Math.random().toString(36).substr(2, 9);
    project.name = `${project.name} (Imported)`;
    project.updatedAt = Date.now();

    return project;
};
