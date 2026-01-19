'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FaTimesCircle, FaHome, FaShoppingCart } from 'react-icons/fa';
import Link from 'next/link';
import ModernLoader from '@/components/ModernLoader';

function PaymentCancelContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <FaTimesCircle className="text-5xl text-red-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
            <p className="text-gray-600 mb-8 max-w-xs">
                Your payment was cancelled. No charges were made. You can try placing the order again.
            </p>
            
            {orderId && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full max-w-xs mb-8 text-left">
                    <p className="text-xs text-gray-400 mb-1">REFERENCE ORDER</p>
                    <p className="font-mono font-bold text-gray-900 text-sm">#{orderId.slice(-8).toUpperCase()}</p>
                </div>
            )}

            <div className="flex flex-col gap-3 w-full max-w-xs">
                <Link href="/" className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-orange-600 transition flex items-center justify-center gap-2">
                    <FaShoppingCart /> Back to Menu
                </Link>
                <Link href="/" className="w-full bg-white text-gray-700 py-3 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition flex items-center justify-center gap-2">
                    <FaHome /> Back to Home
                </Link>
            </div>
        </div>
    );
}

export default function PaymentCancelPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <ModernLoader size="lg" />
            </div>
        }>
            <PaymentCancelContent />
        </Suspense>
    );
}
