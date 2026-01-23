'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaPaperPlane, FaRobot } from 'react-icons/fa';
import axios from 'axios';
import { getApiUrl } from '../utils/config';

interface Message {
    id: number;
    text: string;
    sender: 'bot' | 'user';
    timestamp: string;
}

interface ChatbotSupportProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChatbotSupport({ isOpen, onClose }: ChatbotSupportProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            text: "Hello! I'm your FoodSwipe assistant. How can I help you today?",
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        },
        {
            id: 2,
            text: "I can help you with:\n• Order tracking\n• Payment issues\n• Restaurant inquiries\n• Account settings\n• Refunds and complaints",
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const quickReplies = [
        'Track my order',
        'Payment help',
        'Cancel order',
        'Change address',
        'Contact restaurant'
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return;

        const userMessage: Message = {
            id: Date.now(),
            text: text,
            sender: 'user',
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsTyping(true);

        try {
            // Real-time API call to backend
            const response = await axios.post(`${getApiUrl()}/api/chat`, {
                message: text,
                conversationHistory: messages
            });

            setIsTyping(false);

            const botMessage: Message = {
                id: Date.now() + 1,
                text: response.data.response,
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            };

            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error('Chat error:', error);
            setIsTyping(false);

            const errorMessage: Message = {
                id: Date.now() + 1,
                text: "I apologize, but I'm having trouble connecting right now. Please try again or contact our support team at +923295599855.",
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            };

            setMessages(prev => [...prev, errorMessage]);
        }
    };

    const handleQuickReply = (reply: string) => {
        handleSendMessage(reply);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-gradient-orange-red p-4 shadow-md flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                                    <FaRobot size={24} className="text-orange-500" />
                                </div>
                                <div>
                                    <h2 className="text-white text-lg font-bold">AI Assistant</h2>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        <p className="text-white/90 text-xs">Online now</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition"
                            >
                                <FaTimes size={16} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                            {messages.map((message) => (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
                                        <div className={`rounded-2xl p-3 ${message.sender === 'user'
                                            ? 'bg-gradient-orange-red text-white'
                                            : 'bg-white text-gray-800 border border-gray-200'
                                            }`}>
                                            <p className="text-sm whitespace-pre-line">{message.text}</p>
                                        </div>
                                        <p className={`text-xs text-gray-500 mt-1 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
                                            {message.timestamp}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}

                            {/* Typing Indicator */}
                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex justify-start"
                                >
                                    <div className="bg-white text-gray-800 border border-gray-200 rounded-2xl px-4 py-3">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Replies */}
                        <div className="px-4 py-3 bg-white border-t border-gray-200">
                            <p className="text-xs text-gray-600 mb-2 font-medium">Quick replies:</p>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {quickReplies.map((reply, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleQuickReply(reply)}
                                        disabled={isTyping}
                                        className="flex-shrink-0 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-orange-100 hover:text-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {reply}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-white border-t border-gray-200">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !isTyping && handleSendMessage(inputText)}
                                    placeholder="Type your message..."
                                    disabled={isTyping}
                                    className="flex-1 px-4 py-3 bg-gray-100 rounded-full outline-none focus:ring-2 focus:ring-orange-500 text-gray-800 disabled:opacity-50"
                                />
                                <button
                                    onClick={() => handleSendMessage(inputText)}
                                    disabled={isTyping || !inputText.trim()}
                                    className="w-12 h-12 rounded-full bg-gradient-orange-red text-white flex items-center justify-center hover:shadow-lg transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FaPaperPlane size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

