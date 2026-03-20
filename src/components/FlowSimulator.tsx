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
    { role: 'bot', content: 'Olá! Eu sou o simulador do seu robô. Digite "Oi" para começar o teste do fluxo.', step: 'Início' }
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
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key não encontrada");

      const genAI = new GoogleGenAI({ apiKey });
      
      // Construct the simulator prompt
      const simulatorSystemInstruction = `
        Você é um simulador de chatbot para testes de fluxo. 
        Seu objetivo é agir EXATAMENTE como o robô configurado pelos prompts abaixo.
        
        REGRAS DO FLUXO:
        1. Comece pela Triagem (Prompt 1).
        2. Siga as condições de Sim/Não conforme os prompts.
        3. Se o usuário desqualificar, use o Prompt de Desqualificação.
        4. Se o usuário tiver dúvidas de segurança, use o Prompt de Confiança.
        5. Se o usuário tiver dúvidas de valores, use o Prompt de Honorários.
        
        PROMPTS CONFIGURADOS:
        - Triagem 1 (Previdência): ${prompts.prompt1}
        - Triagem 2 (Período): ${prompts.prompt2}
        - Triagem 3 (Retenção IR): ${prompts.prompt3}
        - Qualificação/Dados: ${prompts.prompt4}
        - Pedir Documentos: ${prompts.prompt5}
        - Desqualificação: ${prompts.promptDesq}
        - Objeções/Dúvidas: ${prompts.promptObjections}
        - Agendamento: ${prompts.promptSchedule}
        - Contrato: ${prompts.promptContract}
        - Fechamento: ${prompts.promptClosing}
        - Confiança: ${prompts.promptTrust}
        - Honorários: ${prompts.promptFees}
        - Chat Especialista: ${prompts.aiChatPrompt}

        IMPORTANTE: 
        Responda APENAS com a mensagem que o robô enviaria ao cliente.
        Não adicione explicações extras.
      `;

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: simulatorSystemInstruction }] },
          ...messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          })),
          { role: 'user', parts: [{ text: userMsg }] }
        ],
      });

      const botResponse = response.text || "Desculpe, não consegui processar a resposta.";
      
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
