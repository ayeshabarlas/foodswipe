'use client';

import dynamic from 'next/dynamic';

const AdminLoginForm = dynamic(() => import('../../../components/AdminLoginForm'), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
    )
});

// Version: 2.0.5 - Verified Build Trigger
export default function AdminLoginPage() {
  // Version 2.0.1 - Deployment Fix
  return <AdminLoginForm />;
}
