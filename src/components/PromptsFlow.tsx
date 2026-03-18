import React, { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Sparkles, MessageSquare, FormInput, Bot, User, ChevronDown, Hourglass, Split } from 'lucide-react';

// Custom Node for Trigger
const TriggerNode = ({ data }: NodeProps<any>) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm w-80 overflow-hidden font-sans">
      <div className="bg-slate-100 border-b border-slate-200 p-2.5 flex items-center gap-2 text-slate-700 text-sm font-semibold">
        <User size={16} className="text-slate-500" />
        {data.label}
      </div>
      <div className="p-4">
        <div className="border border-dashed border-slate-300 rounded p-4 text-center text-sm text-slate-600 bg-white">
          <div className="font-semibold text-slate-700 mb-1">{data.title || 'Gatilho'}</div>
          {data.description}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-300 border-2 border-white" />
    </div>
  );
};

// Custom Node for Prompt
const PromptNode = ({ data }: NodeProps<any>) => {
  const [localValue, setLocalValue] = useState(data.value || '');
  const isFocused = React.useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setLocalValue(data.value || '');
    }
  }, [data.value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    if (data.onChange) {
      data.onChange(newVal);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm w-[400px] overflow-hidden font-sans">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-300 border-2 border-white" />
      <div className="bg-slate-800 text-white p-2.5 flex items-center justify-between text-sm font-semibold">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-indigo-300" />
          {data.label}
        </div>
        <button className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors text-slate-200">
          Ações <ChevronDown size={12} />
        </button>
      </div>
      <div className="p-4">
        <div className="border border-dashed border-slate-300 rounded p-4 bg-white">
          <p className="text-xs text-slate-500 mb-3 text-center">{data.description}</p>
          <textarea
            className="nodrag w-full h-40 p-3 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            value={localValue}
            onChange={handleChange}
            onFocus={() => { isFocused.current = true; }}
            onBlur={() => { isFocused.current = false; }}
            placeholder={data.placeholder}
          />
          {data.showExpertButton && (
            <button
              onClick={data.onLoadExpert}
              className="mt-3 w-full flex items-center justify-center gap-2 text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 py-2 rounded-lg transition-colors border border-indigo-200"
            >
              <Sparkles size={14} />
              Carregar Prompt Especialista
            </button>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-300 border-2 border-white" />
    </div>
  );
};

// Custom Node for Event
const EventNode = ({ data }: NodeProps<any>) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm w-80 overflow-hidden font-sans">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-300 border-2 border-white" />
      <div className="bg-slate-800 text-white p-2.5 flex items-center justify-between text-sm font-semibold">
        <div className="flex items-center gap-2">
          <Hourglass size={16} className="text-slate-300" />
          {data.label}
        </div>
        <button className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors text-slate-200">
          Ações <ChevronDown size={12} />
        </button>
      </div>
      <div className="p-4 text-center">
        <div className="text-sm font-medium text-slate-700">
          {data.description || 'Aguardando interação...'}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-300 border-2 border-white" />
    </div>
  );
};

// Custom Node for Condition
const ConditionNode = ({ data }: NodeProps<any>) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm w-80 overflow-hidden font-sans">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-300 border-2 border-white" />
      <div className="bg-slate-800 text-white p-2.5 flex items-center justify-between text-sm font-semibold">
        <div className="flex items-center gap-2">
          <Hourglass size={16} className="text-slate-300" />
          {data.label}
        </div>
        <button className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors text-slate-200">
          Ações <ChevronDown size={12} />
        </button>
      </div>
      <div className="p-4">
        <div className="border border-dashed border-slate-300 rounded p-4 text-center text-sm text-slate-600 bg-white">
          <div className="font-semibold text-slate-700 mb-1">{data.title || 'Condição'}</div>
          {data.description}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" className="w-3 h-3 bg-emerald-400 border-2 border-white" style={{ left: '25%' }} />
      <Handle type="source" position={Position.Bottom} id="false" className="w-3 h-3 bg-rose-400 border-2 border-white" style={{ left: '75%' }} />
    </div>
  );
};

const nodeTypes = {
  trigger: TriggerNode,
  prompt: PromptNode,
  event: EventNode,
  condition: ConditionNode,
};

