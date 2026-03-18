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
            value={data.value}
            onChange={(e) => data.onChange(e.target.value)}
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
          <Split size={16} className="text-slate-300" />
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
  
  const initialNodes = [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 240, y: 50 },
      data: { 
        label: 'Contato gatilho de inscrição', 
        title: 'Assinatura de e-mail',
        description: 'optou por receber Customer Service Communication' 
      },
    },
    {
      id: 'event-1',
      type: 'event',
      position: { x: 240, y: 250 },
      data: { 
        label: '1. Atrasar por uma quantidade def...', 
        description: '5 minutos'
      },
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 240, y: 400 },
      data: { 
        label: '2. Ramificação se/então', 
        title: 'Primeiro, verifique Ad Interaction',
        description: 'Pelo menos uma interação de anúncios associada tem Facebook ad type é qualquer de Business, Image, Post, ou Product'
      },
    },
    {
      id: 'prompt-1',
      type: 'prompt',
      position: { x: 0, y: 650 },
      data: { 
        label: '3. Enviar notificação (Interagiu)',
        description: 'Prompt usado para gerar a primeira mensagem de contato.',
        value: aiPrompt,
        onChange: setAiPrompt,
        placeholder: 'Digite o prompt da primeira mensagem...'
      },
    },
    {
      id: 'prompt-2',
      type: 'prompt',
      position: { x: 440, y: 650 },
      data: { 
        label: '4. Chatbot Contínuo (Não interagiu)',
        description: 'Prompt usado para todas as respostas subsequentes.',
        value: aiChatPrompt,
        onChange: setAiChatPrompt,
        placeholder: 'Digite o prompt do chatbot...',
        showExpertButton: true,
        onLoadExpert: () => setAiChatPrompt(expertPrompt)
      },
    },
  ];

  const initialEdges: any[] = [
    { id: 'e1-2', source: 'trigger-1', target: 'event-1', type: 'smoothstep', style: { stroke: '#cbd5e1', strokeWidth: 2 } },
    { id: 'e2-3', source: 'event-1', target: 'condition-1', type: 'smoothstep', style: { stroke: '#cbd5e1', strokeWidth: 2 } },
    { 
      id: 'e3-4', 
      source: 'condition-1', 
      sourceHandle: 'true',
      target: 'prompt-1', 
      type: 'smoothstep', 
      style: { stroke: '#10b981', strokeWidth: 2 },
      label: 'Ad Interaction',
      labelStyle: { fill: '#047857', fontWeight: 600, fontSize: 11 },
      labelBgStyle: { fill: '#d1fae5', fillOpacity: 1 },
      labelBgPadding: [8, 4] as [number, number],
      labelBgBorderRadius: 4,
    },
    { 
      id: 'e3-5', 
      source: 'condition-1', 
      sourceHandle: 'false',
      target: 'prompt-2', 
      type: 'smoothstep', 
      style: { stroke: '#f43f5e', strokeWidth: 2 },
      label: 'Did Not Interact',
      labelStyle: { fill: '#be123c', fontWeight: 600, fontSize: 11 },
      labelBgStyle: { fill: '#ffe4e6', fillOpacity: 1 },
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
