import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    if (path === '/admin-login' || path === '/admin-login/') {
        return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    return NextResponse.next();
}

// Only run middleware on these paths
export const config = {
    matcher: ['/admin-login'],
};
