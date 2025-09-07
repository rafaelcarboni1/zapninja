import inquirer from 'inquirer';
import chalk from 'chalk';
import { supabase } from '../config/supabase';
import { logger } from '../util/logger';

interface AIConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
}

interface TimingConfig {
  response_time: number;
  message_delay: number;
  rest_period: number;
  working_hours: { start: string; end: string };
  message_limit_per_hour: number;
  typing_simulation: boolean;
}

/**
 * Editor de configurações do sistema
 */
export class ConfigurationEditor {
  
  /**
   * Edita configurações de uma sessão específica
   */
  async editSession(sessionName: string): Promise<void> {
    try {
      // Buscar dados da sessão
      const { data: session, error } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('session_name', sessionName)
        .single();

      if (error || !session) {
        console.log(chalk.red(`❌ Sessão '${sessionName}' não encontrada`));
        return;
      }

      console.clear();
      console.log(chalk.blue(`⚙️  CONFIGURAÇÕES DA SESSÃO: ${sessionName.toUpperCase()}`));
      console.log(chalk.gray('─'.repeat(60)));

      const choices = [
        { name: '🤖 Configurações de IA', value: 'ai_config' },
        { name: '⏱️  Configurações de Timing', value: 'timing_config' },
        { name: '📝 Prompt Personalizado', value: 'custom_prompt' },
        { name: '📊 Configurações Gerais', value: 'general_config' },
        { name: '👁️  Visualizar Configuração Atual', value: 'view_current' },
        new inquirer.Separator(),
        { name: '💾 Salvar e Voltar', value: 'save_exit' },
        { name: '🔙 Voltar sem Salvar', value: 'exit_no_save' }
      ];

      const { configSection } = await inquirer.prompt([{
        type: 'list',
        name: 'configSection',
        message: 'Selecione a configuração para editar:',
        choices,
        pageSize: 10
      }]);

      switch (configSection) {
        case 'ai_config':
          await this.editAIConfig(session);
          await this.editSession(sessionName); // Voltar ao menu
          break;
        case 'timing_config':
          await this.editTimingConfig(session);
          await this.editSession(sessionName);
          break;
        case 'custom_prompt':
          await this.editCustomPrompt(session);
          await this.editSession(sessionName);
          break;
        case 'general_config':
          await this.editGeneralConfig(session);
          await this.editSession(sessionName);
          break;
        case 'view_current':
          await this.viewCurrentConfig(session);
          await this.editSession(sessionName);
          break;
        case 'save_exit':
          console.log(chalk.green('✅ Configurações salvas!'));
          return;
        case 'exit_no_save':
          return;
      }

    } catch (error) {
      console.log(chalk.red(`❌ Erro ao editar configurações: ${error}`));
      logger.error('Erro no editor de configurações:', error);
    }
  }

  /**
   * Edita configurações de IA
   */
  private async editAIConfig(session: any): Promise<void> {
    console.log(chalk.blue('🤖 CONFIGURAÇÕES DE IA'));
    console.log(chalk.gray('─'.repeat(30)));

    const currentAIConfig: AIConfig = session.ai_config || {
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 2000,
      system_prompt: 'Você é um assistente virtual inteligente e amigável.'
    };

    console.log('Configurações atuais:');
    console.log(`  Modelo: ${chalk.yellow(currentAIConfig.model)}`);
    console.log(`  Temperatura: ${chalk.yellow(currentAIConfig.temperature)}`);
    console.log(`  Max Tokens: ${chalk.yellow(currentAIConfig.max_tokens)}`);
    console.log(`  Prompt do Sistema: ${chalk.yellow(currentAIConfig.system_prompt?.substring(0, 50) + '...')}`);
    console.log();

    const questions = [
      {
        type: 'list',
        name: 'model',
        message: 'Modelo de IA:',
        choices: [
          { name: '🤖 GPT-4 (Mais inteligente, mais caro)', value: 'gpt-4' },
          { name: '⚡ GPT-3.5-turbo (Mais rápido, mais barato)', value: 'gpt-3.5-turbo' },
          { name: '🧠 Google Gemini Pro', value: 'gemini-pro' },
          { name: '🆓 Google Gemini Flash (Gratuito)', value: 'gemini-1.5-flash' }
        ],
        default: currentAIConfig.model
      },
      {
        type: 'number',
        name: 'temperature',
        message: 'Temperatura (0.0 = mais focado, 2.0 = mais criativo):',
        default: currentAIConfig.temperature,
        validate: (value: number) => {
          if (value < 0 || value > 2) return 'Temperatura deve estar entre 0.0 e 2.0';
          return true;
        }
      },
      {
        type: 'number',
        name: 'max_tokens',
        message: 'Máximo de tokens por resposta:',
        default: currentAIConfig.max_tokens,
        validate: (value: number) => {
          if (value < 100 || value > 4000) return 'Tokens devem estar entre 100 e 4000';
          return true;
        }
      },
      {
        type: 'confirm',
        name: 'edit_prompt',
        message: 'Deseja editar o prompt do sistema?',
        default: false
      }
    ];

    const answers = await inquirer.prompt(questions);

    // Se o usuário quer editar o prompt, abrir editor personalizado
    let systemPrompt = currentAIConfig.system_prompt;
    if (answers.edit_prompt) {
      systemPrompt = await this.customPromptEditor(currentAIConfig.system_prompt);
    }

    const newAIConfig = {
      model: answers.model,
      temperature: answers.temperature,
      max_tokens: answers.max_tokens,
      system_prompt: systemPrompt
    };

    // Salvar no banco de dados
    const { error } = await supabase
      .from('whatsapp_sessions')
      .update({ ai_config: newAIConfig })
      .eq('session_name', session.session_name);

    if (error) {
      console.log(chalk.red(`❌ Erro ao salvar configurações de IA: ${error.message}`));
    } else {
      console.log(chalk.green('✅ Configurações de IA atualizadas!'));
    }

    await this.waitForKey();
  }

