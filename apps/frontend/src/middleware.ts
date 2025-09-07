import { NextResponse } from 'next/server'

export function middleware(request: Request) {
  const { pathname } = new URL(request.url)
  if (pathname === '/') {
    return new NextResponse('ok', { status: 200 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/'],
}


