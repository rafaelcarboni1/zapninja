import { NextResponse, NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url)
    if (pathname === '/') {
      return new NextResponse('ok', {
        status: 200,
        headers: { 'content-type': 'text/plain; charset=utf-8' }
      })
    }
  } catch (e) {
    return new NextResponse('ok', { status: 200 })
  }
  return NextResponse.next()
}

export const config = { matcher: ['/'] }