  /**
   * Edita configurações de timing
   */
  private async editTimingConfig(session: any): Promise<void> {
    console.log(chalk.blue('⏱️  CONFIGURAÇÕES DE TIMING'));
    console.log(chalk.gray('─'.repeat(35)));

    const currentTimingConfig: TimingConfig = session.timing_config || {
      response_time: 2000,
      message_delay: 1000,
      rest_period: 300000,
      working_hours: { start: '08:00', end: '22:00' },
      message_limit_per_hour: 100,
      typing_simulation: true
    };

    console.log('Configurações atuais:');
    console.log(`  Tempo de resposta: ${chalk.yellow(currentTimingConfig.response_time)}ms`);
    console.log(`  Delay entre mensagens: ${chalk.yellow(currentTimingConfig.message_delay)}ms`);
    console.log(`  Período de descanso: ${chalk.yellow(currentTimingConfig.rest_period)}ms`);
    console.log(`  Horário de funcionamento: ${chalk.yellow(currentTimingConfig.working_hours?.start)} às ${chalk.yellow(currentTimingConfig.working_hours?.end)}`);
    console.log(`  Limite de mensagens/hora: ${chalk.yellow(currentTimingConfig.message_limit_per_hour)}`);
    console.log(`  Simulação de digitação: ${currentTimingConfig.typing_simulation ? chalk.green('Sim') : chalk.red('Não')}`);
    console.log();

    const { editMode } = await inquirer.prompt([{
      type: 'list',
      name: 'editMode',
      message: 'Como deseja editar?',
      choices: [
        { name: '🧙‍♂️ Assistente Inteligente (Recomendado)', value: 'wizard' },
        { name: '🔧 Edição Manual Detalhada', value: 'manual' },
        { name: '⚡ Presets Rápidos', value: 'presets' }
      ]
    }]);

    let newTimingConfig: TimingConfig = currentTimingConfig;

    switch (editMode) {
      case 'wizard':
        newTimingConfig = await this.timingWizard(currentTimingConfig);
        break;
      case 'manual':
        newTimingConfig = await this.manualTimingEdit(currentTimingConfig);
        break;
      case 'presets':
        newTimingConfig = await this.timingPresets(currentTimingConfig);
        break;
    }

    // Salvar no banco de dados
    const { error } = await supabase
      .from('whatsapp_sessions')
      .update({ timing_config: newTimingConfig })
      .eq('session_name', session.session_name);

    if (error) {
      console.log(chalk.red(`❌ Erro ao salvar configurações de timing: ${error.message}`));
    } else {
      console.log(chalk.green('✅ Configurações de timing atualizadas!'));
    }

    await this.waitForKey();
  }

