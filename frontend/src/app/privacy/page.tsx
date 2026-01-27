'use client';

import React from 'react';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-8 md:p-12">
                <Link href="/" className="inline-flex items-center text-orange-500 hover:text-orange-600 mb-8 transition-colors">
                    <FaArrowLeft className="mr-2" /> Back to Home
                </Link>

                <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
                
                <div className="prose prose-orange max-w-none space-y-8 text-gray-600">
                    <section>
                        <p>At FoodSwipe, we value your privacy and are committed to protecting your personal information.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Account details (name, email, phone number)</li>
                            <li>Delivery addresses and GPS location</li>
                            <li>Order history and preferences</li>
                            <li>Payment information (processed securely via third-party providers)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Process and deliver your orders.</li>
                            <li>Improve our services and user experience.</li>
                            <li>Send order updates and promotional notifications.</li>
                            <li>Provide real-time customer support.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">3. Information Sharing</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>We share necessary details with restaurants and delivery partners.</li>
                            <li>We never sell your personal information to third parties.</li>
                            <li>Third-party services are used only for payment processing and analytics.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">4. Data Security</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>We use industry-standard SSL encryption.</li>
                            <li>Regular security audits and database backups.</li>
                            <li>Secure payment processing compliant with PCI-DSS.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">5. Your Rights</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Access and update your personal data.</li>
                            <li>Request data deletion via account settings.</li>
                            <li>Opt-out of marketing communications.</li>
                            <li>Right to be informed about data breaches.</li>
                        </ul>
                    </section>

                    <footer className="pt-8 border-t border-gray-100 text-sm text-gray-400">
                        For questions, contact us at app.foodswipehelp@gmail.com<br />
                        Last updated: January 2026
                    </footer>
                </div>
            </div>
        </div>
    );
}