interface PromptsFlowProps {
  aiPrompt: string;
  setAiPrompt: (val: string) => void;
  aiChatPrompt: string;
  setAiChatPrompt: (val: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  expertPrompt: string;
}

export default function PromptsFlow({
  aiPrompt,
  setAiPrompt,
  aiChatPrompt,
  setAiChatPrompt,
  onSave,
  saving,
  saved,
  expertPrompt
}: PromptsFlowProps) {
  
  const [prompt2, setPrompt2] = useState('Ótimo! Segunda pergunta: Você contribuiu para esse fundo de previdência entre os anos de 1989 e 1995? [BUTTONS: Sim | Não]');
  const [prompt3, setPrompt3] = useState('Quase lá! Última pergunta: Atualmente, é descontado Imposto de Renda diretamente na fonte sobre o valor da sua aposentadoria complementar? [BUTTONS: Sim | Não]');
  const [promptDesq, setPromptDesq] = useState('Compreendo. Analisando as suas respostas, verificamos que o seu perfil não se enquadra nos requisitos para esta ação. Agradecemos o contato!');
  const [prompt4, setPrompt4] = useState('Excelente notícia! Você preenche os requisitos para buscar a restituição. Nossa equipe vai preparar sua análise. Qual é o seu nome completo?');
  const [prompt5, setPrompt5] = useState('Tudo anotado! Precisaremos de alguns documentos: RG, Comprovante de Residência, Contracheque e Declaração de IR. Consegue me enviar hoje? [BUTTONS: Sim, envio hoje | Envio depois]');
  const [promptObjections, setPromptObjections] = useState('Entendo que possa ter dúvidas ou precise de mais tempo. Gostaria de agendar uma breve reunião com um de nossos advogados especialistas para esclarecer tudo, ou prefere tirar suas dúvidas por aqui mesmo? [BUTTONS: Agendar Reunião | Tirar Dúvidas]');
  const [promptSchedule, setPromptSchedule] = useState('Ótimo! Por favor, escolha o melhor dia e horário diretamente na nossa agenda clicando neste link: [LINK DO GOOGLE CALENDAR]. Um de nossos especialistas ligará para você no horário marcado.');
  const [promptContract, setPromptContract] = useState('Perfeito! Recebi os documentos. Vou encaminhar agora o seu Contrato de Prestação de Serviços Jurídicos. Como combinamos, os honorários são cobrados apenas no êxito. Clique no link abaixo para ler e assinar digitalmente: [LINK PARA ASSINATURA DO CONTRATO]');
  const [promptClosing, setPromptClosing] = useState('Contrato recebido e validado com sucesso! ✅ Parabéns por dar esse passo importante para recuperar o que é seu por direito. A partir de agora, o escritório Sichel & Duboc cuida de tudo. Seja muito bem-vindo(a)!');

  const initialNodes = [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 400, y: 50 },
      data: { 
        label: 'Contato gatilho de inscrição', 
        title: 'Novo Lead',
        description: 'Cliente entra em contato via WhatsApp ou Site.' 
      },
    },
    {
      id: 'prompt-1',
      type: 'prompt',
      position: { x: 360, y: 200 },
      data: { 
        label: '1. Triagem: Previdência',
        description: 'Pergunta 1: Recebe previdência complementar?',
        value: aiPrompt,
        onChange: setAiPrompt,
        placeholder: 'Digite a primeira pergunta...'
      },
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 400, y: 500 },
      data: { 
        label: 'Aguardar Resposta', 
        title: 'Recebe Previdência?',
        description: 'Espera o cliente clicar em Sim ou Não.'
      },
    },
    {
      id: 'prompt-desq',
      type: 'prompt',
      position: { x: 50, y: 700 },
      data: { 
        label: 'Desqualificação',
        description: 'Enviada quando o cliente não cumpre os requisitos.',
        value: promptDesq,
        onChange: setPromptDesq,
        placeholder: 'Mensagem de recusa...'
      },
    },
    {
      id: 'prompt-2',
      type: 'prompt',
      position: { x: 750, y: 700 },
      data: { 
        label: '2. Triagem: Período',
        description: 'Pergunta 2: Contribuiu entre 1989 e 1995?',
        value: prompt2,
        onChange: setPrompt2,
        placeholder: 'Digite a segunda pergunta...'
      },
    },
    {
      id: 'condition-2',
      type: 'condition',
      position: { x: 790, y: 1000 },
      data: { 
        label: 'Aguardar Resposta', 
        title: 'Contribuiu 89-95?',
        description: 'Espera o cliente clicar em Sim ou Não.'
      },
    },
    {
      id: 'prompt-3',
      type: 'prompt',
      position: { x: 750, y: 1200 },
      data: { 
        label: '3. Triagem: Retenção IR',
        description: 'Pergunta 3: Tem desconto de IR na fonte?',
        value: prompt3,
        onChange: setPrompt3,
        placeholder: 'Digite a terceira pergunta...'
      },
    },
    {
      id: 'condition-3',
      type: 'condition',
      position: { x: 790, y: 1500 },
      data: { 
        label: 'Aguardar Resposta', 
        title: 'Retém IR atualmente?',
        description: 'Espera o cliente clicar em Sim ou Não.'
      },
    },
    {
      id: 'prompt-4',
      type: 'prompt',
      position: { x: 750, y: 1700 },
      data: { 
        label: '4. Qualificação e Dados',
        description: 'Informa o direito e pede dados básicos.',
        value: prompt4,
        onChange: setPrompt4,
        placeholder: 'Mensagem de qualificação...'
      },
    },
    {
      id: 'event-4',
      type: 'event',
      position: { x: 790, y: 2000 },
      data: { 
        label: 'Aguardar Dados', 
        description: 'Espera o cliente enviar nome, cidade, etc.'
      },
    },
    {
      id: 'prompt-5',
      type: 'prompt',
      position: { x: 750, y: 2150 },
      data: { 
        label: '5. Solicitar Documentos',
        description: 'Pede RG, Comprovante, Contracheque e IR.',
        value: prompt5,
        onChange: setPrompt5,
        placeholder: 'Mensagem pedindo documentos...'
      },
    },
    {
      id: 'condition-docs',
      type: 'condition',
      position: { x: 790, y: 2450 },
      data: { 
        label: 'Aguardar Documentos', 
        title: 'Enviou Documentos?',
        description: 'Verifica se o cliente enviou os arquivos ou teve dúvidas.'
      },
    },
    {
      id: 'prompt-objections',
      type: 'prompt',
      position: { x: 400, y: 2650 },
      data: { 
        label: '6. Superação de Objeções',
        description: 'Oferece reunião ou tira dúvidas por chat.',
        value: promptObjections,
        onChange: setPromptObjections,
        placeholder: 'Mensagem de objeções...'
      },
    },
    {
      id: 'condition-objections',
      type: 'condition',
      position: { x: 440, y: 2950 },
      data: { 
        label: 'Aguardar Resposta', 
        title: 'Agendar ou Dúvidas?',
        description: 'Verifica a escolha do cliente.'
      },
    },
    {
      id: 'prompt-schedule',
      type: 'prompt',
      position: { x: 50, y: 3150 },
      data: { 
        label: '7. Agendamento (Calendar)',
        description: 'Envia o link do Google Calendar.',
        value: promptSchedule,
        onChange: setPromptSchedule,
        placeholder: 'Mensagem de agendamento...'
      },
    },
    {
      id: 'prompt-expert',
      type: 'prompt',
      position: { x: 750, y: 3150 },
      data: { 
        label: '7. Chatbot Contínuo (Dúvidas)',
        description: 'Assume a conversa para tirar dúvidas específicas.',
        value: aiChatPrompt,
        onChange: setAiChatPrompt,
        placeholder: 'Prompt do especialista...',
        showExpertButton: true,
        onLoadExpert: () => setAiChatPrompt(expertPrompt)
      },
    },
    {
      id: 'prompt-contract',
      type: 'prompt',
      position: { x: 1100, y: 2650 },
      data: { 
        label: '6. Envio do Contrato',
        description: 'Envia o link para assinatura digital.',
        value: promptContract,
        onChange: setPromptContract,
        placeholder: 'Mensagem do contrato...'
      },
    },
    {
      id: 'condition-contract',
      type: 'condition',
      position: { x: 1140, y: 2950 },
      data: { 
        label: 'Aguardar Assinatura', 
        title: 'Assinou o Contrato?',
        description: 'Verifica se o cliente assinou.'
      },
    },
    {
      id: 'prompt-closing',
      type: 'prompt',
      position: { x: 1100, y: 3150 },
      data: { 
        label: '8. Fechamento / Sucesso',
        description: 'Mensagem de boas-vindas após assinatura.',
        value: promptClosing,
        onChange: setPromptClosing,
        placeholder: 'Mensagem de fechamento...'
      },
    }
  ];

  const initialEdges: any[] = [
    { id: 'e1-2', source: 'trigger-1', target: 'prompt-1', type: 'smoothstep', style: { stroke: '#cbd5e1', strokeWidth: 2 } },
    { id: 'e2-3', source: 'prompt-1', target: 'condition-1', type: 'smoothstep', style: { stroke: '#cbd5e1', strokeWidth: 2 } },
    
    // Condition 1
    { id: 'c1-false', source: 'condition-1', sourceHandle: 'false', target: 'prompt-desq', type: 'smoothstep', style: { stroke: '#f43f5e', strokeWidth: 2 }, label: 'Não', labelStyle: { fill: '#be123c', fontWeight: 600, fontSize: 11 }, labelBgStyle: { fill: '#ffe4e6', fillOpacity: 1 }, labelBgPadding: [8, 4], labelBgBorderRadius: 4 },
    { id: 'c1-true', source: 'condition-1', sourceHandle: 'true', target: 'prompt-2', type: 'smoothstep', style: { stroke: '#10b981', strokeWidth: 2 }, label: 'Sim', labelStyle: { fill: '#047857', fontWeight: 600, fontSize: 11 }, labelBgStyle: { fill: '#d1fae5', fillOpacity: 1 }, labelBgPadding: [8, 4], labelBgBorderRadius: 4 },

    // Prompt 2 -> Condition 2
    { id: 'e4-5', source: 'prompt-2', target: 'condition-2', type: 'smoothstep', style: { stroke: '#cbd5e1', strokeWidth: 2 } },

    // Condition 2
    { id: 'c2-false', source: 'condition-2', sourceHandle: 'false', target: 'prompt-desq', type: 'smoothstep', style: { stroke: '#f43f5e', strokeWidth: 2 }, label: 'Não', labelStyle: { fill: '#be123c', fontWeight: 600, fontSize: 11 }, labelBgStyle: { fill: '#ffe4e6', fillOpacity: 1 }, labelBgPadding: [8, 4], labelBgBorderRadius: 4 },
    { id: 'c2-true', source: 'condition-2', sourceHandle: 'true', target: 'prompt-3', type: 'smoothstep', style: { stroke: '#10b981', strokeWidth: 2 }, label: 'Sim', labelStyle: { fill: '#047857', fontWeight: 600, fontSize: 11 }, labelBgStyle: { fill: '#d1fae5', fillOpacity: 1 }, labelBgPadding: [8, 4], labelBgBorderRadius: 4 },

    // Prompt 3 -> Condition 3
    { id: 'e6-7', source: 'prompt-3', target: 'condition-3', type: 'smoothstep', style: { stroke: '#cbd5e1', strokeWidth: 2 } },

    // Condition 3
    { id: 'c3-false', source: 'condition-3', sourceHandle: 'false', target: 'prompt-desq', type: 'smoothstep', style: { stroke: '#f43f5e', strokeWidth: 2 }, label: 'Não', labelStyle: { fill: '#be123c', fontWeight: 600, fontSize: 11 }, labelBgStyle: { fill: '#ffe4e6', fillOpacity: 1 }, labelBgPadding: [8, 4], labelBgBorderRadius: 4 },
    { id: 'c3-true', source: 'condition-3', sourceHandle: 'true', target: 'prompt-4', type: 'smoothstep', style: { stroke: '#10b981', strokeWidth: 2 }, label: 'Sim', labelStyle: { fill: '#047857', fontWeight: 600, fontSize: 11 }, labelBgStyle: { fill: '#d1fae5', fillOpacity: 1 }, labelBgPadding: [8, 4], labelBgBorderRadius: 4 },

    // Prompt 4 -> Event 4 -> Prompt 5 -> Condition Docs
    { id: 'e8-9', source: 'prompt-4', target: 'event-4', type: 'smoothstep', style: { stroke: '#cbd5e1', strokeWidth: 2 } },
    { id: 'e9-10', source: 'event-4', target: 'prompt-5', type: 'smoothstep', style: { stroke: '#cbd5e1', strokeWidth: 2 } },
    { id: 'e10-11', source: 'prompt-5', target: 'condition-docs', type: 'smoothstep', style: { stroke: '#cbd5e1', strokeWidth: 2 } },
    
    // Condition Docs
    { id: 'cdocs-false', source: 'condition-docs', sourceHandle: 'false', target: 'prompt-objections', type: 'smoothstep', style: { stroke: '#f43f5e', strokeWidth: 2 }, label: 'Dúvidas/Depois', labelStyle: { fill: '#be123c', fontWeight: 600, fontSize: 11 }, labelBgStyle: { fill: '#ffe4e6', fillOpacity: 1 }, labelBgPadding: [8, 4], labelBgBorderRadius: 4 },
    { id: 'cdocs-true', source: 'condition-docs', sourceHandle: 'true', target: 'prompt-contract', type: 'smoothstep', style: { stroke: '#10b981', strokeWidth: 2 }, label: 'Enviou', labelStyle: { fill: '#047857', fontWeight: 600, fontSize: 11 }, labelBgStyle: { fill: '#d1fae5', fillOpacity: 1 }, labelBgPadding: [8, 4], labelBgBorderRadius: 4 },

    // Objections -> Condition Objections
    { id: 'e-obj-cond', source: 'prompt-objections', target: 'condition-objections', type: 'smoothstep', style: { stroke: '#cbd5e1', strokeWidth: 2 } },
    
    // Condition Objections
    { id: 'cobj-true', source: 'condition-objections', sourceHandle: 'true', target: 'prompt-schedule', type: 'smoothstep', style: { stroke: '#10b981', strokeWidth: 2 }, label: 'Agendar', labelStyle: { fill: '#047857', fontWeight: 600, fontSize: 11 }, labelBgStyle: { fill: '#d1fae5', fillOpacity: 1 }, labelBgPadding: [8, 4], labelBgBorderRadius: 4 },
    { id: 'cobj-false', source: 'condition-objections', sourceHandle: 'false', target: 'prompt-expert', type: 'smoothstep', style: { stroke: '#f43f5e', strokeWidth: 2 }, label: 'Chat', labelStyle: { fill: '#be123c', fontWeight: 600, fontSize: 11 }, labelBgStyle: { fill: '#ffe4e6', fillOpacity: 1 }, labelBgPadding: [8, 4], labelBgBorderRadius: 4 },

    // Contract -> Condition Contract
    { id: 'e-contract-cond', source: 'prompt-contract', target: 'condition-contract', type: 'smoothstep', style: { stroke: '#cbd5e1', strokeWidth: 2 } },

    // Condition Contract
    { id: 'ccontract-true', source: 'condition-contract', sourceHandle: 'true', target: 'prompt-closing', type: 'smoothstep', style: { stroke: '#10b981', strokeWidth: 2 }, label: 'Assinou', labelStyle: { fill: '#047857', fontWeight: 600, fontSize: 11 }, labelBgStyle: { fill: '#d1fae5', fillOpacity: 1 }, labelBgPadding: [8, 4], labelBgBorderRadius: 4 },
    { id: 'ccontract-false', source: 'condition-contract', sourceHandle: 'false', target: 'prompt-expert', type: 'smoothstep', style: { stroke: '#f43f5e', strokeWidth: 2 }, label: 'Dúvidas', labelStyle: { fill: '#be123c', fontWeight: 600, fontSize: 11 }, labelBgStyle: { fill: '#ffe4e6', fillOpacity: 1 }, labelBgPadding: [8, 4], labelBgBorderRadius: 4 },
    
    // Loop back edge for expert
    { 
      id: 'e-expert-loop', 
      source: 'prompt-expert', 
      target: 'condition-docs', 
      type: 'smoothstep',
      sourceHandle: 'bottom',
      targetHandle: 'top',
      animated: true, 
      style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5,5' },
      label: 'Loop de Conversa',
      labelStyle: { fill: '#64748b', fontWeight: 600, fontSize: 11 },
      labelBgStyle: { fill: '#f8fafc', fillOpacity: 0.9 },
      labelBgPadding: [8, 4] as [number, number],
      labelBgBorderRadius: 4,
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as any[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update node data when props change
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === 'prompt-1') {
          node.data = { ...node.data, value: aiPrompt, onChange: setAiPrompt };
        }
        if (node.id === 'prompt-2') {
          node.data = { ...node.data, value: prompt2, onChange: setPrompt2 };
        }
        if (node.id === 'prompt-3') {
          node.data = { ...node.data, value: prompt3, onChange: setPrompt3 };
        }
        if (node.id === 'prompt-4') {
          node.data = { ...node.data, value: prompt4, onChange: setPrompt4 };
        }
        if (node.id === 'prompt-5') {
          node.data = { ...node.data, value: prompt5, onChange: setPrompt5 };
        }
        if (node.id === 'prompt-objections') {
          node.data = { ...node.data, value: promptObjections, onChange: setPromptObjections };
        }
        if (node.id === 'prompt-schedule') {
          node.data = { ...node.data, value: promptSchedule, onChange: setPromptSchedule };
        }
        if (node.id === 'prompt-contract') {
          node.data = { ...node.data, value: promptContract, onChange: setPromptContract };
        }
        if (node.id === 'prompt-closing') {
          node.data = { ...node.data, value: promptClosing, onChange: setPromptClosing };
        }
        if (node.id === 'prompt-desq') {
          node.data = { ...node.data, value: promptDesq, onChange: setPromptDesq };
        }
        if (node.id === 'prompt-expert') {
          node.data = { ...node.data, value: aiChatPrompt, onChange: setAiChatPrompt, onLoadExpert: () => setAiChatPrompt(expertPrompt) };
        }
        return node;
      })
    );
  }, [aiPrompt, aiChatPrompt, prompt2, prompt3, prompt4, prompt5, promptObjections, promptSchedule, promptContract, promptClosing, promptDesq, setAiPrompt, setAiChatPrompt, expertPrompt, setNodes]);

  return (
    <div className="h-[800px] w-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden relative flex flex-col">
      {/* Header Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
        <button 
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#1a1a1a] text-white px-5 py-2.5 rounded-lg font-bold hover:bg-black transition-all shadow-lg disabled:opacity-70"
        >
          <Save size={18} />
          {saving ? 'Salvando...' : 'Salvar Fluxo'}
        </button>
        {saved && (
          <div className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-md animate-in fade-in slide-in-from-top-2">
            Salvo com sucesso!
          </div>
        )}
      </div>

      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur p-4 rounded-xl shadow-sm border border-slate-200 max-w-xs">
        <h4 className="font-bold text-slate-800 text-sm mb-2">Variáveis Disponíveis</h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <code className="text-[#dcb366] font-bold">{'{nome}'}</code>
            <span className="text-slate-500">Nome do lead</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <code className="text-[#dcb366] font-bold">{'{aposentadoriaComplementar}'}</code>
            <span className="text-slate-500">Sim/Não</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <code className="text-[#dcb366] font-bold">{'{contribuicao89a95}'}</code>
            <span className="text-slate-500">Sim/Não</span>
          </div>
          <div className="flex justify-between">
            <code className="text-[#dcb366] font-bold">{'{pagaIrAtualmente}'}</code>
            <span className="text-slate-500">Sim/Não</span>
          </div>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={1.5}
        className="bg-[#f8fafc]"
      >
        <Background color="#cbd5e1" gap={16} size={2} />
        <Controls className="bg-white border-slate-200 shadow-sm" />
        <MiniMap 
          nodeColor={(node) => {
            switch (node.type) {
              case 'trigger': return '#cbd5e1';
              case 'prompt': return '#818cf8';
              case 'event': return '#94a3b8';
              case 'condition': return '#f472b6';
              default: return '#eee';
            }
          }}
          className="bg-white border-slate-200 shadow-sm rounded-lg overflow-hidden"
        />
      </ReactFlow>
    </div>
  );
}