  /**
   * Assistente de configuração de timing
   */
  private async timingWizard(current: TimingConfig): Promise<TimingConfig> {
    console.log(chalk.blue('🧙‍♂️ ASSISTENTE DE TIMING'));
    console.log(chalk.gray('─'.repeat(28)));
    console.log(chalk.yellow('Vou ajudar você a configurar os tempos de resposta baseado no seu uso.'));
    console.log();

    const wizardQuestions = [
      {
        type: 'list',
        name: 'usage_type',
        message: 'Qual é o principal uso do seu bot?',
        choices: [
          { name: '🏢 Atendimento empresarial (formal)', value: 'business' },
          { name: '🛍️  Vendas/E-commerce (ágil)', value: 'sales' },
          { name: '🎓 Educacional/Suporte (detalhado)', value: 'education' },
          { name: '👥 Pessoal/Amigos (casual)', value: 'personal' },
          { name: '🤖 Assistente técnico (preciso)', value: 'technical' }
        ]
      },
      {
        type: 'list',
        name: 'response_style',
        message: 'Como deve ser o estilo de resposta?',
        choices: [
          { name: '⚡ Muito rápido (parece bot)', value: 'very_fast' },
          { name: '🏃‍♂️ Rápido (eficiente)', value: 'fast' },
          { name: '🚶‍♂️ Humano (natural)', value: 'human' },
          { name: '🐌 Reflexivo (pensativo)', value: 'slow' }
        ]
      },
      {
        type: 'list',
        name: 'volume',
        message: 'Qual o volume esperado de mensagens?',
        choices: [
          { name: '📈 Alto volume (>1000 msg/dia)', value: 'high' },
          { name: '📊 Médio volume (100-1000 msg/dia)', value: 'medium' },
          { name: '📉 Baixo volume (<100 msg/dia)', value: 'low' }
        ]
      },
      {
        type: 'confirm',
        name: 'typing_simulation',
        message: 'Ativar simulação de digitação?',
        default: true
      }
    ];

    const answers = await inquirer.prompt(wizardQuestions);

    // Gerar configuração baseada nas respostas
    const timingConfig = this.generateTimingFromWizard(answers, current);

    console.log(chalk.green('\n✨ Configuração gerada:'));
    this.displayTimingPreview(timingConfig);

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Aplicar esta configuração?',
      default: true
    }]);

    return confirm ? timingConfig : current;
  }

  /**
   * Edição manual de timing
   */
  private async manualTimingEdit(current: TimingConfig): Promise<TimingConfig> {
    console.log(chalk.blue('🔧 EDIÇÃO MANUAL DE TIMING'));
    console.log(chalk.gray('─'.repeat(32)));

    const questions = [
      {
        type: 'number',
        name: 'response_time',
        message: 'Tempo base de resposta (ms):',
        default: current.response_time,
        validate: (value: number) => value >= 500 && value <= 30000 || 'Entre 500ms e 30s'
      },
      {
        type: 'number',
        name: 'message_delay',
        message: 'Delay entre mensagens (ms):',
        default: current.message_delay,
        validate: (value: number) => value >= 100 && value <= 10000 || 'Entre 100ms e 10s'
      },
      {
        type: 'number',
        name: 'rest_period',
        message: 'Período de descanso (ms):',
        default: current.rest_period,
        validate: (value: number) => value >= 60000 && value <= 1800000 || 'Entre 1min e 30min'
      },
      {
        type: 'input',
        name: 'start_hour',
        message: 'Hora de início (HH:MM):',
        default: current.working_hours?.start || '08:00',
        validate: (value: string) => /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value) || 'Formato HH:MM válido'
      },
      {
        type: 'input',
        name: 'end_hour',
        message: 'Hora de fim (HH:MM):',
        default: current.working_hours?.end || '22:00',
        validate: (value: string) => /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value) || 'Formato HH:MM válido'
      },
      {
        type: 'number',
        name: 'message_limit_per_hour',
        message: 'Limite de mensagens por hora:',
        default: current.message_limit_per_hour,
        validate: (value: number) => value >= 10 && value <= 1000 || 'Entre 10 e 1000'
      },
      {
        type: 'confirm',
        name: 'typing_simulation',
        message: 'Ativar simulação de digitação?',
        default: current.typing_simulation
      }
    ];

    const answers = await inquirer.prompt(questions);

    return {
      response_time: answers.response_time,
      message_delay: answers.message_delay,
      rest_period: answers.rest_period,
      working_hours: {
        start: answers.start_hour,
        end: answers.end_hour
      },
      message_limit_per_hour: answers.message_limit_per_hour,
      typing_simulation: answers.typing_simulation
    };
  }

  /**
   * Presets rápidos de timing
   */
  private async timingPresets(current: TimingConfig): Promise<TimingConfig> {
    console.log(chalk.blue('⚡ PRESETS DE TIMING'));
    console.log(chalk.gray('─'.repeat(25)));

    const presets = {
      ultra_fast: {
        name: '🚀 Ultra Rápido (Bot óbvio)',
        config: {
          response_time: 500,
          message_delay: 200,
          rest_period: 60000,
          working_hours: { start: '00:00', end: '23:59' },
          message_limit_per_hour: 500,
          typing_simulation: false
        }
      },
      fast_business: {
        name: '⚡ Negócios Ágil',
        config: {
          response_time: 1000,
          message_delay: 500,
          rest_period: 180000,
          working_hours: { start: '08:00', end: '18:00' },
          message_limit_per_hour: 200,
          typing_simulation: true
        }
      },
      human_like: {
        name: '👤 Humano Natural',
        config: {
          response_time: 3000,
          message_delay: 1500,
          rest_period: 300000,
          working_hours: { start: '08:00', end: '22:00' },
          message_limit_per_hour: 100,
          typing_simulation: true
        }
      },
      slow_thoughtful: {
        name: '🤔 Reflexivo Lento',
        config: {
          response_time: 5000,
          message_delay: 2500,
          rest_period: 600000,
          working_hours: { start: '09:00', end: '21:00' },
          message_limit_per_hour: 50,
          typing_simulation: true
        }
      },
      night_mode: {
        name: '🌙 Modo Noturno',
        config: {
          response_time: 8000,
          message_delay: 4000,
          rest_period: 900000,
          working_hours: { start: '22:00', end: '08:00' },
          message_limit_per_hour: 30,
          typing_simulation: true
        }
      }
    };

    const choices = Object.entries(presets).map(([key, preset]) => ({
      name: preset.name,
      value: key
    }));

    choices.push(new inquirer.Separator(), { name: '🔙 Voltar', value: 'back' });

    const { selectedPreset } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedPreset',
      message: 'Selecione um preset:',
      choices
    }]);

    if (selectedPreset === 'back') {
      return current;
    }

    const preset = presets[selectedPreset as keyof typeof presets];
    
    console.log(chalk.green(`\n📋 Preview do preset: ${preset.name}`));
    this.displayTimingPreview(preset.config);

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Aplicar este preset?',
      default: true
    }]);

    return confirm ? preset.config : current;
  }

  /**
   * Edita prompt personalizado
   */
  private async editCustomPrompt(session: any): Promise<void> {
    console.log(chalk.blue('📝 PROMPT PERSONALIZADO'));
    console.log(chalk.gray('─'.repeat(25)));

    const currentPrompt = session.custom_prompt || '';

    if (currentPrompt) {
      console.log('Prompt atual:');
      console.log(chalk.yellow(currentPrompt.substring(0, 200) + '...'));
      console.log();
    }

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'O que deseja fazer?',
      choices: [
        { name: '✏️  Editar Prompt', value: 'edit' },
        { name: '📋 Templates de Prompt', value: 'templates' },
        { name: '👁️  Visualizar Prompt Completo', value: 'view' },
        { name: '🗑️  Remover Prompt (usar padrão)', value: 'remove' },
        { name: '🔙 Voltar', value: 'back' }
      ]
    }]);

    switch (action) {
      case 'edit':
        await this.editPromptText(session);
        break;
      case 'templates':
        await this.selectPromptTemplate(session);
        break;
      case 'view':
        console.log('\n📄 Prompt completo:');
        console.log(chalk.yellow(currentPrompt || 'Nenhum prompt personalizado definido'));
        await this.waitForKey();
        break;
      case 'remove':
        await this.removeCustomPrompt(session);
        break;
    }
  }

  /**
   * Edita texto do prompt da sessão (versão compatível)
   */
  private async editPromptText(session: any): Promise<void> {
    const currentPrompt = session.custom_prompt || `Você é um assistente virtual inteligente e amigável chamado ${session.session_name}.

Suas características:
- Sempre responde em português brasileiro
- É educado, prestativo e profissional  
- Mantém conversas naturais e engajantes
- Oferece ajuda específica baseada no contexto
- Não revela que é um bot a menos que perguntado diretamente

Diretrizes:
- Seja conciso mas completo nas respostas
- Use emojis moderadamente para deixar a conversa mais amigável
- Sempre pergunte se pode ajudar com mais alguma coisa
- Mantenha o tom adequado ao contexto da conversa`;

    // Usar o editor personalizado seguro (renomeado para evitar conflito)
    const newPrompt = await this.customPromptEditor(currentPrompt);

    // Salvar no banco
    const { error } = await supabase
      .from('whatsapp_sessions')
      .update({ custom_prompt: newPrompt })
      .eq('session_name', session.session_name);

    if (error) {
      console.log(chalk.red(`❌ Erro ao salvar prompt: ${error.message}`));
    } else {
      console.log(chalk.green('✅ Prompt personalizado atualizado!'));
    }

    await this.waitForKey();
  }

  /**
   * Seleciona template de prompt
   */
  private async selectPromptTemplate(session: any): Promise<void> {
    console.log(chalk.blue('📋 TEMPLATES DE PROMPT'));
    console.log(chalk.gray('─'.repeat(25)));

    const templates = {
      business: {
        name: '🏢 Atendimento Empresarial',
        prompt: `Você é um assistente de atendimento ao cliente da empresa ${session.session_name}.

Suas responsabilidades:
- Fornecer informações sobre produtos e serviços
- Resolver dúvidas de forma profissional e eficiente
- Encaminhar para setores específicos quando necessário
- Manter sempre um tom cordial e profissional

Diretrizes:
- Use tratamento formal (Senhor/Senhora)
- Seja objetivo e claro nas respostas
- Sempre ofereça opções de contato adicional
- Registre informações importantes do cliente`
      },
      sales: {
        name: '🛍️ Assistente de Vendas',
        prompt: `Você é um consultor de vendas especializado em ${session.session_name}.

Seu objetivo:
- Ajudar clientes a encontrar produtos ideais
- Esclarecer dúvidas sobre preços e condições
- Guiar o processo de compra de forma natural
- Criar relacionamento de confiança com o cliente

Técnicas de vendas:
- Faça perguntas para entender necessidades
- Destaque benefícios, não apenas características
- Use depoimentos e provas sociais quando relevante
- Crie senso de urgência quando apropriado`
      },
      support: {
        name: '🛠️ Suporte Técnico',
        prompt: `Você é um especialista em suporte técnico da ${session.session_name}.

Sua expertise:
- Diagnosticar problemas técnicos
- Fornecer soluções passo a passo
- Explicar procedimentos de forma didática
- Escalar problemas complexos quando necessário

Metodologia:
- Sempre confirme o entendimento do problema
- Ofereça soluções em ordem de simplicidade
- Use linguagem técnica apropriada ao nível do usuário
- Documente soluções aplicadas`
      },
      personal: {
        name: '👤 Assistente Pessoal',
        prompt: `Você é um assistente pessoal amigável chamado ${session.session_name}.

Sua personalidade:
- Descontraído mas respeitoso
- Curioso sobre os interesses do usuário
- Prestativo em diversas áreas
- Mantém conversas interessantes

Capacidades:
- Responder perguntas gerais
- Dar sugestões e conselhos
- Ajudar com planejamento e organização
- Conversar sobre diversos tópicos`
      },
      educational: {
        name: '🎓 Tutor Educacional',
        prompt: `Você é um tutor educacional especializado, representando ${session.session_name}.

Sua missão:
- Explicar conceitos de forma clara e didática
- Adaptar explicações ao nível do estudante
- Incentivar o aprendizado ativo
- Avaliar compreensão através de perguntas

Metodologia pedagógica:
- Use exemplos práticos e analogias
- Quebre conceitos complexos em partes simples
- Estimule questionamentos e curiosidade
- Forneça exercícios e atividades práticas`
      }
    };

    const choices = Object.entries(templates).map(([key, template]) => ({
      name: template.name,
      value: key
    }));

    choices.push(new inquirer.Separator(), { name: '🔙 Voltar', value: 'back' });

    const { selectedTemplate } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedTemplate',
      message: 'Selecione um template:',
      choices
    }]);

    if (selectedTemplate === 'back') return;

    const template = templates[selectedTemplate as keyof typeof templates];

    console.log('\n📄 Preview do template:');
    console.log(chalk.yellow(template.prompt));

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Aplicar este template?',
      default: true
    }]);

    if (confirm) {
      // Salvar no banco
      const { error } = await supabase
        .from('whatsapp_sessions')
        .update({ custom_prompt: template.prompt })
        .eq('session_name', session.session_name);

      if (error) {
        console.log(chalk.red(`❌ Erro ao aplicar template: ${error.message}`));
      } else {
        console.log(chalk.green('✅ Template aplicado com sucesso!'));
      }
    }

    await this.waitForKey();
  }

  /**
   * Remove prompt personalizado
   */
  private async removeCustomPrompt(session: any): Promise<void> {
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Tem certeza que deseja remover o prompt personalizado?',
      default: false
    }]);

    if (confirm) {
      const { error } = await supabase
        .from('whatsapp_sessions')
        .update({ custom_prompt: null })
        .eq('session_name', session.session_name);

      if (error) {
        console.log(chalk.red(`❌ Erro ao remover prompt: ${error.message}`));
      } else {
        console.log(chalk.green('✅ Prompt personalizado removido! Será usado o prompt padrão.'));
      }

      await this.waitForKey();
    }
  }

  /**
   * Edita configurações gerais da sessão
   */
  private async editGeneralConfig(session: any): Promise<void> {
    console.log(chalk.blue('📊 CONFIGURAÇÕES GERAIS'));
    console.log(chalk.gray('─'.repeat(28)));

    const questions = [
      {
        type: 'input',
        name: 'phone_number',
        message: 'Número do WhatsApp:',
        default: session.phone_number || '',
        validate: (value: string) => {
          if (!value.trim()) return true; // Opcional
          if (!/^\d{10,15}$/.test(value.replace(/\D/g, ''))) return 'Número inválido';
          return true;
        }
      },
      {
        type: 'confirm',
        name: 'is_active',
        message: 'Sessão ativa?',
        default: session.is_active
      },
      {
        type: 'number',
        name: 'max_messages',
        message: 'Limite máximo de mensagens por conversa:',
        default: session.max_messages || 100,
        validate: (value: number) => {
          if (value < 10 || value > 1000) return 'Entre 10 e 1000 mensagens';
          return true;
        }
      }
    ];

    const answers = await inquirer.prompt(questions);

    // Salvar no banco
    const { error } = await supabase
      .from('whatsapp_sessions')
      .update({
        phone_number: answers.phone_number || null,
        is_active: answers.is_active,
        max_messages: answers.max_messages
      })
      .eq('session_name', session.session_name);

    if (error) {
      console.log(chalk.red(`❌ Erro ao salvar configurações gerais: ${error.message}`));
    } else {
      console.log(chalk.green('✅ Configurações gerais atualizadas!'));
    }

    await this.waitForKey();
  }

  /**
   * Visualiza configuração atual
   */
  private async viewCurrentConfig(session: any): Promise<void> {
    console.log(chalk.blue('👁️  CONFIGURAÇÃO ATUAL DA SESSÃO'));
    console.log(chalk.gray('─'.repeat(40)));

    console.log(`${chalk.bold('Nome:')} ${session.session_name}`);
    console.log(`${chalk.bold('Telefone:')} ${session.phone_number || 'Não definido'}`);
    console.log(`${chalk.bold('Status:')} ${session.is_active ? chalk.green('Ativo') : chalk.red('Inativo')}`);
    console.log(`${chalk.bold('Limite de mensagens:')} ${session.max_messages || 100}`);
    
    console.log(chalk.blue('\n🤖 Configurações de IA:'));
    if (session.ai_config) {
      console.log(`  Modelo: ${session.ai_config.model}`);
      console.log(`  Temperatura: ${session.ai_config.temperature}`);
      console.log(`  Max Tokens: ${session.ai_config.max_tokens}`);
      console.log(`  Prompt: ${session.ai_config.system_prompt?.substring(0, 100)}...`);
    } else {
      console.log('  Usando configurações padrão');
    }

    console.log(chalk.blue('\n⏱️ Configurações de Timing:'));
    if (session.timing_config) {
      console.log(`  Tempo de resposta: ${session.timing_config.response_time}ms`);
      console.log(`  Delay mensagens: ${session.timing_config.message_delay}ms`);
      console.log(`  Período descanso: ${session.timing_config.rest_period}ms`);
      console.log(`  Horário funcionamento: ${session.timing_config.working_hours?.start} - ${session.timing_config.working_hours?.end}`);
      console.log(`  Limite/hora: ${session.timing_config.message_limit_per_hour}`);
      console.log(`  Simulação digitação: ${session.timing_config.typing_simulation ? 'Sim' : 'Não'}`);
    } else {
      console.log('  Usando configurações padrão');
    }

    if (session.custom_prompt) {
      console.log(chalk.blue('\n📝 Prompt Personalizado:'));
      console.log(chalk.yellow(session.custom_prompt.substring(0, 200) + '...'));
    }

    console.log(`\n${chalk.gray('Criada em:')} ${new Date(session.created_at).toLocaleString('pt-BR')}`);
    console.log(`${chalk.gray('Atualizada em:')} ${new Date(session.updated_at).toLocaleString('pt-BR')}`);

    await this.waitForKey();
  }

  /**
   * Edita configurações globais de IA
   */
  async editGlobalAI(): Promise<void> {
    console.log(chalk.blue('🤖 CONFIGURAÇÕES GLOBAIS DE IA'));
    console.log(chalk.gray('─'.repeat(38)));
    console.log(chalk.yellow('Estas configurações afetarão novas sessões criadas.'));
    console.log();

    // Aqui você pode implementar configurações globais de IA
    // Por exemplo, keys das APIs, configurações padrão, etc.
    
    await this.waitForKey();
  }

  /**
   * Edita configurações globais de timing
   */
  async editGlobalTiming(): Promise<void> {
    console.log(chalk.blue('⏱️ CONFIGURAÇÕES GLOBAIS DE TIMING'));
    console.log(chalk.gray('─'.repeat(42)));
    console.log(chalk.yellow('Estas configurações afetarão novas sessões criadas.'));
    console.log();

    // Aqui você pode implementar configurações globais de timing
    
    await this.waitForKey();
  }

  /**
   * Gera configuração de timing baseada no wizard
   */
  private generateTimingFromWizard(answers: any, current: TimingConfig): TimingConfig {
    const configs = {
      business: {
        very_fast: { response_time: 800, message_delay: 300, rest_period: 120000 },
        fast: { response_time: 1500, message_delay: 500, rest_period: 180000 },
        human: { response_time: 2500, message_delay: 1000, rest_period: 240000 },
        slow: { response_time: 4000, message_delay: 1500, rest_period: 300000 }
      },
      sales: {
        very_fast: { response_time: 600, message_delay: 200, rest_period: 60000 },
        fast: { response_time: 1000, message_delay: 400, rest_period: 120000 },
        human: { response_time: 2000, message_delay: 800, rest_period: 180000 },
        slow: { response_time: 3500, message_delay: 1200, rest_period: 240000 }
      },
      education: {
        very_fast: { response_time: 1000, message_delay: 500, rest_period: 180000 },
        fast: { response_time: 2000, message_delay: 1000, rest_period: 240000 },
        human: { response_time: 3500, message_delay: 1500, rest_period: 300000 },
        slow: { response_time: 5000, message_delay: 2000, rest_period: 420000 }
      },
      personal: {
        very_fast: { response_time: 500, message_delay: 200, rest_period: 60000 },
        fast: { response_time: 1200, message_delay: 600, rest_period: 120000 },
        human: { response_time: 2500, message_delay: 1200, rest_period: 240000 },
        slow: { response_time: 4500, message_delay: 2000, rest_period: 360000 }
      },
      technical: {
        very_fast: { response_time: 1200, message_delay: 600, rest_period: 180000 },
        fast: { response_time: 2000, message_delay: 1000, rest_period: 240000 },
        human: { response_time: 3000, message_delay: 1500, rest_period: 300000 },
        slow: { response_time: 5000, message_delay: 2500, rest_period: 420000 }
      }
    };

    const baseConfig = configs[answers.usage_type as keyof typeof configs][answers.response_style as keyof typeof configs.business];
    
    // Ajustes baseados no volume
    const volumeMultiplier = {
      high: 0.7,   // Mais rápido para alto volume
      medium: 1.0, // Padrão
      low: 1.3     // Mais lento para baixo volume
    };

    const multiplier = volumeMultiplier[answers.volume as keyof typeof volumeMultiplier];

    return {
      response_time: Math.round(baseConfig.response_time * multiplier),
      message_delay: Math.round(baseConfig.message_delay * multiplier),
      rest_period: Math.round(baseConfig.rest_period * multiplier),
      working_hours: current.working_hours || { start: '08:00', end: '22:00' },
      message_limit_per_hour: answers.volume === 'high' ? 200 : answers.volume === 'medium' ? 100 : 50,
      typing_simulation: answers.typing_simulation
    };
  }

  /**
   * Exibe preview das configurações de timing
   */
  private displayTimingPreview(config: TimingConfig): void {
    console.log(`  ⏱️ Tempo de resposta: ${chalk.cyan(config.response_time)}ms`);
    console.log(`  ⏳ Delay mensagens: ${chalk.cyan(config.message_delay)}ms`);
    console.log(`  😴 Descanso: ${chalk.cyan(Math.round(config.rest_period / 1000))}s`);
    console.log(`  🕐 Horário: ${chalk.cyan(config.working_hours?.start)} às ${chalk.cyan(config.working_hours?.end)}`);
    console.log(`  📊 Limite/hora: ${chalk.cyan(config.message_limit_per_hour)} msgs`);
    console.log(`  ⌨️ Digitação: ${config.typing_simulation ? chalk.green('Sim') : chalk.red('Não')}`);
  }

  /**
   * Editor de texto para prompts (multilinhas)
   */
  private async customPromptEditor(currentPrompt: string = ''): Promise<string> {
    console.log(chalk.blue('\n✏️  EDITOR DE PROMPT'));
    console.log(chalk.gray('─'.repeat(25)));
    console.log(chalk.yellow('💡 Dicas:'));
    console.log(chalk.yellow('  • Digite o prompt completo (pode ser longo)'));
    console.log(chalk.yellow('  • Use \\n para quebras de linha dentro do texto'));
    console.log(chalk.yellow('  • Digite "CANCELAR" para manter o atual'));
    console.log(chalk.yellow('  • Digite "LIMPAR" para começar do zero'));
    console.log();

    if (currentPrompt) {
      console.log(chalk.blue('📄 Prompt atual:'));
      console.log(chalk.gray('─'.repeat(15)));
      console.log(chalk.cyan(this.formatPromptPreview(currentPrompt)));
      console.log();
    }

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'O que deseja fazer?',
      choices: [
        { name: '✏️  Editar Prompt', value: 'edit' },
        { name: '📋 Usar Template', value: 'template' },
        { name: '🗑️  Limpar e Começar do Zero', value: 'clear' },
        { name: '❌ Cancelar (manter atual)', value: 'cancel' }
      ]
    }]);

    switch (action) {
      case 'edit':
        return await this.inputLongText('Digite o novo prompt:', currentPrompt);
      
      case 'template':
        console.log(chalk.yellow('🔧 Funcionalidade de templates será implementada em breve'));
        return currentPrompt;
      
      case 'clear':
        return await this.inputLongText('Digite o prompt do zero:', '');
      
      case 'cancel':
      default:
        return currentPrompt;
    }
  }

  /**
   * Input para textos longos com confirmação
   */
  private async inputLongText(message: string, defaultText: string = ''): Promise<string> {
    console.log(chalk.blue(`\n📝 ${message}`));
    console.log(chalk.gray('─'.repeat(30)));
    
    if (defaultText) {
      console.log(chalk.yellow('Texto atual:'));
      console.log(chalk.cyan(this.formatPromptPreview(defaultText)));
      console.log();
    }

    const { newText } = await inquirer.prompt([{
      type: 'input',
      name: 'newText',
      message: 'Digite o prompt (use \\n para quebras de linha):',
      default: defaultText,
      validate: (value: string) => {
        const actualText = value.replace(/\\n/g, '\n').trim();
        if (actualText.length < 10) return 'Prompt deve ter pelo menos 10 caracteres';
        return true;
      }
    }]);

    // Converter \n em quebras de linha reais
    const processedText = newText.replace(/\\n/g, '\n');
    
    // Mostrar preview
    console.log(chalk.green('\n✅ Preview do prompt:'));
    console.log(chalk.gray('─'.repeat(20)));
    console.log(chalk.cyan(this.formatPromptPreview(processedText)));
    console.log();

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Confirma este prompt?',
      default: true
    }]);

    if (confirm) {
      return processedText;
    } else {
      // Tentar novamente
      return await this.inputLongText(message, newText);
    }
  }


  /**
   * Formata preview do prompt para exibição
   */
  private formatPromptPreview(text: string): string {
    // Limitar a 300 caracteres para preview
    if (text.length <= 300) return text;
    
    return text.substring(0, 300) + chalk.gray('... (continua)');
  }

  /**
   * Aguarda pressionar Enter
   */
  private async waitForKey(): Promise<void> {
    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: 'Pressione Enter para continuar...'
    }]);
  }
}

export const configurationEditor = new ConfigurationEditor();