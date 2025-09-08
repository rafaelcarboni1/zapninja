import { NextResponse } from 'next/server'

export async function GET() {
  console.log('[health] GET /api/health')
  return NextResponse.json({ ok: true, service: 'frontend', time: new Date().toISOString() })
}


