import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    // Simular geração de QR Code (em produção, integraria com WhatsApp Web API)
    // Por enquanto, retorna um QR code de exemplo
    const mockQRCode = await generateMockQRCode(session.session_name)

    return NextResponse.json({
      qrCode: mockQRCode,
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

// Função para gerar QR Code mockado (base64)
async function generateMockQRCode(sessionName: string): Promise<string> {
  // Em produção real, isso seria integrado com @wppconnect-team/wppconnect
  // Por enquanto, retorna um QR code base64 de exemplo
  
  const qrText = `whatsapp-session:${sessionName}:${Date.now()}`
  
  // QR Code SVG simples como base64
  const svgQR = `
  <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="white"/>
    <rect x="20" y="20" width="20" height="20" fill="black"/>
    <rect x="60" y="20" width="20" height="20" fill="black"/>
    <rect x="100" y="20" width="20" height="20" fill="black"/>
    <rect x="140" y="20" width="20" height="20" fill="black"/>
    <rect x="20" y="60" width="20" height="20" fill="black"/>
    <rect x="100" y="60" width="20" height="20" fill="black"/>
    <rect x="180" y="60" width="20" height="20" fill="black"/>
    <rect x="20" y="100" width="20" height="20" fill="black"/>
    <rect x="60" y="100" width="20" height="20" fill="black"/>
    <rect x="140" y="100" width="20" height="20" fill="black"/>
    <rect x="180" y="100" width="20" height="20" fill="black"/>
    <rect x="20" y="140" width="20" height="20" fill="black"/>
    <rect x="140" y="140" width="20" height="20" fill="black"/>
    <rect x="60" y="180" width="20" height="20" fill="black"/>
    <rect x="100" y="180" width="20" height="20" fill="black"/>
    <rect x="180" y="180" width="20" height="20" fill="black"/>
    <text x="100" y="110" text-anchor="middle" font-size="12" fill="gray">${sessionName}</text>
  </svg>
  `
  
  return Buffer.from(svgQR).toString('base64')
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