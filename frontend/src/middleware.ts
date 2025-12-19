import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Broadly capture anything that looks like /login or /admin-login
    if (path === '/login' || path === '/login/' || path.startsWith('/login?')) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    if (path === '/admin-login' || path === '/admin-login/') {
        return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    return NextResponse.next();
}

// Only run middleware on these paths
export const config = {
    matcher: ['/login', '/admin-login'],
};
