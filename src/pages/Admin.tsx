import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { LogOut, User, MessageCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function Admin() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Verifica se é admin
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else if (currentUser.email === 'ia.resguarde@gmail.com') {
          // Default admin
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  useEffect(() => {
    if (selectedLead && user && isAdmin) {
      const q = query(
        collection(db, 'messages'), 
        // where('leadId', '==', selectedLead.id), // Precisa de índice no Firestore
        orderBy('createdAt', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((msg: any) => msg.leadId === selectedLead.id);
        setMessages(msgs);
      });
      return () => unsubscribe();
    }
  }, [selectedLead, user, isAdmin]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Erro no login:', error);
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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedLead) return;

    const messageText = newMessage;
    setNewMessage(''); // Clear immediately for better UX

    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leadId: selectedLead.id,
          text: messageText
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro retornado pela API:', errorData);
        alert('Erro ao enviar mensagem: ' + (errorData.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem. Verifique a conexão.');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-[#38383a] mb-6">Painel Administrativo</h1>
          <p className="text-slate-600 mb-8">Faça login para acessar os leads e gerenciar os atendimentos.</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-[#dcb366] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#c9a055] transition-colors"
          >
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
    <div className="min-h-screen bg-slate-50 flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#38383a] rounded-lg flex items-center justify-center">
            <span className="text-[#dcb366] font-serif font-bold text-xl">S&D</span>
          </div>
          <h1 className="font-bold text-xl text-[#38383a]">Painel de Leads</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600 font-medium">{user.email}</span>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 font-medium"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Leads List */}
        <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800">Leads Recentes ({leads.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {leads.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Nenhum lead encontrado.</div>
            ) : (
              leads.map(lead => (
                <div 
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${selectedLead?.id === lead.id ? 'bg-slate-50 border-l-4 border-l-[#dcb366]' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-slate-800 truncate pr-2">{lead.nome}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap
                      ${lead.status === 'novo' ? 'bg-blue-100 text-blue-700' : 
                        lead.status === 'em_atendimento' ? 'bg-amber-100 text-amber-700' : 
                        lead.status === 'qualificado' ? 'bg-green-100 text-green-700' : 
                        'bg-slate-100 text-slate-700'}`}
                    >
                      {lead.status === 'novo' ? 'Novo' : 
                       lead.status === 'em_atendimento' ? 'Em Atendimento' : 
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

        {/* Main Area - Lead Details & Chat */}
        <div className="flex-1 flex flex-col bg-slate-50">
          {selectedLead ? (
            <>
              {/* Lead Info Header */}
              <div className="bg-white p-6 border-b border-slate-200 shrink-0">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedLead.nome}</h2>
                    <p className="text-slate-500 flex items-center gap-2">
                      <MessageCircle size={16} /> {selectedLead.telefone}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => updateLeadStatus(selectedLead.id, 'em_atendimento')}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${selectedLead.status === 'em_atendimento' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      Em Atend.
                    </button>
                    <button 
                      onClick={() => updateLeadStatus(selectedLead.id, 'qualificado')}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${selectedLead.status === 'qualificado' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      Qualificar
                    </button>
                    <button 
                      onClick={() => updateLeadStatus(selectedLead.id, 'descartado')}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${selectedLead.status === 'descartado' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      Descartar
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="block text-slate-400 text-xs uppercase font-bold mb-1">Aposentadoria</span>
                    <span className="font-medium text-slate-700 capitalize">{selectedLead.aposentadoriaComplementar || '-'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="block text-slate-400 text-xs uppercase font-bold mb-1">Contribuiu 89-95</span>
                    <span className="font-medium text-slate-700 capitalize">{selectedLead.contribuicao89a95 || '-'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="block text-slate-400 text-xs uppercase font-bold mb-1">Paga IR</span>
                    <span className="font-medium text-slate-700 capitalize">{selectedLead.pagaIrAtualmente || '-'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="block text-slate-400 text-xs uppercase font-bold mb-1">Localização</span>
                    <span className="font-medium text-slate-700">{selectedLead.cidade || '-'} / {selectedLead.estado || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                {messages.length === 0 ? (
                  <div className="text-center text-slate-400 my-auto">
                    Nenhuma mensagem registrada.
                  </div>
                ) : (
                  messages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`max-w-[80%] rounded-2xl p-4 ${
                        msg.sender === 'user' 
                          ? 'bg-white border border-slate-200 self-start rounded-tl-none' 
                          : msg.sender === 'bot'
                            ? 'bg-slate-800 text-white self-end rounded-tr-none'
                            : 'bg-[#dcb366] text-white self-end rounded-tr-none'
                      }`}
                    >
                      <div className="text-xs opacity-70 mb-1 font-medium flex justify-between items-center gap-4">
                        <span>{msg.sender === 'user' ? selectedLead.nome : msg.sender === 'bot' ? 'Robô IA' : 'Você (Admin)'}</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
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
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <MessageCircle size={48} className="mb-4 opacity-20" />
              <p>Selecione um lead para ver os detalhes e o histórico.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
