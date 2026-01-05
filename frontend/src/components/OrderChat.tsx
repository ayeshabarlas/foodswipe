'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCommentDots, FaCheck, FaPaperPlane } from 'react-icons/fa';
import { getSocket } from '../utils/socket';

interface Message {
    id: string;
    text: string;
    sender: 'customer' | 'restaurant' | 'rider';
    senderName: string;
    timestamp: string;
}

interface OrderChatProps {
    orderId: string;
    isOpen: boolean;
    onClose: () => void;
    userRole: 'customer' | 'restaurant' | 'rider';
    userName: string;
}

export default function OrderChat({ orderId, isOpen, onClose, userRole, userName }: OrderChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socket = getSocket();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen && socket) {
            socket.emit('joinOrderChat', { orderId });
            
            const handleMessage = (data: { orderId: string; message: Message }) => {
                if (data.orderId === orderId) {
                    setMessages(prev => [...prev, data.message]);
                }
            };

            socket.on('orderMessage', handleMessage);

            return () => {
                socket.off('orderMessage', handleMessage);
            };
        }
    }, [isOpen, orderId, socket]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = () => {
        if (!currentMessage.trim() || !socket) return;

        const messageData: Message = {
            id: Date.now().toString(),
            text: currentMessage,
            sender: userRole,
            senderName: userName,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        socket.emit('sendOrderMessage', {
            orderId,
            message: messageData,
            recipients: ['customer', 'restaurant', 'rider'].filter(r => r !== userRole)
        });

        // Optimistically add to local state
        setMessages(prev => [...prev, messageData]);
        setCurrentMessage('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg h-[80vh] sm:h-[600px] flex flex-col overflow-hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-r from-orange-500 to-red-600 text-white flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    <FaCommentDots size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Order Chat</h3>
                                    <p className="text-[10px] opacity-80 uppercase tracking-widest font-bold">
                                        Active Support for Order #{orderId.slice(-6)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                            >
                                <FaTimes size={16} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex flex-col ${msg.sender === userRole ? 'items-end' : 'items-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${msg.sender === userRole
                                            ? 'bg-orange-500 text-white rounded-tr-none'
                                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                            }`}
                                    >
                                        <p className="font-medium">{msg.text}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1 px-1">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase">
                                            {msg.sender === userRole ? 'You' : msg.senderName}
                                        </span>
                                        <span className="text-[9px] text-gray-400">•</span>
                                        <span className="text-[9px] text-gray-400">{msg.timestamp}</span>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 opacity-50">
                                    <FaCommentDots size={40} />
                                    <p className="text-xs font-bold uppercase tracking-wider">No messages yet</p>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-white border-t border-gray-100">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={currentMessage}
                                    onChange={(e) => setCurrentMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Type your message..."
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!currentMessage.trim()}
                                    className="w-12 h-12 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-white rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95"
                                >
                                    <FaPaperPlane size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
