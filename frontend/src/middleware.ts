import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // If the user hits /login, redirect them to the root
    if (request.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Also handle /admin-login just in case
    if (request.nextUrl.pathname === '/admin-login') {
        return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    return NextResponse.next();
}

// Only run middleware on these paths
export const config = {
    matcher: ['/login', '/admin-login'],
};
