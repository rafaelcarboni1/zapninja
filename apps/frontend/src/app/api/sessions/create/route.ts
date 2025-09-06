import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { sessionName, aiConfig, timingConfig } = await request.json()

    if (!sessionName) {
      return NextResponse.json(
        { error: 'Nome da sessão é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se sessão já existe
    const { data: existingSession } = await supabase
      .from('whatsapp_sessions')
      .select('id')
      .eq('session_name', sessionName)
      .single()

    if (existingSession) {
      return NextResponse.json(
        { error: 'Uma sessão com este nome já existe' },
        { status: 409 }
      )
    }

    // Criar nova sessão no banco
    const { data: newSession, error } = await supabase
      .from('whatsapp_sessions')
      .insert({
        session_name: sessionName,
        is_active: false,
        ai_config: aiConfig || {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
        },
        timing_config: timingConfig || {
          delayBetweenMessages: 2000,
          maxMessagesPerHour: 100,
        },
        max_messages: 1000,
        custom_prompt: null
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar sessão:', error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      session: newSession,
      message: 'Sessão criada com sucesso'
    })

  } catch (error) {
    console.error('Erro na API de criação:', error)
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