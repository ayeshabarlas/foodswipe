'use client';
import dynamic from 'next/dynamic';

const AdminRegisterForm = dynamic(() => import('../../../components/AdminRegisterForm'), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
    )
});

export default function AdminRegisterPage() {
    return <AdminRegisterForm />;
}
