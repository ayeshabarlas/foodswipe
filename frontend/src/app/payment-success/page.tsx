'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { FaCheckCircle, FaHome, FaShoppingBag } from 'react-icons/fa';
import Link from 'next/link';
import ModernLoader from '@/components/ModernLoader';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function PaymentSuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [verifying, setVerifying] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [orderId, setOrderId] = useState<string | null>(null);

    useEffect(() => {
        const verifyPayment = async () => {
            // Safepay appends order_id, tracker, and sig
            const order_id = searchParams.get('order_id') || searchParams.get('orderId');
            const tracker = searchParams.get('tracker');
            const sig = searchParams.get('sig');

            console.log('Payment Verification Params:', { order_id, tracker, sig });

            if (!order_id || !tracker || !sig) {
                console.error('Missing verification data from Safepay');
                setError('Missing required payment verification data from Safepay');
                setVerifying(false);
                return;
            }

            setOrderId(order_id);

            try {
                // Call backend to verify payment and update order status
                await axios.post(`${API_BASE_URL}/api/payments/safepay/verify`, {
                    order_id,
                    tracker,
                    sig
                });
                
                setVerifying(false);
            } catch (err: any) {
                console.error('Verification failed:', err);
                setError(err.response?.data?.message || 'Failed to verify payment');
                setVerifying(false);
            }
        };

        verifyPayment();
    }, [searchParams]);

    if (verifying) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <ModernLoader size="lg" />
                <p className="mt-4 text-gray-600 font-medium">Verifying your payment...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl text-red-500">!</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Failed</h1>
                <p className="text-gray-600 mb-8 max-w-xs">{error}</p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <Link href="/" className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-orange-600 transition text-center">
                        Go to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <FaCheckCircle className="text-5xl text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-8 max-w-xs">
                Your order has been confirmed and is being processed.
            </p>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full max-w-xs mb-8">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Order ID:</span>
                    <span className="font-mono font-bold text-gray-900">#{orderId?.slice(-6).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status:</span>
                    <span className="text-green-600 font-bold">Paid</span>
                </div>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
                <Link href="/my-orders" className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-orange-600 transition flex items-center justify-center gap-2">
                    <FaShoppingBag /> Track Order
                </Link>
                <Link href="/" className="w-full bg-white text-gray-700 py-3 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition flex items-center justify-center gap-2">
                    <FaHome /> Back to Home
                </Link>
            </div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <ModernLoader size="lg" />
            </div>
        }>
            <PaymentSuccessContent />
        </Suspense>
    );
}
