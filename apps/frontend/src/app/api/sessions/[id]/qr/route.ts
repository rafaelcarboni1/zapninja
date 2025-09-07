import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const ORCH_URL = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || process.env.ORCHESTRATOR_URL || 'http://localhost:4000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    if (!sessionId) {
      return NextResponse.json(
        { error: 'ID da sessão é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se a sessão existe
    const { data: session, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    // Buscar QR real via orquestrador Evolution
    const resp = await fetch(`${ORCH_URL}/evolution/instances/${encodeURIComponent(session.session_name)}/qr`, { cache: 'no-store' })
    if (!resp.ok) {
      return NextResponse.json({ error: 'QR indisponível' }, { status: 502 })
    }
    const data = await resp.json()
    return NextResponse.json({
      qrCode: data.qrCode,
      status: session.is_active ? 'connected' : 'waiting',
      sessionName: session.session_name
    })

  } catch (error) {
    console.error('Erro ao obter QR Code:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Sem mock em produção

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}