import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export function middleware(request: NextRequest) {
  console.log('Middleware - Request URL:', request.url);
  console.log('Middleware - Pathname:', request.nextUrl.pathname);
  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
