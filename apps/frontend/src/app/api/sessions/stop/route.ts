import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

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

    if (!session.is_active) {
      return NextResponse.json(
        { error: 'Sessão já está inativa' },
        { status: 400 }
      )
    }

    // Atualizar status da sessão para inativa
    const { error: updateError } = await supabase
      .from('whatsapp_sessions')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Erro ao atualizar sessão:', updateError)
      return NextResponse.json(
        { error: 'Erro ao parar sessão' },
        { status: 500 }
      )
    }

    // Disparar orquestrador do backend (HTTP)
    try {
      const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:4000'
      await fetch(`${orchestratorUrl}/sessions/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionName: session.session_name })
      })
    } catch (err) {
      console.error('Falha ao chamar orquestrador:', err)
    }

    return NextResponse.json({
      success: true,
      message: 'Sessão parada com sucesso',
      sessionId,
      sessionName: session.session_name
    })

  } catch (error) {
    console.error('Erro ao parar sessão:', error)
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}