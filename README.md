# ZAPNINJA – Operações de Banco (Railway Postgres)

## Aplicar o schema no Postgres

Usamos um script dedicado para executar `apps/backend/database/schema.sql` no banco.

Executar localmente (usando a sua DATABASE_PUBLIC_URL):

```
# 1) Conexão pública (Railway → Postgres → Variables → DATABASE_PUBLIC_URL)
export DATABASE_URL="postgresql://postgres:******@nozomi.proxy.rlwy.net:22723/railway?sslmode=require"

# 2) Caso encontre erro de certificado self-signed, habilite (somente para a execução):
export ALLOW_INSECURE_TLS=true

# 3) Rodar o script
node apps/backend/scripts/apply-schema.js
```

Via pnpm (atalho):

```
pnpm --filter @zapninja/backend db:apply
```

No ambiente Railway (Pre-deploy do backend):

```
pnpm --filter @zapninja/backend db:apply
```

O script aceita `DATABASE_URL` ou `DATABASE_PUBLIC_URL` e, se `ALLOW_INSECURE_TLS=true`, desativa a verificação do certificado para permitir conexão com o proxy público da Railway somente durante a aplicação do schema.

# Zap-GPT

Este projeto explora a integração do ChatGPT com o WhatsApp, transformando o chatbot em um assistente virtual capaz de realizar tarefas como falar com amigos, responder a perguntas de clientes, e muito mais, com um toque de humanização nas conversas.

## 📚 Como funciona

A integração começa com o [wpconnect](https://github.com/wppconnect-team/wppconnect), que estabelece a conexão com o WhatsApp. <br/>
As mensagens recebidas são então processadas pela API do ChatGPT ou Gemini, que gera respostas coerentes e personalizadas.<br/>
Utilizamos um [assistant](https://platform.openai.com/docs/assistants/overview) da OpenAI, que é um do modelo OpenAI que foi pré-configurado com prompts detalhados. </br>
No caso do Gemini usamos um prompt pronto para instruções do modelo. </br>
Esses prompts orientam o assistente sobre como responder de maneira coerente e personalizada, assegurando que as interações não só se mantenham relevantes e engajantes, mas também reflitam uma abordagem humana e natural na conversação.

## 🚀 Como rodar o projeto
[Vídeo mostrando como rodar](https://youtu.be/Sh94c6yn5aQ)

## 🧪 Informações

Você pode testar o zap-gpt que está ativo neste [WhatsApp](https://wa.me/5551981995600)  </br>
Confira mais detalhes do projeto no meu [Instagram](https://www.instagram.com/marcusdev_)

## 🎉 Zap GPT Client

O **Zap-GPT-Client** é uma versão aprimorada do Zap-GPT em formato executável com interface, oferecendo mais funcionalidades extras e maior performance. Diferente de seu antecessor, ele não utiliza o wppconnect, corrigindo diversos bugs e problemas.

### Funcionalidades Diferenciais
- 🗣️ **Entendimento de Áudio e Imagem:** Agora a IA pode entender e responder a mensagens de áudio e imagem.
- ⏸️ **Controle de Conversas:** É possível parar a IA em conversas específicas.
- 🎯 **Respostas Personalizadas:** Você pode escolher quem a IA deve ou não responder.
- 🔒 **Atualizações de Segurança:** Todas as atualizações de segurança mais recentes estão incluídas.
- ⌨️ **Simulação de Digitação:** Para uma experiência mais humana, a IA simula a digitação.
- 🖥️ **Interface Intuitiva:** Uma interface amigável permite configurar facilmente todas as funcionalidades.
- 🔗 **Conexão de Múltiplas Contas:** Conecte e gerencie várias contas de WhatsApp no mesmo cliente, sem custo adicional por número.

Com o **Zap-GPT-Client**, você tem mais controle, segurança e eficiência! 🚀

Adquira agora [clicando aqui!](https://www.ozapgpt.com.br/) </br>
Tire suas dúvidas via [WhatsApp](https://wa.me/5551981995600)  </br>
