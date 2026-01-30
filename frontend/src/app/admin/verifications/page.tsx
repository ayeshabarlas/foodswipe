'use client';
import dynamic from 'next/dynamic';

const VerificationsView = dynamic(() => import('../../../components/admin/VerificationsView'), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    )
});

export default function AdminVerificationsPage() {
    return <VerificationsView />;
}
