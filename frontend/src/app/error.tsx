'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Next.js Global Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong!</h2>
        <p className="text-gray-600 mb-6 text-sm">
          {error.message || 'An unexpected error occurred in the application.'}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition shadow-lg shadow-orange-500/20"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/admin'}
            className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition"
          >
            Go to Admin Dashboard
          </button>
        </div>
        {error.digest && (
          <p className="mt-4 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
