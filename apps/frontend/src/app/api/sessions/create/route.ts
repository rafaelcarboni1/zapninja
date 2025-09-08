import { NextRequest, NextResponse } from 'next/server'

const ORCH_URL = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || process.env.ORCHESTRATOR_URL || ''

export async function POST(request: NextRequest) {
  try {
    const { sessionName } = await request.json()

    if (!sessionName) {
      return NextResponse.json(
        { error: 'Nome da sessão é obrigatório' },
        { status: 400 }
      )
    }

    if (!ORCH_URL) {
      return NextResponse.json({ error: 'Orquestrador não configurado' }, { status: 500 })
    }

    const resp = await fetch(`${ORCH_URL}/evolution/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionName })
    })

    if (!resp.ok) {
      const err = await resp.text()
      return NextResponse.json({ error: 'Falha ao criar instância', details: err }, { status: 502 })
    }

    const data = await resp.json()
    return NextResponse.json({ success: true, session: { session_name: sessionName }, provider: 'evolution', data })

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