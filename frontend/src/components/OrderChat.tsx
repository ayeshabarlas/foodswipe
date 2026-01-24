'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCommentDots, FaPaperPlane } from 'react-icons/fa';
import { getSocket, subscribeToChannel, unsubscribeFromChannel, initSocket } from '../utils/socket';
import axios from 'axios';
import { getApiUrl } from '../utils/config';

interface Message {
    id: string;
    text: string;
    sender: 'customer' | 'restaurant' | 'rider' | 'support';
    senderName: string;
    senderId?: string;
    timestamp: string;
    createdAt?: string;
}

interface OrderChatProps {
    orderId: string;
    isOpen: boolean;
    onClose: () => void;
    userRole: 'customer' | 'restaurant' | 'rider';
    userName: string;
    userId: string;
    orderStatus?: string;
}

export default function OrderChat({ orderId, isOpen, onClose, userRole, userName, userId, orderStatus }: OrderChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socket = getSocket();

    const isChatDisabled = orderStatus === 'Delivered' || orderStatus === 'Cancelled';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const playMessageSound = () => {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3');
            audio.play().catch(e => console.log('Audio play failed:', e));
        } catch (e) {}
    };

    // Fetch Chat History
    useEffect(() => {
        const fetchHistory = async () => {
            if (!isOpen || !orderId) return;
            
            setLoading(true);
            try {
                const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
                const config = {
                    headers: {
                        Authorization: `Bearer ${userInfo.token}`,
                    },
                };
                const { data } = await axios.get(`${getApiUrl()}/api/chat/${orderId}`, config);
                
                const formattedMessages: Message[] = data.map((msg: any) => ({
                    id: msg._id,
                    text: msg.text,
                    sender: msg.senderRole,
                    senderName: msg.senderName,
                    senderId: msg.sender,
                    timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    createdAt: msg.createdAt
                }));
                
                setMessages(formattedMessages);
            } catch (error) {
                console.error('Error fetching chat history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [isOpen, orderId]);

    // Pusher Listener
    useEffect(() => {
        if (isOpen && orderId) {
            // Ensure socket is initialized
            if (userId) {
                initSocket(userId, userRole);
            }
            
            const channel = subscribeToChannel(`order-${orderId}`);
            
            if (channel) {
                channel.bind('newMessage', (data: { orderId: string; message: any }) => {
                    if (data.orderId === orderId) {
                        const newMsg: Message = {
                            id: data.message.id || Date.now().toString(),
                            text: data.message.text,
                            sender: data.message.sender,
                            senderName: data.message.senderName,
                            senderId: data.message.senderId,
                            timestamp: data.message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            createdAt: data.message.createdAt || new Date().toISOString()
                        };
                        
                        setMessages(prev => {
                            // Avoid duplicate messages
                            if (prev.find(m => m.id === newMsg.id)) return prev;
                            return [...prev, newMsg];
                        });
                        
                        if (newMsg.senderId !== userId) {
                            playMessageSound();
                        }
                    }
                });
            }
            
            return () => {
                unsubscribeFromChannel(`order-${orderId}`);
            };
        }
    }, [isOpen, orderId, userId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!currentMessage.trim() || isChatDisabled) return;

        const messageText = currentMessage;
        setCurrentMessage('');

        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const config = {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                },
            };

            await axios.post(`${getApiUrl()}/api/chat/${orderId}`, {
                text: messageText,
                senderRole: userRole,
                senderName: userName
            }, config);

        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-lg h-[85vh] sm:h-[650px] flex flex-col overflow-hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                                    <FaCommentDots size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">Order Chat</h3>
                                    <p className="text-[10px] text-gray-700 uppercase tracking-[0.2em] font-bold">
                                        Active • Status: {orderStatus || 'Processing'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <FaTimes className="text-gray-700" />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8F9FA]">
                            {loading ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg, idx) => (
                                        <div
                                            key={msg.id || idx}
                                            className={`flex flex-col ${msg.senderId === userId ? 'items-end' : 'items-start'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] px-5 py-3.5 rounded-2xl text-sm font-bold shadow-sm ${msg.senderId === userId
                                                    ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-tr-none'
                                                    : 'bg-white text-gray-900 rounded-tl-none border border-gray-100 shadow-sm'
                                            }`}
                                            >
                                                <p className="leading-relaxed">{msg.text}</p>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 px-1">
                                                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                                                    {msg.senderId === userId ? 'YOU' : msg.senderName.toUpperCase()}
                                                </span>
                                                <span className="text-[10px] text-gray-500">•</span>
                                                <span className="text-[10px] font-bold text-gray-700">{msg.timestamp}</span>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                    {messages.length === 0 && !loading && (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                                            <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm flex items-center justify-center text-gray-300">
                                                <FaCommentDots size={40} />
                                            </div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">No messages yet</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-6 bg-white border-t border-gray-100">
                            {isChatDisabled ? (
                                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                                    <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">
                                        Chat disabled - Order {orderStatus}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex gap-4 items-center bg-gray-50 rounded-[1.5rem] px-5 py-2 border border-gray-200 focus-within:ring-4 focus-within:ring-orange-500/10 focus-within:border-orange-500/30 transition-all">
                                    <input
                                        type="text"
                                        value={currentMessage}
                                        onChange={(e) => setCurrentMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Type your message..."
                                        className="flex-1 bg-transparent border-none py-4 text-sm font-bold focus:outline-none placeholder:text-gray-500 text-gray-900"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!currentMessage.trim()}
                                        className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-30 disabled:hover:from-orange-500 disabled:hover:to-red-500 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-orange-200 active:scale-95"
                                    >
                                        <FaPaperPlane size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
