import React from 'react';
import { Save, Info, Sparkles, MessageSquare, CheckCircle2, XCircle, ShieldCheck, DollarSign, Calendar, FileText, Check, Bot } from 'lucide-react';

interface SimplePromptEditorProps {
  prompts: any;
  setPrompts: (prompts: any) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  onToggleAdvanced?: () => void;
}

export default function SimplePromptEditor({ prompts, setPrompts, onSave, saving, saved, onToggleAdvanced }: SimplePromptEditorProps) {
  const handleChange = (key: string, value: string) => {
    setPrompts((prev: any) => ({ ...prev, [key]: value }));
  };

  const sections = [
    {
      title: "Fluxo Principal (Alice)",
      icon: <Sparkles className="text-indigo-500" size={20} />,
      items: [
        { id: 'prompt1', label: '1. Boas-vindas e Introdução', icon: <MessageSquare size={16} /> },
        { id: 'prompt2', label: '2. Triagem Q1 (Previdência)', icon: <MessageSquare size={16} /> },
        { id: 'prompt3', label: '3. Triagem Q2 (Período)', icon: <MessageSquare size={16} /> },
        { id: 'prompt4', label: '4. Triagem Q3 (Retenção IR)', icon: <MessageSquare size={16} /> },
        { id: 'prompt5', label: '5. Validação e Coleta de Dados', icon: <CheckCircle2 size={16} /> },
        { id: 'prompt6', label: '6. Solicitação de Documentos', icon: <FileText size={16} /> },
      ]
    },
    {
      title: "Finalização e Suporte",
      icon: <Check className="text-emerald-500" size={20} />,
      items: [
        { id: 'promptContract', label: 'Envio de Contrato', icon: <FileText size={16} /> },
        { id: 'promptClosing', label: 'Fechamento e Boas-vindas', icon: <CheckCircle2 size={16} /> },
        { id: 'promptDesq', label: 'Desqualificação (Não tem direito)', icon: <XCircle size={16} /> },
      ]
    },
    {
      title: "Objeções e Dúvidas Frequentes",
      icon: <ShieldCheck className="text-amber-500" size={20} />,
      items: [
        { id: 'promptTrust', label: 'Segurança e Confiança (OAB/CNPJ)', icon: <ShieldCheck size={16} /> },
        { id: 'promptFees', label: 'Honorários e Valores', icon: <DollarSign size={16} /> },
        { id: 'promptObjections', label: 'Objeções Gerais / Reunião', icon: <Calendar size={16} /> },
        { id: 'promptSchedule', label: 'Link de Agendamento', icon: <Calendar size={16} /> },
      ]
    },
    {
      title: "Configurações Avançadas da IA",
      icon: <Bot className="text-slate-500" size={20} />,
      items: [
        { id: 'aiChatPrompt', label: 'Instruções Adicionais para o Chat Livre', icon: <Bot size={16} /> },
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8 pb-10 sm:pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-4 z-[60] border-b border-slate-200 dark:border-slate-800 mb-6 gap-4 px-2 sm:px-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">Editor de Perguntas</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">Ajuste as mensagens da Alice.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          {onToggleAdvanced && (
            <button
              onClick={onToggleAdvanced}
              className="px-3 py-2 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shrink-0 shadow-sm"
            >
              Modo Avançado
            </button>
          )}
          <button
            onClick={() => {
              console.log('Botão Salvar clicado no SimplePromptEditor');
              onSave();
            }}
            disabled={saving}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg active:scale-95 shrink-0 ${
              saved 
                ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20'
            }`}
          >
            {saving ? (
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saved ? (
              <Check size={18} />
            ) : (
              <Save size={18} />
            )}
            <span className="hidden xs:inline">{saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Alterações'}</span>
            <span className="xs:hidden">{saving ? '...' : saved ? 'OK' : 'Salvar'}</span>
          </button>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 flex gap-3 items-start mx-2 sm:mx-0">
        <Info className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" size={18} />
        <div className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
          <p className="font-bold mb-1">Dicas de Formatação:</p>
          <ul className="list-disc list-inside space-y-1 opacity-90 text-xs sm:text-sm">
            <li>Use <strong>[BUTTONS: Opção 1 | Opção 2]</strong> se desejar criar botões de resposta (opcional).</li>
            <li>Use <strong>{"{nome}"}</strong> para inserir o nome do cliente automaticamente.</li>
            <li>Mantenha as mensagens curtas e amigáveis para melhor conversão no WhatsApp.</li>
          </ul>
        </div>
      </div>

      {sections.map((section, idx) => (
        <div key={idx} className="space-y-4 px-2 sm:px-0">
          <div className="flex items-center gap-2 px-2">
            {section.icon}
            <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] sm:text-xs">{section.title}</h3>
          </div>
          
          <div className="grid gap-4">
            {section.items.map((item) => (
              <div key={item.id} className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900 transition-all p-3 sm:p-5 group">
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor={item.id} className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors text-xs sm:text-sm">
                    <span className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 group-focus-within:bg-indigo-50 dark:group-focus-within:bg-indigo-900/30 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-all">
                      {item.icon}
                    </span>
                    {item.label}
                  </label>
                </div>
                <textarea
                  id={item.id}
                  value={prompts[item.id] || ''}
                  onChange={(e) => handleChange(item.id, e.target.value)}
                  className="w-full min-h-[100px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all resize-y"
                  placeholder="Digite a mensagem aqui..."
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
