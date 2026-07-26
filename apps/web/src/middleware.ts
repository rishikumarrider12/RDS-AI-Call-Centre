import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

const STATIC_CACHE_CONTROL = 'public, max-age=31536000, immutable'
const STATIC_ASSET_PATTERNS = [
  /\.(?:png|jpe?g|gif|svg|webp|avif|ico|bmp|tiff?)$/i,
  /\.(?:css|js|mjs|cjs)$/i,
  /\.(?:woff2?|eot|ttf|otf)$/i,
]

export async function middleware(req: NextRequest) {
  const cookie = req.headers.get('cookie') || ''
  const { pathname } = req.nextUrl

  // Auth guard for dashboard routes
  if (pathname.startsWith('/dashboard')) {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { cookie },
        cache: 'no-store',
      })

      if (res.ok) {
        // Continue with cache header injection for static assets
        return applyCacheHeaders(req)
      }
    } catch {
      // API unreachable; treat as unauthenticated
    }

    const url = req.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Apply cache headers for static assets on public routes
  return applyCacheHeaders(req)
}

function applyCacheHeaders(req: NextRequest): NextResponse {
  const response = NextResponse.next()
  const { pathname } = req.nextUrl

  if (STATIC_ASSET_PATTERNS.some((pattern) => pattern.test(pathname))) {
    response.headers.set('Cache-Control', STATIC_CACHE_CONTROL)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
