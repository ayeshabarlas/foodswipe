'use client';

import React from 'react';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-8 md:p-12">
                <Link href="/" className="inline-flex items-center text-orange-500 hover:text-orange-600 mb-8 transition-colors">
                    <FaArrowLeft className="mr-2" /> Back to Home
                </Link>

                <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
                
                <div className="prose prose-orange max-w-none space-y-8 text-gray-600">
                    <section>
                        <p>Welcome to FoodSwipe! By using our service, you agree to these terms.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">1. Business Information</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Registered Name: FoodSwipe</li>
                            <li>Business Address: Allama Iqbal Town, Lahore</li>
                            <li>Contact: +923295599855</li>
                            <li>Email: app.foodswipehelp@gmail.com</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">2. Service Usage</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>You must be 18 years or older to use FoodSwipe.</li>
                            <li>Provide accurate information during registration.</li>
                            <li>Keep your account credentials secure.</li>
                            <li>FoodSwipe reserves the right to suspend accounts for violations.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">3. Orders & Payments</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>All orders are subject to restaurant availability.</li>
                            <li>Prices may vary and are confirmed at checkout.</li>
                            <li>Payment is processed securely through our platform.</li>
                            <li>Taxes and delivery fees are calculated based on location.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">4. Delivery</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Delivery times are estimates and may vary due to traffic or weather.</li>
                            <li>We are not responsible for delays beyond our control.</li>
                            <li>You must be available at the provided address to receive your order.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">5. Refund & Cancellation Policy</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Order Cancellation: Orders can only be cancelled before the restaurant accepts them.</li>
                            <li>Refunds: Refunds are processed within 5-7 business days for eligible cancelled orders.</li>
                            <li>Incorrect Orders: If you receive an incorrect or damaged item, please report it via the Support section within 2 hours.</li>
                            <li>Delivery Failure: If a delivery fails due to incorrect address or unavailability, no refund will be issued.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">6. Customer Complaint Handling</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>We value your feedback and take complaints seriously.</li>
                            <li>Mechanism: You can lodge a complaint via the "Support" tab in the app or email us at app.foodswipehelp@gmail.com.</li>
                            <li>Resolution: Our team will acknowledge your complaint within 24 hours and aim for resolution within 48-72 hours.</li>
                            <li>Appeals: If unsatisfied with the resolution, you may escalate to app.foodswipehelp@gmail.com.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">7. User Conduct</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Use the service respectfully and lawfully.</li>
                            <li>Do not misuse or abuse the platform.</li>
                            <li>Provide honest reviews and ratings.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">8. Jurisdiction & Governing Law</h2>
                        <p>These Terms and Conditions shall be governed by and construed in accordance with the laws of the Islamic Republic of Pakistan. Any dispute arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the courts of Lahore, Pakistan.</p>
                    </section>

                    <footer className="pt-8 border-t border-gray-100 text-sm text-gray-400">
                        Last updated: January 2026
                    </footer>
                </div>
            </div>
        </div>
    );
}
