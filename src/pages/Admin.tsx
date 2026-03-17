import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { LogOut, MessageCircle, LayoutDashboard, Workflow, Save, Bot, User } from 'lucide-react';

export default function Admin() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Layout states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fluxos'>('dashboard');
  
  // Fluxos states
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiChatPrompt, setAiChatPrompt] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);

  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        let isUserAdmin = false;
        
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            isUserAdmin = true;
          }
        } catch (error) {
          console.warn("Aviso: Não foi possível ler o documento do usuário.", error);
        }

        if (isUserAdmin || currentUser.email === 'contato@sichelduboc.com.br') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch Leads (Real-time)
  useEffect(() => {
    if (user && isAdmin) {
      const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLeads(leadsData);
      });
      return () => unsubscribe();
    }
  }, [user, isAdmin]);

  // Fetch Messages for selected lead (Real-time)
  useEffect(() => {
    if (selectedLead && user && isAdmin) {
      const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((msg: any) => msg.leadId === selectedLead.id);
        setMessages(msgs);
      });
      return () => unsubscribe();
    }
  }, [selectedLead, user, isAdmin]);

  // Fetch AI Prompt
  useEffect(() => {
    if (user && isAdmin && activeTab === 'fluxos') {
      const fetchPrompt = async () => {
        try {
          const docRef = doc(db, 'settings', 'ai_prompt');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setAiPrompt(docSnap.data().text || '');
          } else {
            setAiPrompt(`Você é um assistente do escritório Sichel & Duboc. Lead: {nome}. Aposentadoria: {aposentadoriaComplementar}. Contribuiu 89-95: {contribuicao89a95}. Paga IR: {pagaIrAtualmente}. Crie uma mensagem curta de WhatsApp agradecendo, dizendo se é promissor e fazendo uma pergunta aberta. Assine Equipe Sichel & Duboc.`);
          }

          const chatDocRef = doc(db, 'settings', 'ai_chat_prompt');
          const chatDocSnap = await getDoc(chatDocRef);
          if (chatDocSnap.exists()) {
            setAiChatPrompt(chatDocSnap.data().text || '');
          } else {
            setAiChatPrompt(`Você é um assistente virtual de um escritório de advocacia previdenciária (Sichel & Duboc).
O nome do cliente é {nome}. Aposentadoria: {aposentadoriaComplementar}. Contribuiu 89-95: {contribuicao89a95}. Paga IR: {pagaIrAtualmente}.
Responda à última mensagem do cliente de forma educada, profissional e concisa. 
Seu objetivo é entender o problema previdenciário dele e agendar uma consulta com um advogado.
Não invente informações jurídicas complexas, apenas colete dados e seja acolhedor.`);
          }
        } catch (error) {
          console.error("Erro ao carregar prompt da IA:", error);
        }
      };
      fetchPrompt();
    }
  }, [user, isAdmin, activeTab]);

  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    setPromptSaved(false);
    try {
      await setDoc(doc(db, 'settings', 'ai_prompt'), { text: aiPrompt });
      await setDoc(doc(db, 'settings', 'ai_chat_prompt'), { text: aiChatPrompt });
      setPromptSaved(true);
      setTimeout(() => setPromptSaved(false), 3000);
    } catch (error) {
      console.error("Erro ao salvar prompt:", error);
      alert("Erro ao salvar o prompt.");
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Erro no login com Google:', error);
      setLoginError('Erro ao fazer login com Google.');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!email || !password) {
      setLoginError('Preencha e-mail e senha.');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Erro no login com E-mail:', error);
      setLoginError('E-mail ou senha incorretos. Verifique se a conta existe no Firebase.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsAdmin(false);
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const toggleAI = async (leadId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), {
        aiEnabled: currentStatus === false ? true : false,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao alternar IA:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedLead) return;

    const messageText = newMessage;
    setNewMessage(''); 

    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedLead.id, text: messageText })
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert('Erro ao enviar mensagem: ' + (errorData.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem. Verifique a conexão.');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Carregando...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-[#38383a] mb-2 text-center">Painel Administrativo</h1>
          <p className="text-slate-600 mb-6 text-center">Faça login para acessar os leads e gerenciar os atendimentos.</p>
          
          {loginError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center border border-red-100">
              {loginError}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="flex flex-col gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#dcb366] outline-none"
                placeholder="contato@sichelduboc.com.br"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#dcb366] outline-none"
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-[#38383a] text-white font-bold py-3 px-4 rounded-lg hover:bg-black transition-colors mt-2"
            >
              Entrar
            </button>
          </form>

          <div className="relative flex items-center py-2 mb-4">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">ou</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3 px-4 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h1>
          <p className="text-slate-600 mb-8">Sua conta não tem permissão de administrador.</p>
          <button 
            onClick={handleLogout}
            className="text-slate-500 hover:text-slate-800 underline"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex h-screen overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#1a1a1a] text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#dcb366] rounded-lg flex items-center justify-center shrink-0">
            <span className="text-[#1a1a1a] font-serif font-bold text-xl">S&D</span>
          </div>
          <h1 className="font-bold text-lg leading-tight">Painel<br/>Administrativo</h1>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${activeTab === 'dashboard' ? 'bg-[#dcb366] text-[#1a1a1a]' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
          >
            <LayoutDashboard size={18} />
            Dashboard de Leads
          </button>
          
          <button 
            onClick={() => setActiveTab('fluxos')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${activeTab === 'fluxos' ? 'bg-[#dcb366] text-[#1a1a1a]' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
          >
            <Workflow size={18} />
            Fluxos e IA
          </button>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-slate-400 mb-3 px-4 truncate">{user.email}</div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 w-full rounded-lg text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut size={18} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-1 overflow-hidden">
            {/* Leads List */}
            <div className="w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-200 bg-white">
                <h2 className="font-bold text-slate-800">Leads Recentes <span className="text-[#dcb366] ml-1">({leads.length})</span></h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                {leads.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">Nenhum lead encontrado.</div>
                ) : (
                  leads.map(lead => (
                    <div 
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-white ${selectedLead?.id === lead.id ? 'bg-white border-l-4 border-l-[#dcb366]' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-slate-800 truncate pr-2">{lead.nome}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide whitespace-nowrap
                          ${lead.status === 'novo' ? 'bg-blue-100 text-blue-700' : 
                            lead.status === 'em_atendimento' ? 'bg-amber-100 text-amber-700' : 
                            lead.status === 'qualificado' ? 'bg-green-100 text-green-700' : 
                            'bg-slate-100 text-slate-700'}`}
                        >
                          {lead.status === 'novo' ? 'Novo' : 
                           lead.status === 'em_atendimento' ? 'Em Atend.' : 
                           lead.status === 'qualificado' ? 'Qualificado' : 'Descartado'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mb-2">{lead.telefone}</p>
                      <div className="text-xs text-slate-400">
                        {new Date(lead.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Lead Details & Chat */}
            <div className="flex-1 flex flex-col bg-white">
              {selectedLead ? (
                <>
                  <div className="bg-white p-6 border-b border-slate-200 shrink-0 shadow-sm z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedLead.nome}</h2>
                        <p className="text-slate-500 flex items-center gap-2">
                          <MessageCircle size={16} /> {selectedLead.telefone}
                        </p>
                      </div>
                      <div className="flex gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                        <button 
                          onClick={() => toggleAI(selectedLead.id, selectedLead.aiEnabled)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${selectedLead.aiEnabled !== false ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                          title={selectedLead.aiEnabled !== false ? "Desativar IA e assumir atendimento" : "Reativar atendimento por IA"}
                        >
                          {selectedLead.aiEnabled !== false ? <><Bot size={16} /> IA Ativa</> : <><User size={16} /> Humano</>}
                        </button>
                        <div className="w-px bg-slate-200 mx-1"></div>
                        <button 
                          onClick={() => updateLeadStatus(selectedLead.id, 'em_atendimento')}
                          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${selectedLead.status === 'em_atendimento' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                          Em Atend.
                        </button>
                        <button 
                          onClick={() => updateLeadStatus(selectedLead.id, 'qualificado')}
                          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${selectedLead.status === 'qualificado' ? 'bg-green-100 text-green-800 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                          Qualificar
                        </button>
                        <button 
                          onClick={() => updateLeadStatus(selectedLead.id, 'descartado')}
                          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${selectedLead.status === 'descartado' ? 'bg-red-100 text-red-800 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                          Descartar
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-sm">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1 tracking-wider">Aposentadoria</span>
                        <span className="font-medium text-slate-700 capitalize">{selectedLead.aposentadoriaComplementar || '-'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1 tracking-wider">Contribuiu 89-95</span>
                        <span className="font-medium text-slate-700 capitalize">{selectedLead.contribuicao89a95 || '-'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1 tracking-wider">Paga IR</span>
                        <span className="font-medium text-slate-700 capitalize">{selectedLead.pagaIrAtualmente || '-'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1 tracking-wider">Localização</span>
                        <span className="font-medium text-slate-700">{selectedLead.cidade || '-'} / {selectedLead.estado || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-slate-50/50">
                    {messages.length === 0 ? (
                      <div className="text-center text-slate-400 my-auto">
                        Nenhuma mensagem registrada.
                      </div>
                    ) : (
                      messages.map(msg => (
                        <div 
                          key={msg.id} 
                          className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                            msg.sender === 'user' 
                              ? 'bg-white border border-slate-200 self-start rounded-tl-none' 
                              : msg.sender === 'bot'
                                ? 'bg-slate-800 text-white self-end rounded-tr-none'
                                : 'bg-[#dcb366] text-white self-end rounded-tr-none'
                          }`}
                        >
                          <div className="text-[10px] opacity-70 mb-1.5 font-bold uppercase tracking-wider flex justify-between items-center gap-4">
                            <span>{msg.sender === 'user' ? selectedLead.nome : msg.sender === 'bot' ? 'Robô IA' : 'Você (Admin)'}</span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                    <form onSubmit={sendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Digite uma mensagem manual..."
                        className="flex-1 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#dcb366] focus:border-transparent outline-none"
                      />
                      <button 
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-[#38383a] text-white px-6 py-3 rounded-lg font-bold hover:bg-black transition-colors disabled:opacity-50"
                      >
                        Enviar
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                  <MessageCircle size={48} className="mb-4 opacity-20" />
                  <p>Selecione um lead na lista para ver os detalhes e o chat.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FLUXOS TAB */}
        {activeTab === 'fluxos' && (
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Fluxos e Inteligência Artificial</h2>
                <p className="text-slate-600">Configure como a IA do Gemini atende os seus leads automaticamente.</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Prompt do WhatsApp (Primeiro Contato)</h3>
                    <p className="text-sm text-slate-500 mt-1">Este é o comando que a IA recebe para gerar a primeira mensagem do lead.</p>
                  </div>
                  <button 
                    onClick={handleSavePrompt}
                    disabled={savingPrompt}
                    className="flex items-center gap-2 bg-[#38383a] text-white px-4 py-2 rounded-lg font-medium hover:bg-black transition-colors disabled:opacity-70"
                  >
                    <Save size={18} />
                    {savingPrompt ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
                
                <div className="p-6">
                  {promptSaved && (
                    <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Prompt salvo com sucesso!
                    </div>
                  )}
                  
                  <textarea 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full h-48 p-4 border border-slate-200 rounded-lg font-mono text-sm leading-relaxed focus:ring-2 focus:ring-[#dcb366] focus:border-transparent outline-none resize-y mb-6"
                    placeholder="Digite o prompt da primeira mensagem aqui..."
                  />

                  <div className="border-t border-slate-200 pt-6 mb-6">
                    <h3 className="font-bold text-slate-800 text-lg mb-1">Prompt do Chatbot (Respostas Contínuas)</h3>
                    <p className="text-sm text-slate-500 mb-4">Este é o comando que a IA recebe sempre que o cliente responder a mensagem no WhatsApp. O histórico da conversa será enviado automaticamente junto com este prompt.</p>
                    
                    <textarea 
                      value={aiChatPrompt}
                      onChange={(e) => setAiChatPrompt(e.target.value)}
                      className="w-full h-48 p-4 border border-slate-200 rounded-lg font-mono text-sm leading-relaxed focus:ring-2 focus:ring-[#dcb366] focus:border-transparent outline-none resize-y"
                      placeholder="Digite o prompt de conversação contínua aqui..."
                    />
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="font-bold text-slate-700 text-sm mb-3 uppercase tracking-wider">Variáveis Disponíveis</h4>
                    <p className="text-sm text-slate-500 mb-4">Você pode usar estas variáveis no texto acima. Elas serão substituídas automaticamente pelas respostas do formulário do cliente.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded border border-slate-200 flex items-center gap-3">
                        <code className="text-[#dcb366] font-bold bg-white px-2 py-1 rounded border border-slate-100">{'{nome}'}</code>
                        <span className="text-sm text-slate-600">Nome do lead</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border border-slate-200 flex items-center gap-3">
                        <code className="text-[#dcb366] font-bold bg-white px-2 py-1 rounded border border-slate-100">{'{aposentadoriaComplementar}'}</code>
                        <span className="text-sm text-slate-600">Sim / Não</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border border-slate-200 flex items-center gap-3">
                        <code className="text-[#dcb366] font-bold bg-white px-2 py-1 rounded border border-slate-100">{'{contribuicao89a95}'}</code>
                        <span className="text-sm text-slate-600">Sim / Não</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border border-slate-200 flex items-center gap-3">
                        <code className="text-[#dcb366] font-bold bg-white px-2 py-1 rounded border border-slate-100">{'{pagaIrAtualmente}'}</code>
                        <span className="text-sm text-slate-600">Sim / Não</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
