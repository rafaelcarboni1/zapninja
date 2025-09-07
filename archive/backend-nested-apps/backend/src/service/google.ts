import { type ChatSession, GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

// Verificação da chave será feita apenas quando o serviço for usado
if (!process.env.GEMINI_KEY && process.env.AI_SELECTED === 'GEMINI') {
  throw new Error('GEMINI_KEY não encontrada no arquivo .env');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY || '');
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 2048,
  },
});
const activeChats = new Map<string, any[]>();

const getOrCreateChatSession = (chatId: string, dbHistory?: any[]): ChatSession => {
  try {
    console.log('Verificando chat existente para:', chatId);
    
    let historyToUse: any[] = [];
    
    // Se houver histórico do banco de dados, usar ele primeiro
    if (dbHistory && dbHistory.length > 0) {
      console.log('Usando histórico do banco de dados:', dbHistory.length, 'mensagens');
      historyToUse = dbHistory.map(msg => ({
        role: msg.sender_type === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
    }
    // Se não, usar o histórico em memória se existir
    else if (activeChats.has(chatId)) {
      historyToUse = activeChats.get(chatId) || [];
      console.log('Usando histórico em memória:', historyToUse.length, 'mensagens');
    }
    // Se não há histórico, criar histórico inicial
    else {
      const initialPrompt = process.env.GEMINI_PROMPT || 'Você é um assistente útil e amigável.';
      historyToUse = [
        {
          role: 'user',
          parts: [{ text: initialPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'Olá! Como posso ajudá-lo hoje?' }],
        },
      ];
      console.log(`Novo chat criado para: ${chatId}`);
    }
    
    const chat = model.startChat({
      history: historyToUse,
    });
    
    // Atualizar cache se não for histórico do banco
    if (!dbHistory || dbHistory.length === 0) {
      activeChats.set(chatId, historyToUse);
    }
    
    return chat;
  } catch (error) {
    console.error('Erro ao criar/recuperar sessão de chat:', error);
    throw error;
  }
};

export const mainGoogle = async ({
  currentMessage,
  chatId,
  conversationHistory,
}: {
  currentMessage: string;
  chatId: string;
  conversationHistory?: any[];
}): Promise<string> => {
  try {
    const chat = getOrCreateChatSession(chatId, conversationHistory);
    const prompt = currentMessage.trim();
    
    if (!prompt) {
      throw new Error('Mensagem vazia recebida');
    }
    
    console.log('Enviando mensagem para Gemini:', prompt.substring(0, 100) + '...');
    
    const result = await chat.sendMessage(prompt);
    const response = result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error('Resposta vazia recebida do Gemini');
    }
    
    console.log('Resposta recebida do Gemini');
    return text;
  } catch (error) {
    console.error('Erro no Gemini:', error);
    throw error;
  }
};