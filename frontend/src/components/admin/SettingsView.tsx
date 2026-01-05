'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/config';

export default function SettingsView() {
    const [commission, setCommission] = useState(10);
    const [supportEmail, setSupportEmail] = useState('app.foodswipehelp@gmail.com');
    const [announcement, setAnnouncement] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            const { data } = await axios.get(`${API_BASE_URL}/api/admin/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data) {
                setCommission(data.commission || 10);
                setSupportEmail(data.supportEmail || 'app.foodswipehelp@gmail.com');
                setAnnouncement(data.announcement || '');
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}').token;
            await axios.put(
                `${API_BASE_URL}/api/admin/settings`,
                { commission, supportEmail, announcement },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Settings</h2>

            <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Commission Percentage
                        </label>
                        <input
                            type="number"
                            value={commission}
                            onChange={(e) => setCommission(Number(e.target.value))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            min="0"
                            max="100"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Platform commission on restaurant sales (%)
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Support Email
                        </label>
                        <input
                            type="email"
                            value={supportEmail}
                            onChange={(e) => setSupportEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Email address for customer support
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Announcement Banner
                        </label>
                        <textarea
                            value={announcement}
                            onChange={(e) => setAnnouncement(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            rows={3}
                            placeholder="Enter announcement message..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Display a banner message to all users
                        </p>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
