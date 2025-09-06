import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Cliente público para o frontend
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para as tabelas do banco de dados
export interface WhatsAppSession {
  id: string;
  session_name: string;
  phone_number?: string;
  is_active: boolean;
  ai_config: Record<string, unknown>;
  timing_config: Record<string, unknown>;
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
  profile_data: Record<string, unknown>;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  session_id: string;
  user_id: string;
  conversation_data: Record<string, unknown>;
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
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SystemMetric {
  id: string;
  session_id: string;
  metric_type: string;
  metric_value: Record<string, unknown>;
  recorded_at: string;
}

// Funções para buscar dados
export async function getSessions() {
  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as WhatsAppSession[];
}

export async function getUsers() {
  const { data, error } = await supabase
    .from('whatsapp_users')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as WhatsAppUser[];
}

export async function getConversations() {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('last_interaction', { ascending: false });
  
  if (error) throw error;
  return data as Conversation[];
}

export async function getMessages(limit: number = 100) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data as Message[];
}

// Função para buscar métricas do sistema
export async function getMetrics() {
  const [sessionsResult, usersResult, conversationsResult, messagesResult] = 
    await Promise.all([
      supabase.from('whatsapp_sessions').select('*', { count: 'exact' }),
      supabase.from('whatsapp_users').select('*', { count: 'exact' }),
      supabase.from('conversations').select('*', { count: 'exact' }),
      supabase.from('messages').select('*', { count: 'exact' })
    ]);

  return {
    totalSessions: sessionsResult.count || 0,
    activeSessions: sessionsResult.data?.filter(s => s.is_active).length || 0,
    totalUsers: usersResult.count || 0,
    totalConversations: conversationsResult.count || 0,
    totalMessages: messagesResult.count || 0
  };
}