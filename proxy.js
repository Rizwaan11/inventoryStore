import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'supersecretjwtkeythatshouldbechangedinproduction'
);

export async function proxy(req) {
  const { pathname } = req.nextUrl;

  // Always allow: static files, image opt, auth API routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get('auth-token')?.value;
  const isLoginPage = pathname === '/login';

  if (!token) {
    if (!isLoginPage) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    // Valid token — redirect away from login page
    if (isLoginPage) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  } catch {
    // Invalid or expired token — clear cookie and redirect to login
    const response = NextResponse.redirect(new URL('/login', req.url));
    response.cookies.delete('auth-token');
    return response;
  }
}

export const config = {
  // Run on all routes except static files and image optimization
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
