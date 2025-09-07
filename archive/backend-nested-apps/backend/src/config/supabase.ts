import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../util/logger';

// Carregar variáveis de ambiente
dotenv.config();

// Configurações do Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Configurações do Supabase não encontradas no .env');
  throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios');
}

// Cliente público (para operações básicas)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente administrativo (para operações que requerem privilégios elevados)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Tipos para as tabelas do banco de dados
export interface WhatsAppSession {
  id: string;
  session_name: string;
  phone_number?: string;
  is_active: boolean;
  ai_config: Record<string, any>;
  timing_config: Record<string, any>;
  max_messages?: number;
  custom_prompt?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppUser {
  id: string;
  phone_number: string;
  name?: string;
  display_name?: string;
  is_active?: boolean;
  profile_data: Record<string, any>;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  session_id: string;
  user_id: string;
  conversation_data: Record<string, any>;
  context_summary: string;
  last_interaction: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'ai' | 'system';
  content: string;
  message_type: 'text' | 'image' | 'audio' | 'document' | 'command';
  metadata: Record<string, any>;
  created_at: string;
}

export interface UserContext {
  id: string;
  user_id: string;
  session_id: string;
  context_type: string;
  context_data: Record<string, any>;
  relevance_score: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminCommand {
  id: string;
  session_id: string;
  command_name: string;
  parameters: Record<string, any>;
  executed_by: string;
  execution_result: Record<string, any>;
  created_at: string;
}

export interface SystemMetric {
  id: string;
  session_id: string;
  metric_type: string;
  metric_value: Record<string, any>;
  recorded_at: string;
}

export interface LearningData {
  id: string;
  session_id: string;
  user_id: string;
  interaction_type: string;
  input_data: Record<string, any>;
  output_data: Record<string, any>;
  feedback_score?: number;
  learning_tags: string[];
  created_at: string;
}

// Função para testar a conexão
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('whatsapp_sessions').select('count').limit(1);
    
    if (error) {
      logger.error('Erro ao testar conexão com Supabase:', error);
      return false;
    }
    
    logger.info('Conexão com Supabase estabelecida com sucesso');
    return true;
  } catch (error) {
    logger.error('Erro ao conectar com Supabase:', error);
    return false;
  }
}

logger.info('Configuração do Supabase carregada');
