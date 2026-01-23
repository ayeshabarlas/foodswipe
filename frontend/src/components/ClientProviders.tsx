'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { CartProvider } from '../context/CartContext';

const SystemWrapper = dynamic(() => import('./SystemWrapper'), { ssr: false });
const Toaster = dynamic(() => import('react-hot-toast').then((m) => m.Toaster), { ssr: false });

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SystemWrapper>
      <CartProvider>
        {children}
        <Toaster position="top-center" reverseOrder={false} />
      </CartProvider>
    </SystemWrapper>
  );
}
