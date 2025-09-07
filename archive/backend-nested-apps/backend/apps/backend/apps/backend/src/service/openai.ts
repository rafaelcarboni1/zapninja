import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

let assistant: OpenAI.Beta.Assistants.Assistant;
let openai: OpenAI;
const activeChats = new Map<string, OpenAI.Beta.Threads.Thread>();

// Inicializar OpenAI client uma única vez
if (process.env.OPENAI_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
  });
}

export async function initializeNewAIChatSession(
  chatId: string
): Promise<void> {
  try {
    if (!openai) {
      throw new Error('OpenAI client não foi inicializado. Verifique a OPENAI_KEY.');
    }
    
    if (!assistant) {
      assistant = await openai.beta.assistants.retrieve(
        process.env.OPENAI_ASSISTANT!
      );
    }
    
    if (activeChats.has(chatId)) return;
    
    const thread = await openai.beta.threads.create();
    activeChats.set(chatId, thread);
    console.log(`Nova sessão de chat criada para: ${chatId}`);
  } catch (error) {
    console.error('Erro ao inicializar sessão de chat:', error);
    throw error;
  }
}

export async function mainOpenAI({
  currentMessage,
  chatId,
  conversationHistory,
}: {
  currentMessage: string;
  chatId: string;
  conversationHistory?: any[];
}): Promise<string> {
  try {
    let thread = activeChats.get(chatId);
    if (!thread) {
      throw new Error(`Thread não encontrada para chatId: ${chatId}`);
    }

    // Se houver histórico do banco, adicionar contexto
    if (conversationHistory && conversationHistory.length > 0) {
      console.log('Adicionando contexto do histórico para OpenAI:', conversationHistory.length, 'mensagens');
      
      // Criar uma mensagem de contexto com o histórico
      const contextMessage = `Contexto da conversa anterior:\n\n${
        conversationHistory.slice(-5).map(msg => 
          `${msg.sender_type === 'user' ? 'Usuário' : 'Assistente'}: ${msg.content}`
        ).join('\n\n')
      }\n\n---\nMensagem atual do usuário:`;
      
      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: contextMessage + ' ' + currentMessage,
      });
    } else {
      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: currentMessage,
      });
    }

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
      instructions: assistant.instructions || undefined,
    });

    const messages = await checkRunStatus({ threadId: thread.id, runId: run.id });
    
    if (!messages.data || messages.data.length === 0) {
      throw new Error('Nenhuma resposta recebida da OpenAI');
    }

    const responseAI = messages.data[0].content[0];
    
    if (responseAI.type === 'text') {
      return responseAI.text.value;
    } else {
      throw new Error('Tipo de resposta não suportado');
    }
  } catch (error) {
    console.error('Erro na comunicação com OpenAI:', error);
    throw error;
  }
}

async function checkRunStatus({
  threadId,
  runId,
}: {
  threadId: string;
  runId: string;
}): Promise<OpenAI.Beta.Threads.Messages.MessagesPage> {
  return await new Promise((resolve, _reject) => {
    const verify = async (): Promise<void> => {
      const runStatus = await openai.beta.threads.runs.retrieve(
        threadId,
        runId
      );

      if (runStatus.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(threadId);
        resolve(messages);
      } else {
        console.log('Aguardando resposta da OpenAI...');
        setTimeout(verify, 3000);
      }
    };

    verify();
  });
}
