import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // NextResponse.next() does not accept a Request object — pass headers correctly
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Add caching headers for static assets
  if (request.nextUrl.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|ico)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
