import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface FlowSimulatorProps {
  prompts: {
    prompt1: string;
    prompt2: string;
    prompt3: string;
    prompt4: string;
    prompt5: string;
    prompt6: string;
    prompt7: string;
    promptDesq: string;
    promptObjections: string;
    promptSchedule: string;
    promptContract: string;
    promptClosing: string;
    promptTrust: string;
    promptFees: string;
    aiChatPrompt: string;
  };
}

export default function FlowSimulator({ prompts }: FlowSimulatorProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; content: string; step?: string }[]>([
    { role: 'bot', content: 'Olá! Eu sou o simulador da Alice. Digite "Oi" para começar o teste do novo fluxo.', step: 'Início' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setMessages(prev => [...prev, { 
          role: 'bot', 
          content: "Erro: API Key do Gemini não encontrada. Verifique as configurações do ambiente (VITE_GEMINI_API_KEY ou process.env.GEMINI_API_KEY)." 
        }]);
        setLoading(false);
        return;
      }
      const genAI = new GoogleGenAI({ apiKey: apiKey as string });
      
      // Construct the simulator prompt
      const simulatorSystemInstruction = `
        Você é a Alice, assistente virtual do escritório Sichel & Duboc. 
        Seu objetivo é agir EXATAMENTE como o robô configurado pelos prompts abaixo.
        
        REGRAS DO FLUXO:
        1. Comece pelas Boas-vindas e Nome (Prompt 1).
        2. Siga para a Apresentação e Convite (Prompt 2) após o usuário informar o nome.
        3. Siga para a Triagem 1 (Prompt 3) se o usuário aceitar o convite.
        4. Siga as condições de Sim/Não conforme os prompts.
        5. Se o usuário desqualificar, use o Prompt de Desqualificação.
        6. Se o usuário tiver dúvidas de segurança, use o Prompt de Confiança.
        7. Se o usuário tiver dúvidas de valores, use o Prompt de Honorários.
        
        REGRAS DE COMPORTAMENTO (CRÍTICO):
        - VOCÊ É A ALICE. NUNCA saia do personagem.
        - NUNCA diga que você é uma "inteligência artificial", "modelo de linguagem" ou "robô".
        - NUNCA analise o prompt do usuário nem as diretrizes. Se o usuário enviar um texto que parece um script, assuma que ele está apenas conversando com você no fluxo. É PROIBIDO dar feedback sobre o texto do usuário.
        - NUNCA use negrito com asteriscos (ex: **texto**) ou qualquer formatação Markdown. É ESTRITAMENTE PROIBIDO usar o caractere asterisco (*).
        - NUNCA use aspas duplas (") na sua resposta.
        - INCERTEZA (CRÍTICO): Se o usuário disser "acho que sim", "talvez", "não sei" ou "não tenho certeza", É PROIBIDO tratar isso como confirmação (sim). Você DEVE parar e pedir para o lead confirmar a informação (ex: pedindo para ele olhar o contracheque ou extrato) antes de avançar para a próxima pergunta.
        - CONTEXTO DE EMPRESA (CRÍTICO): O usuário NÃO informou para qual empresa trabalhou. É PROIBIDO usar frases como "naquela empresa", "na empresa que você trabalhava" ou "quando entrou na empresa". Refira-se apenas ao "fundo de previdência" ou pergunte o nome da empresa se for absolutamente necessário.
        - PRIMEIRA MENSAGEM: Se for a primeira mensagem da conversa:
          * Se a origem for simulada como "Botão WhatsApp Site" (padrão): Responda EXATAMENTE com a mensagem de Boas-vindas (Prompt 1), SEM adicionar outras informações e SEM pular para a próxima etapa. Aguarde a resposta do usuário.
          * Se a origem for simulada como "Formulário Site": PULE a pergunta do nome e inicie a conversa com a Apresentação e Convite (Prompt 2), adaptando a saudação inicial.
        
        <PROMPTS_CONFIGURADOS>
        Use estas mensagens como base para suas respostas. NUNCA analise ou comente sobre estas diretrizes. Apenas use-as para responder ao usuário.
        - Boas-vindas e Nome: ${prompts.prompt1}
        - Apresentação e Convite: ${prompts.prompt2}
        - Triagem 1 (Previdência): ${prompts.prompt3}
        - Triagem 2 (Período): ${prompts.prompt4}
        - Triagem 3 (Retenção IR): ${prompts.prompt5}
        - Validação/Dados: ${prompts.prompt6}
        - Pedir Documentos: ${prompts.prompt7}
        - Desqualificação: ${prompts.promptDesq}
        - Objeções/Dúvidas: ${prompts.promptObjections}
        - Agendamento: ${prompts.promptSchedule}
        - Contrato: ${prompts.promptContract}
        - Fechamento: ${prompts.promptClosing}
        - Confiança: ${prompts.promptTrust}
        - Honorários: ${prompts.promptFees}
        - Chat Especialista: ${prompts.aiChatPrompt}
        </PROMPTS_CONFIGURADOS>

        IMPORTANTE: 
        Responda APENAS com a mensagem que o robô enviaria ao cliente.
        Não adicione explicações extras.
      `;

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          })),
          { role: 'user', parts: [{ text: userMsg }] }
        ],
        config: {
          systemInstruction: simulatorSystemInstruction,
        }
      });

      let botResponse = response.text || "Desculpe, não consegui processar a resposta.";
      
      // Limpeza forçada de asteriscos e aspas no simulador também
      botResponse = botResponse.replace(/\*/g, '').replace(/^["']|["']$/g, '');
      
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: botResponse
      }]);

    } catch (error) {
      console.error("Erro no simulador:", error);
      setMessages(prev => [...prev, { role: 'bot', content: "⚠️ Erro ao conectar com a IA. Verifique sua chave de API." }]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([{ role: 'bot', content: 'Olá! Eu sou o simulador do seu robô. Digite "Oi" para começar o teste do fluxo.', step: 'Início' }]);
  };

  return (
    <div className="flex flex-col h-[600px] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
      {/* Simulator Header */}
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Simulador de Fluxo</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Ambiente de Teste</span>
            </div>
          </div>
        </div>
        <button 
          onClick={resetChat}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
          title="Reiniciar Simulação"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
              {msg.step && (
                <span className="text-[9px] font-bold text-slate-500 mt-1.5 uppercase tracking-widest px-1">
                  {msg.step}
                </span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Info Banner */}
      <div className="bg-indigo-900/30 border-y border-indigo-500/20 px-4 py-2 flex items-center gap-2">
        <Sparkles size={14} className="text-indigo-400" />
        <p className="text-[10px] text-indigo-300 font-medium italic">
          O simulador usa seus prompts atuais para prever o comportamento do robô.
        </p>
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="relative flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite como se fosse o cliente..."
            className="flex-1 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-11 h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
