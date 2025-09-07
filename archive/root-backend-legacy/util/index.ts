import { type Whatsapp } from '@wppconnect-team/wppconnect';

export function splitMessages(text: string): string[] {
  const complexPattern =
    /(http[s]?:\/\/[^\s]+)|(www\.[^\s]+)|([^\s]+@[^\s]+\.[^\s]+)|(["'].*?["'])|(\b\d+\.\s)|(\w+\.\w+)/g;
  const placeholders = text.match(complexPattern) ?? [];

  const placeholder = 'PLACEHOLDER_';
  let currentIndex = 0;
  const textWithPlaceholders = text.replace(
    complexPattern,
    () => `${placeholder}${currentIndex++}`
  );

  const splitPattern = /(?<!\b\d+\.\s)(?<!\w+\.\w+)[^.?!]+(?:[.?!]+["']?|$)/g;
  let parts = textWithPlaceholders.match(splitPattern) ?? ([] as string[]);

  if (placeholders.length > 0) {
    parts = parts.map((part) =>
      placeholders.reduce(
        (acc, val, idx) => acc.replace(`${placeholder}${idx}`, val),
        part
      )
    );
  }

  return parts;
}

// Simula digitação humana com delays realistas
function calculateTypingDelay(text: string): number {
  const baseDelay = 1000; // 1 segundo base
  const charsPerSecond = 3; // Velocidade de digitação humana (3 chars/seg)
  const typingTime = (text.length / charsPerSecond) * 1000;
  const randomVariation = Math.random() * 2000 + 500; // 0.5-2.5s variação
  return baseDelay + typingTime + randomVariation;
}

// Simula que o usuário está digitando
async function simulateTyping(client: Whatsapp, targetNumber: string, duration: number): Promise<void> {
  try {
    await client.startTyping(targetNumber);
    await new Promise(resolve => setTimeout(resolve, duration));
    await client.stopTyping(targetNumber);
  } catch (error) {
    // Se não conseguir simular digitação, apenas aguarda
    await new Promise(resolve => setTimeout(resolve, duration));
  }
}

export async function sendMessagesWithDelay({
  messages,
  client,
  targetNumber,
}: {
  messages: string[];
  client: Whatsapp;
  targetNumber: string;
}): Promise<void> {
  // Verificar se o cliente está conectado
  const isConnected = await client.isConnected();
  if (!isConnected) {
    console.error('Cliente WhatsApp não está conectado. Abortando envio de mensagens.');
    throw new Error('Cliente WhatsApp desconectado');
  }

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    // Simula digitação antes de enviar
    const typingDelay = calculateTypingDelay(message);
    await simulateTyping(client, targetNumber, typingDelay);
    
    // Envia a mensagem com retry logic
    let retryCount = 0;
    const maxRetries = 3;
    let sent = false;
    
    while (retryCount < maxRetries && !sent) {
      try {
        // Verificar se o chat existe antes de enviar
        const chatExists = await checkChatExists(client, targetNumber);
        
        if (!chatExists) {
          console.log(`Chat não encontrado para ${targetNumber}. Tentando criar...`);
          // Tentar criar o chat primeiro
          await createChat(client, targetNumber);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1s
        }
        
        const result = await client.sendText(targetNumber, message.trimStart());
        console.log('Mensagem enviada:', result.body);
        sent = true;
      } catch (erro: any) {
        retryCount++;
        console.error(`Erro ao enviar mensagem (tentativa ${retryCount}/${maxRetries}):`, erro.message || erro);
        
        if (retryCount < maxRetries) {
          // Aguardar antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Delay progressivo
        } else {
          console.error('Falha ao enviar mensagem após todas as tentativas.');
          // Não quebrar o loop, continuar com próximas mensagens
        }
      }
    }
    
    // Pausa entre mensagens (se houver mais de uma)
    if (i < messages.length - 1) {
      const pauseBetweenMessages = Math.random() * 1500 + 500; // 0.5-2s
      await new Promise((resolve) => setTimeout(resolve, pauseBetweenMessages));
    }
  }
}

// Função auxiliar para verificar se o chat existe
async function checkChatExists(client: Whatsapp, targetNumber: string): Promise<boolean> {
  try {
    const chat = await client.getChatById(targetNumber);
    return !!chat;
  } catch (error) {
    return false;
  }
}

// Função auxiliar para criar um chat se não existir
async function createChat(client: Whatsapp, targetNumber: string): Promise<void> {
  try {
    // Tentar obter o contato primeiro
    const contact = await client.getContact(targetNumber);
    if (contact) {
      // Criar um chat vazio enviando uma mensagem e depois deletando (workaround)
      // Como alternativa mais limpa, vamos apenas garantir que o número está válido
      console.log(`Contato encontrado: ${contact.pushname || contact.name || targetNumber}`);
    }
  } catch (error) {
    console.error('Erro ao verificar contato:', error);
    throw new Error(`Número ${targetNumber} pode não ser válido ou não estar no WhatsApp`);
  }
}
