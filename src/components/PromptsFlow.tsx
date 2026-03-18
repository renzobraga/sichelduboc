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
import { Save, Sparkles, MessageSquare, FormInput, Bot } from 'lucide-react';

// Custom Node for Trigger
const TriggerNode = ({ data }: NodeProps) => {
  return (
    <div className="bg-[#1a1a1a] text-white rounded-xl border-2 border-[#dcb366] shadow-xl w-64 overflow-hidden">
      <div className="bg-[#dcb366] text-[#1a1a1a] p-3 font-bold flex items-center gap-2">
        <FormInput size={18} />
        {data.label}
      </div>
      <div className="p-4 text-sm text-slate-300">
        {data.description}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-[#dcb366]" />
    </div>
  );
};

// Custom Node for Prompt
const PromptNode = ({ data }: NodeProps) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-96 overflow-hidden">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-indigo-500" />
      <div className="bg-indigo-50 p-3 font-bold text-indigo-800 border-b border-indigo-100 flex items-center gap-2">
        <Bot size={18} />
        {data.label}
      </div>
      <div className="p-4">
        <p className="text-xs text-slate-500 mb-3">{data.description}</p>
        <textarea
          className="nodrag w-full h-40 p-3 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
          value={data.value}
          onChange={(e) => data.onChange(e.target.value)}
          placeholder={data.placeholder}
        />
        {data.showExpertButton && (
          <button
            onClick={data.onLoadExpert}
            className="mt-3 w-full flex items-center justify-center gap-2 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 py-2 rounded-lg transition-colors"
          >
            <Sparkles size={14} />
            Carregar Prompt Especialista
          </button>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-indigo-500" />
    </div>
  );
};

// Custom Node for Event
const EventNode = ({ data }: NodeProps) => {
  return (
    <div className="bg-slate-100 rounded-full border-2 border-slate-300 shadow-md px-6 py-3 flex items-center gap-2">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-400" />
      <MessageSquare size={16} className="text-slate-600" />
      <span className="font-bold text-slate-700 text-sm">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-400" />
    </div>
  );
};

const nodeTypes = {
  trigger: TriggerNode,
  prompt: PromptNode,
  event: EventNode,
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
  
  const initialNodes = [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: { 
        label: 'Novo Lead (Site)', 
        description: 'Cliente preenche o formulário no site e entra no sistema.' 
      },
    },
    {
      id: 'prompt-1',
      type: 'prompt',
      position: { x: 200, y: 200 },
      data: { 
        label: 'Primeira Mensagem',
        description: 'Prompt usado para gerar a primeira mensagem de contato.',
        value: aiPrompt,
        onChange: setAiPrompt,
        placeholder: 'Digite o prompt da primeira mensagem...'
      },
    },
    {
      id: 'event-1',
      type: 'event',
      position: { x: 270, y: 520 },
      data: { 
        label: 'Cliente Responde', 
      },
    },
    {
      id: 'prompt-2',
      type: 'prompt',
      position: { x: 200, y: 620 },
      data: { 
        label: 'Chatbot Contínuo',
        description: 'Prompt usado para todas as respostas subsequentes.',
        value: aiChatPrompt,
        onChange: setAiChatPrompt,
        placeholder: 'Digite o prompt do chatbot...',
        showExpertButton: true,
        onLoadExpert: () => setAiChatPrompt(expertPrompt)
      },
    },
  ];

  const initialEdges = [
    { id: 'e1-2', source: 'trigger-1', target: 'prompt-1', animated: true, style: { stroke: '#dcb366', strokeWidth: 2 } },
    { id: 'e2-3', source: 'prompt-1', target: 'event-1', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
    { id: 'e3-4', source: 'event-1', target: 'prompt-2', animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } },
    // Loop back edge to represent continuous chat
    { 
      id: 'e4-3', 
      source: 'prompt-2', 
      target: 'event-1', 
      type: 'smoothstep',
      sourceHandle: 'bottom',
      targetHandle: 'top',
      animated: true, 
      style: { stroke: '#6366f1', strokeWidth: 2 },
      label: 'Loop de Conversa',
      labelStyle: { fill: '#6366f1', fontWeight: 700, fontSize: 12 },
      labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 4,
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update node data when props change
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === 'prompt-1') {
          node.data = { ...node.data, value: aiPrompt, onChange: setAiPrompt };
        }
        if (node.id === 'prompt-2') {
          node.data = { ...node.data, value: aiChatPrompt, onChange: setAiChatPrompt, onLoadExpert: () => setAiChatPrompt(expertPrompt) };
        }
        return node;
      })
    );
  }, [aiPrompt, aiChatPrompt, setAiPrompt, setAiChatPrompt, expertPrompt, setNodes]);

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
              case 'trigger': return '#dcb366';
              case 'prompt': return '#6366f1';
              case 'event': return '#94a3b8';
              default: return '#eee';
            }
          }}
          className="bg-white border-slate-200 shadow-sm rounded-lg overflow-hidden"
        />
      </ReactFlow>
    </div>
  );
}
