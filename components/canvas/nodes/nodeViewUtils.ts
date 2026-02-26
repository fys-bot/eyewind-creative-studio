
import React from 'react';

import { AppSettings } from '../../../types';

export const handleDownload = (e: React.MouseEvent, url: string, filename: string) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

export const handleCopy = async (e: React.MouseEvent, text: string, onCopy?: () => void) => {
    e.stopPropagation();
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            if (onCopy) onCopy();
        } else {
            throw new Error('Clipboard API unavailable');
        }
    } catch (err) {
        // Fallback
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful && onCopy) {
                onCopy();
            }
        } catch (fallbackErr) {
            console.error('Copy failed', fallbackErr);
        }
    }
};

export interface NodeViewProps {
    node: any; // Using any to avoid circular deps with types, or import WorkflowNode
    isExpanded: boolean;
    t: any;
    onUpdateData: (id: string, data: any) => void;
    contentHeight: number;
    borderRadius: number;
    zoom: number; // Added zoom prop
    settings?: AppSettings; // Added settings prop
}
