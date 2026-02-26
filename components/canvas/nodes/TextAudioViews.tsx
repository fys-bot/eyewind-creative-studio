
import React, { useState, useEffect, useRef } from 'react';
import { Copy, Loader2, Download, Send, Bot, User, Sparkles, Trash2, CheckCircle } from 'lucide-react';
import { handleDownload, handleCopy, NodeViewProps } from './nodeViewUtils';
import { googleGenerateText } from '../../../services/geminiService';

export const TextInputView: React.FC<NodeViewProps> = ({ node, isExpanded, contentHeight, t, onUpdateData }) => {
    // Local state for input value to avoid laggy typing
    const [localValue, setLocalValue] = useState(node.data.value || '');
    
    useEffect(() => {
        setLocalValue(node.data.value || '');
    }, [node.data.value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        setLocalValue(newVal);
        // Debounce update to parent/store if needed, or update directly
        onUpdateData(node.id, { value: newVal });
    };

    return (
        <div style={{ height: `${contentHeight}px`, position: 'relative' }}>
            <textarea
                className="w-full h-full resize-none bg-gray-50/50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100/50 dark:border-gray-700/50 outline-none text-xs text-gray-800 dark:text-gray-200 font-medium placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors focus:bg-white dark:focus:bg-gray-800 focus:border-indigo-500/50 dark:focus:border-indigo-500/50 cursor-text select-text"
                style={{ fontSize: isExpanded ? '14px' : '12px' }}
                value={localValue}
                onChange={handleChange}
                placeholder={t.placeholders.text || "Enter text here..."}
                // Stop propagation to prevent dragging the node when interacting with textarea
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onWheel={(e) => {
                    // Only stop propagation if it's NOT a pinch gesture (ctrlKey is false)
                    // This allows Pinch-to-Zoom (Ctrl+Wheel) to pass through to the canvas
                    if (!e.ctrlKey && !e.metaKey) {
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                    }
                }}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
            />
        </div>
    );
};

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

export const ScriptAgentView: React.FC<NodeViewProps> = ({ node, isExpanded, contentHeight, t, onUpdateData }) => {
    const [messages, setMessages] = useState<ChatMessage[]>(node.data.messages || []);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Initialize with concept if present and no messages
    useEffect(() => {
        const concept = node.data.inputs?.['concept'];
        if (concept && messages.length === 0 && !node.data.outputResult) {
            handleSendMessage(`Generate a script based on this concept: "${concept}"`);
        }
    }, [node.data.inputs?.['concept']]);

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return;

        const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            // Construct context from history
            const historyContext = newMessages.map(m => `${m.role}: ${m.content}`).join('\n');
            const prompt = `You are a professional creative assistant inside a node-based workflow. 
            Your goal is to help the user generate high-quality text content (scripts, prompts, ideas).
            Current Context/History:
            ${historyContext}
            
            User's latest request: "${text}"
            
            Please provide a helpful, creative response. If generating a script or content, just output the content directly.`;

            const result = await googleGenerateText({ 
                model: 'gemini-3-flash-preview', 
                prompt: prompt 
            });

            const finalMessages: ChatMessage[] = [...newMessages, { role: 'model', content: result }];
            setMessages(finalMessages);
            
            // Update node data for persistence and downstream nodes
            onUpdateData(node.id, { 
                messages: finalMessages,
                outputResult: result // The latest AI response is the node output
            });

        } catch (error) {
            console.error("Agent Error:", error);
            setMessages(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error. Please check your API connection." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearChat = () => {
        setMessages([]);
        onUpdateData(node.id, { 
            messages: [],
            outputResult: null 
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(input);
        }
    };

    return (
        <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl overflow-hidden" style={{ height: `${contentHeight}px` }}>
            {/* Header / Actions */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50">
                 <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={10} /> AI Agent
                 </span>
                 <button 
                    onClick={handleClearChat}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-red-500 transition-colors"
                    title="Clear Chat"
                 >
                    <Trash2 size={12} />
                 </button>
            </div>

            {/* Chat Area */}
            <div 
                className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 bg-gray-50/50 dark:bg-gray-950/30 cursor-text select-text"
                onWheel={(e) => {
                    // Only stop propagation if it's NOT a pinch gesture (ctrlKey is false)
                    if (!e.ctrlKey && !e.metaKey) {
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                    }
                }}
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 space-y-2 opacity-70">
                        <Bot size={24} />
                        <span className="text-xs text-center px-4">Chat with me to generate content, or connect an input to start.</span>
                    </div>
                )}
                
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 
                            ${msg.role === 'user' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300'}`}>
                            {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                        </div>
                        <div className={`text-xs px-3 py-2 rounded-2xl max-w-[85%] leading-relaxed whitespace-pre-wrap
                            ${msg.role === 'user' 
                                ? 'bg-blue-500 text-white rounded-tr-sm shadow-sm' 
                                : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-tl-sm shadow-sm'}`}>
                            {msg.content}
                            {msg.role === 'model' && (
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                                     <span className="text-[9px] text-green-500 flex items-center gap-1 font-medium bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
                                        <CheckCircle size={8} /> Active Output
                                     </span>
                                     <button 
                                        onClick={(e) => handleCopy(e, msg.content)} 
                                        className="ml-auto opacity-50 hover:opacity-100 transition-opacity"
                                        title="Copy"
                                    >
                                        <Copy size={10} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300 flex items-center justify-center flex-shrink-0">
                            <Bot size={14} />
                        </div>
                        <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl rounded-tl-sm border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-2 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-end gap-2">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe what you want..."
                    className="flex-1 text-xs max-h-20 min-h-[36px] bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-500/50 resize-none custom-scrollbar dark:text-white cursor-text select-text"
                    rows={1}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onWheel={(e) => {
                        // Only stop propagation if it's NOT a pinch gesture (ctrlKey is false)
                        if (!e.ctrlKey && !e.metaKey) {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                        }
                    }}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                />
                <button 
                    onClick={() => handleSendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className="p-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex-shrink-0"
                >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
            </div>
        </div>
    );
};

export const AiRefineView: React.FC<NodeViewProps> = ({ node, isExpanded, contentHeight, t }) => {
    const [isCopied, setIsCopied] = useState(false);
    useEffect(() => {
        if (isCopied) {
            const timer = setTimeout(() => setIsCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [isCopied]);

    return (
        <div style={{ height: `${contentHeight}px`, position: 'relative' }}>
            <div className="text-xs text-gray-500 italic overflow-hidden bg-gray-50/50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 relative group/text" style={{ height: '100%', fontSize: isExpanded ? '14px' : '12px' }}>
                {node.data.outputResult ? (
                     <>
                        <div className="pr-4 leading-relaxed dark:text-gray-300">{node.data.outputResult}</div>
                        <button onClick={(e) => handleCopy(e, node.data.outputResult!, () => setIsCopied(true))} className="absolute top-3 right-3 p-1.5 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg opacity-0 group-hover/text:opacity-100 transition-opacity hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm border border-gray-200 dark:border-gray-600"><Copy size={12}/></button>
                     </>
                ) : t.placeholders.waiting_input}
            </div>
        </div>
    );
};

export const PromptTranslatorView: React.FC<NodeViewProps> = ({ node, isExpanded, contentHeight, t }) => {
    const [isCopied, setIsCopied] = useState(false);
    useEffect(() => {
        if (isCopied) {
            const timer = setTimeout(() => setIsCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [isCopied]);

    return (
        <div style={{ height: `${contentHeight}px`, position: 'relative' }}>
            <div className="text-xs text-gray-500 italic overflow-hidden bg-orange-50/50 dark:bg-orange-950/30 p-4 rounded-xl border border-orange-100 dark:border-orange-900 relative group/text" style={{ height: '100%', fontSize: isExpanded ? '14px' : '12px' }}>
                {node.data.outputResult ? (
                     <>
                        <div className="pr-4 leading-relaxed dark:text-orange-200 text-orange-800">{node.data.outputResult}</div>
                        <button onClick={(e) => handleCopy(e, node.data.outputResult!, () => setIsCopied(true))} className="absolute top-3 right-3 p-1.5 bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-300 rounded-lg opacity-0 group-hover/text:opacity-100 transition-opacity hover:bg-orange-50 dark:hover:bg-orange-900 shadow-sm border border-orange-200 dark:border-orange-800"><Copy size={12}/></button>
                     </>
                ) : <span className="text-orange-300 dark:text-orange-700">Waiting for text...</span>}
            </div>
        </div>
    );
};

export const AudioGenView: React.FC<NodeViewProps> = ({ node, contentHeight, t }) => {
    return (
        <div className="flex items-center justify-center bg-pink-50/30 dark:bg-pink-900/20 rounded-xl border border-pink-100 dark:border-pink-800 relative group" style={{ height: contentHeight }}>
            {node.data.outputResult ? (
                <>
                    <audio src={node.data.outputResult} controls className="w-full h-8 px-2" />
                    <button onClick={(e) => handleDownload(e, node.data.outputResult!, `audio_${node.id}.wav`)} className="absolute -top-2 -right-2 p-1.5 bg-pink-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-pink-600 shadow-sm"><Download size={10}/></button>
                </>
            ) : <span className="text-xs text-pink-300 font-medium">{t.placeholders.audio_output || "Audio Output"}</span>}
        </div>
    );
};
