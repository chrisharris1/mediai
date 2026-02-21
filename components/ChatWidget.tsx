'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import {
    MessageSquare,
    X,
    Send,
    Trash2,
    Loader2,
    Pill,
    Activity,
    Stethoscope,
    UserCheck,
    Sparkles,
    GripVertical,
    Minimize2,
    Maximize2
} from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface Position {
    x: number;
    y: number;
}

const QUICK_ACTIONS = [
    { label: '💊 What do I take today?', message: 'What medicines do I need to take today?' },
    { label: '📊 My adherence stats', message: 'Show me my medication adherence statistics' },
    { label: '💉 Add a medicine', message: 'I want to add a new medicine to my tracker' },
    { label: '👨‍⚕️ Find a doctor', message: 'Help me find a doctor' },
    { label: '🩺 Check symptoms', message: 'I want to check my symptoms' },
];

export default function ChatWidget() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Dragging state
    const [position, setPosition] = useState<Position>({ x: 20, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Load position from localStorage
    useEffect(() => {
        const savedPosition = localStorage.getItem('chatWidgetPosition');
        if (savedPosition) {
            try {
                const pos = JSON.parse(savedPosition);
                setPosition(pos);
            } catch (e) {
                console.error('Failed to parse saved position');
            }
        }
    }, []);

    // Save position to localStorage
    useEffect(() => {
        if (!isDragging) {
            localStorage.setItem('chatWidgetPosition', JSON.stringify(position));
        }
    }, [position, isDragging]);

    // Load chat history when opened
    useEffect(() => {
        if (isOpen && session?.user && messages.length === 0) {
            loadChatHistory();
        }
    }, [isOpen, session]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && !isMinimized) {
            inputRef.current?.focus();
        }
    }, [isOpen, isMinimized]);

    // Handle dragging
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
        }
        setIsDragging(true);
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging) {
            const newX = window.innerWidth - e.clientX - (60 - dragOffset.x);
            const newY = window.innerHeight - e.clientY - (60 - dragOffset.y);

            // Keep within bounds
            const boundedX = Math.max(10, Math.min(newX, window.innerWidth - 80));
            const boundedY = Math.max(10, Math.min(newY, window.innerHeight - 80));

            setPosition({ x: boundedX, y: boundedY });
        }
    }, [isDragging, dragOffset]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Touch events for mobile
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const touch = e.touches[0];
            setDragOffset({
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top,
            });
        }
        setIsDragging(true);
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (isDragging) {
            const touch = e.touches[0];
            const newX = window.innerWidth - touch.clientX - (60 - dragOffset.x);
            const newY = window.innerHeight - touch.clientY - (60 - dragOffset.y);

            const boundedX = Math.max(10, Math.min(newX, window.innerWidth - 80));
            const boundedY = Math.max(10, Math.min(newY, window.innerHeight - 80));

            setPosition({ x: boundedX, y: boundedY });
        }
    }, [isDragging, dragOffset]);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleMouseUp);
            return () => {
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleMouseUp);
            };
        }
    }, [isDragging, handleTouchMove, handleMouseUp]);

    const loadChatHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const response = await fetch('/api/chat/history?limit=50');
            const data = await response.json();

            if (data.success && data.messages) {
                setMessages(data.messages.map((m: any) => ({
                    ...m,
                    timestamp: new Date(m.timestamp),
                })));
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const sendMessage = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: messageText,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText }),
            });

            const data = await response.json();

            if (data.success) {
                const assistantMessage: Message = {
                    role: 'assistant',
                    content: data.message,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, assistantMessage]);
            } else {
                const errorMessage: Message = {
                    role: 'assistant',
                    content: '❌ Sorry, I encountered an error. Please try again.',
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: '❌ Connection error. Please check your internet and try again.',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(inputMessage);
    };

    const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
        sendMessage(action.message);
    };

    const clearHistory = async () => {
        if (!confirm('Are you sure you want to clear your chat history?')) return;

        try {
            await fetch('/api/chat/history', { method: 'DELETE' });
            setMessages([]);
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    };

    // Don't render on public pages or if not logged in
    const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
    const isPublicPage = publicPaths.some(path => pathname?.startsWith(path));

    if (status !== 'authenticated' || isPublicPage) {
        return null;
    }

    // Render markdown-like content
    const renderContent = (content: string) => {
        // Simple markdown rendering
        return content
            .split('\n')
            .map((line, i) => {
                // Bold text
                line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                // Bullet points
                if (line.startsWith('- ')) {
                    return <li key={i} className="ml-4" dangerouslySetInnerHTML={{ __html: line.slice(2) }} />;
                }
                if (line.startsWith('• ')) {
                    return <li key={i} className="ml-4" dangerouslySetInnerHTML={{ __html: line.slice(2) }} />;
                }
                return <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: line }} />;
            });
    };

    return (
        <>
            {/* Floating Chat Button */}
            <button
                ref={buttonRef}
                onClick={() => !isDragging && setIsOpen(!isOpen)}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                style={{
                    right: `${position.x}px`,
                    bottom: `${position.y}px`,
                }}
                className={`fixed z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab hover:scale-110'
                    } ${isOpen
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-linear-to-br from-blue-500 via-purple-500 to-pink-500 hover:shadow-purple-500/50'
                    }`}
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-white" />
                ) : (
                    <MessageSquare className="w-6 h-6 text-white" />
                )}

                {/* Drag indicator */}
                <div className="absolute -top-1 -right-1 bg-gray-800 rounded-full p-0.5 opacity-50">
                    <GripVertical className="w-3 h-3 text-white" />
                </div>

                {/* Pulse animation when closed */}
                {!isOpen && (
                    <span className="absolute inset-0 rounded-full bg-purple-500 animate-ping opacity-30" />
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (() => {
                // Calculate if the chat panel would go above viewport
                const panelHeight = isMinimized ? 56 : 512; // h-14 = 56px, h-[32rem] = 512px
                const buttonFromBottom = position.y + 70; // Button position + gap
                const spaceAboveButton = window.innerHeight - buttonFromBottom - 60; // 60px for button height

                // If not enough space above, position from top instead
                const useTopPosition = spaceAboveButton < panelHeight;

                return (
                    <div
                        ref={chatContainerRef}
                        style={useTopPosition ? {
                            right: `${position.x}px`,
                            top: '70px', // Fixed from top with some margin
                            maxHeight: 'calc(100vh - 140px)',
                        } : {
                            right: `${position.x}px`,
                            bottom: `${position.y + 70}px`,
                            maxHeight: `calc(100vh - ${position.y + 90}px)`,
                        }}
                        className={`fixed z-50 transition-all duration-300 flex flex-col ${isMinimized ? 'w-72 h-14' : 'w-96 h-128'
                            } max-w-[calc(100vw-40px)] rounded-2xl shadow-2xl overflow-hidden border border-white/10 backdrop-blur-xl bg-linear-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95`}
                    >
                        {/* Header - always visible, never shrinks */}
                        <div className="shrink-0 bg-linear-to-br from-blue-600 via-purple-600 to-pink-600 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">MediAI Assistant</h3>
                                    <p className="text-xs text-white/70">Always here to help 💊</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsMinimized(!isMinimized)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    title={isMinimized ? 'Maximize' : 'Minimize'}
                                >
                                    {isMinimized ? (
                                        <Maximize2 className="w-4 h-4 text-white" />
                                    ) : (
                                        <Minimize2 className="w-4 h-4 text-white" />
                                    )}
                                </button>
                                <button
                                    onClick={clearHistory}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    title="Clear chat"
                                >
                                    <Trash2 className="w-4 h-4 text-white" />
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Chat Content */}
                        {!isMinimized && (
                            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                {/* Messages Area - grows to fill space, scrollable */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                                    {isLoadingHistory ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
                                                <MessageSquare className="w-8 h-8 text-white" />
                                            </div>
                                            <h4 className="text-white font-semibold mb-2">Welcome to MediAI! 👋</h4>
                                            <p className="text-gray-400 text-sm mb-6">
                                                I'm your AI health assistant. How can I help you today?
                                            </p>

                                            {/* Quick Actions */}
                                            <div className="space-y-2">
                                                {QUICK_ACTIONS.map((action, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => handleQuickAction(action)}
                                                        className="w-full text-left px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-sm text-gray-300 hover:text-white transition-colors border border-white/5 hover:border-purple-500/30"
                                                    >
                                                        {action.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {messages.map((msg, index) => (
                                                <div
                                                    key={index}
                                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                                            ? 'bg-linear-to-br from-blue-500 to-purple-500 text-white rounded-br-sm'
                                                            : 'bg-slate-700/50 text-gray-200 rounded-bl-sm border border-white/5'
                                                            }`}
                                                    >
                                                        <div className="text-sm leading-relaxed">
                                                            {renderContent(msg.content)}
                                                        </div>
                                                        <span className={`text-xs mt-1 block ${msg.role === 'user' ? 'text-white/60' : 'text-gray-500'
                                                            }`}>
                                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}

                                            {isLoading && (
                                                <div className="flex justify-start">
                                                    <div className="bg-slate-700/50 rounded-2xl rounded-bl-sm px-4 py-3 border border-white/5">
                                                        <div className="flex items-center gap-2">
                                                            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                                                            <span className="text-gray-400 text-sm">Thinking...</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div ref={messagesEndRef} />
                                        </>
                                    )}
                                </div>

                                {/* Quick Actions Row (when there are messages) */}
                                {messages.length > 0 && (
                                    <div className="px-4 py-2 border-t border-white/5 overflow-x-auto">
                                        <div className="flex gap-2 min-w-max">
                                            <button
                                                onClick={() => handleQuickAction(QUICK_ACTIONS[0])}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-full text-xs text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                                            >
                                                <Pill className="w-3 h-3" /> Today's meds
                                            </button>
                                            <button
                                                onClick={() => handleQuickAction(QUICK_ACTIONS[1])}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-full text-xs text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                                            >
                                                <Activity className="w-3 h-3" /> Stats
                                            </button>
                                            <button
                                                onClick={() => handleQuickAction(QUICK_ACTIONS[3])}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-full text-xs text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                                            >
                                                <UserCheck className="w-3 h-3" /> Doctors
                                            </button>
                                            <button
                                                onClick={() => handleQuickAction(QUICK_ACTIONS[4])}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-full text-xs text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                                            >
                                                <Stethoscope className="w-3 h-3" /> Symptoms
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Input Area */}
                                <form onSubmit={handleSubmit} className="p-3 border-t border-white/5">
                                    <div className="flex gap-2">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={inputMessage}
                                            onChange={(e) => setInputMessage(e.target.value)}
                                            placeholder="Ask me anything about your health..."
                                            disabled={isLoading}
                                            className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors disabled:opacity-50"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!inputMessage.trim() || isLoading}
                                            className="px-4 py-3 bg-linear-to-br from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all text-white"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                );
            })()}
        </>
    );
}
