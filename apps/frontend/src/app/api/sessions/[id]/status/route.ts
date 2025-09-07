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

    // Buscar status da sessão no banco
    const { data: session, error } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error || !session) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    // Status via Evolution
    const resp = await fetch(`${ORCH_URL}/evolution/instances/${encodeURIComponent(session.session_name)}/status`, { cache: 'no-store' })
    const evo = resp.ok ? await resp.json() : null
    const status = evo?.status?.connected ? 'connected' : (session.is_active ? 'connected' : 'disconnected')
    
    return NextResponse.json({
      status,
      sessionId: session.id,
      sessionName: session.session_name,
      phoneNumber: session.phone_number,
      isActive: session.is_active,
      lastUpdate: session.updated_at
    })

  } catch (error) {
    console.error('Erro ao verificar status:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

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