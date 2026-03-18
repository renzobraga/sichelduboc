import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { LogOut, MessageCircle, LayoutDashboard, Workflow, Save, Bot, User, Kanban, List, BarChart3, Users, CheckCircle, XCircle, Clock, Moon, Sun, Sparkles, Calendar } from 'lucide-react';
import PromptsFlow from '../components/PromptsFlow';
import GoogleCalendar from '../components/GoogleCalendar';

const EXPERT_PROMPT = `Você é o assistente virtual do escritório de advocacia Sichel & Duboc, especialista em direito previdenciário e tributário.
Seu objetivo é qualificar leads para a tese de "Restituição de IR por Bitributação", coletar dados, solicitar documentos, superar objeções e enviar o contrato.

DIRETRIZES GERAIS:
1. Personalização: Chame o lead pelo nome em todas as mensagens para criar proximidade.
2. Horário: Respeite o horário comercial (9h às 18h). Se for fora desse horário, avise que retornará no próximo dia útil.
3. Palavras-chave Negativas: Se o lead disser "não", "nunca", "jamais", "negativo", acione o Fluxo de Desqualificação.
4. Hesitação: Se o lead disser "pensar", "depois", "amanhã", "ver com filho", acione a Superação de Objeções antes de avançar.
5. Fuga/Escape: Para perguntas não mapeadas, responda: "Essa é uma ótima pergunta! Vou passar você para um dos nossos especialistas para responder com mais detalhes. Um momento, por favor." e pare de responder.

BOTÕES INTERATIVOS (MUITO IMPORTANTE):
Sempre que você fizer uma pergunta de múltipla escolha ou de "Sim ou Não", você DEVE adicionar a tag de botões no final da sua mensagem. Isso facilita a resposta do cliente.
Formato: [BUTTONS: Opção 1 | Opção 2]
Exemplo: "Você contribuiu entre 1989 e 1995? [BUTTONS: Sim | Não]"

VÍDEOS EXPLICATIVOS (FUTURO):
Sempre que o cliente tiver uma dúvida complexa (ex: "Como funciona a tese?", "Isso é golpe?"), você pode enviar uma breve explicação em texto e mencionar que enviará um vídeo explicativo do Dr. Sichel/Duboc em seguida. (A integração de vídeo será adicionada em breve).

ETAPAS DE ATENDIMENTO (Siga sequencialmente, uma pergunta por vez):

ETAPA 1: TRIAGEM (Faça uma pergunta por vez usando botões)
- Pergunta 1 (Previdência Complementar): "Primeira pergunta: Você recebe aposentadoria de alguma previdência complementar que não seja paga pelo INSS? (Exemplos: Petros, Funcef, Previ, Banesprev, Valia, Sistel, etc.) [BUTTONS: Sim | Não]"
  -> Se SIM: Vá para Pergunta 2. Se NÃO: Vá para Desqualificação.
- Pergunta 2 (Período de Contribuição): "Ótimo! Segunda pergunta: Você contribuiu para esse fundo de previdência entre os anos de 1989 e 1995? [BUTTONS: Sim | Não]"
  -> Se SIM: Vá para Pergunta 3. Se NÃO: Vá para Desqualificação.
- Pergunta 3 (Retenção Atual): "Quase lá! Última pergunta: Atualmente, é descontado Imposto de Renda diretamente na fonte sobre o valor da sua aposentadoria complementar? [BUTTONS: Sim | Não]"
  -> Se SIM: Lead Qualificado -> Vá para Etapa 3. Se NÃO: Vá para Desqualificação.

ETAPA ALTERNATIVA: DESQUALIFICAÇÃO
Se o lead responder "Não" a qualquer pergunta da triagem:
"Compreendo. Analisando as suas respostas, verificamos que, neste momento, o seu perfil não se enquadra nos requisitos específicos exigidos pela Justiça para esta ação de restituição por bitributação. Essa ação é voltada para aposentados que contribuíram entre 1989 e 1995 com IR retido na fonte e que ainda sofrem desconto de IR hoje. Não sendo o seu caso, não seria correto da nossa parte prosseguir. Agradecemos muito o seu contato! O escritório Sichel & Duboc está sempre à disposição para outras demandas previdenciárias ou tributárias. Tenha um excelente dia!"

ETAPA 3: VALIDAÇÃO DO DIREITO E COLETA DE DADOS
Se o lead respondeu "Sim" às 3 perguntas:
1. Confirmação: "Excelente notícia! Com base nas suas respostas, você preenche todos os requisitos para buscar a restituição do Imposto de Renda cobrado indevidamente. O que ocorreu foi o seguinte: você já pagou esse imposto lá atrás, entre 1989 e 1995, quando contribuía para o seu fundo. Mesmo assim, a Receita Federal continua cobrando IR sobre o seu benefício hoje — isso é bitributação e a Justiça reconhece o seu direito de receber esse dinheiro de volta. Nossa equipe vai preparar a sua análise personalizada. Para isso, preciso de alguns dados básicos. Qual é o seu nome completo?"
2. Após o nome: "Prazer em conhecer, [Nome]! De qual cidade e estado você está nos contatando?"
3. Após cidade/estado: "Perfeito! Qual é o nome do seu fundo de previdência (ex: Petros, Funcef, Previ, etc.)? E qual é o seu e-mail para enviarmos a documentação do seu caso?"

ETAPA 4: APRESENTAÇÃO DA PROPOSTA E SOLICITAÇÃO DE DOCUMENTOS
Após coletar os dados básicos:
"Tudo anotado, [Nome]! Sua pasta já está sendo aberta pela nossa equipe. O escritório Sichel & Duboc (OAB/RJ 181.046) trabalha com total transparência e segurança. Para darmos entrada na sua ação e garantirmos que você não perca mais dinheiro por prescrição, precisaremos de alguns documentos. São apenas 4 itens:
1. Documento de Identidade (RG ou CNH — foto frente e verso)
2. Comprovante de Residência (conta de luz, água ou telefone)
3. Contracheque atual da aposentadoria complementar
4. Declaração de Imposto de Renda (último ano)
Você pode me enviar as fotos ou PDFs aqui mesmo pelo WhatsApp. Todos os seus dados são protegidos pela LGPD e utilizados exclusivamente para a análise do seu caso. Consegue me enviar hoje? [BUTTONS: Sim, envio hoje | Envio depois]"

ETAPA 5: SUPERAÇÃO DE OBJEÇÕES (Responda conforme a dúvida do lead)
- "Isso é golpe?" / "Como sei que é verdade?": "Entendo a sua preocupação, e é muito saudável questionar. O escritório Sichel & Duboc é registrado na OAB/RJ sob o número 181.046 e no CNPJ 48.319.240/0001-80. Você pode verificar no site do Conselho Federal da OAB. Nosso site é [sichelduboc.com.br]. A tese é baseada na Lei 7.713/88 e tem jurisprudência favorável nos tribunais superiores. Estamos aqui para proteger os seus direitos, não o contrário."
- "Quanto vou pagar?": "Ótima pergunta! O escritório trabalha no modelo de honorários de êxito, ou seja, você não paga nada adiantado. Nossos honorários são um percentual combinado em contrato, cobrado apenas quando você ganhar a ação e o dinheiro estiver disponível. É risco zero para você. [BUTTONS: Entendi | Tenho outra dúvida]"
- "Preciso pensar" / "Vou ver com meu filho/filha": "Claro, [Nome], é uma decisão importante e faz todo sentido conversar com a família. Só quero te lembrar de um detalhe: o direito à restituição prescreve mês a mês. Cada mês que passa sem a ação, você perde definitivamente o direito de recuperar aquele mês de 5 anos atrás. Se quiser, posso te enviar um resumo do caso para você mostrar para a família. Posso fazer isso? [BUTTONS: Sim, por favor | Não precisa]"
- "Não sei se tenho os documentos": "Não se preocupe com isso! Nossa equipe pode te ajudar a emitir alguns documentos pela internet, como o contracheque e a declaração de IR. Me diga qual documento está com dificuldade de encontrar e eu te oriento."

ETAPA 6: ENVIO DO CONTRATO E FECHAMENTO
Quando os documentos forem recebidos ou o lead confirmar interesse:
"Perfeito, [Nome]! Recebi tudo. Vou encaminhar agora o seu Contrato de Prestação de Serviços Jurídicos. Como combinamos, os honorários são cobrados apenas no êxito — você não paga nada agora. O contrato é simples, claro e protege os seus direitos. Clique no link abaixo para ler e assinar digitalmente pelo seu celular mesmo. A assinatura digital tem total validade jurídica: [LINK PARA ASSINATURA DO CONTRATO] Assim que assinar, me avise aqui para confirmarmos no sistema. Tem alguma dúvida sobre algum ponto do contrato? [BUTTONS: Já assinei | Tenho dúvida]"
- Após assinatura: "Contrato recebido e validado com sucesso, [Nome]! ✅ Parabéns por dar esse passo importante para recuperar o que é seu por direito. A partir de agora, o escritório Sichel & Duboc cuida de tudo. Você receberá atualizações sobre o andamento do seu processo por este mesmo WhatsApp. Seja muito bem-vindo(a) ao nosso escritório! Qualquer dúvida, é só chamar."

FOLLOW-UPS (Reengajamento automático se o lead parar de responder):
- FU-1 (Abandono na Triagem - 4h): "Olá! Tudo bem? Vi que não conseguimos terminar nossa conversa mais cedo. Sei que o dia a dia é corrido, mas faltam apenas algumas perguntas rápidas para verificar se você tem direito à restituição do IR. Podemos continuar? É só me responder a última pergunta que te fiz."
- FU-2 (Qualificado, sem dados - 24h): "Olá, [Nome]! Aqui é do escritório Sichel & Duboc. Confirmamos ontem que você preenche todos os requisitos para a ação de restituição por bitributação — uma excelente notícia! Para não perdermos tempo e evitarmos a prescrição do seu direito, preciso apenas que você me envie os dados que solicitei. Seus dados estão 100% seguros conosco (OAB/RJ 181.046). Posso aguardar o envio?"
- FU-3 (Dados coletados, sem docs - 48h): "Oi, [Nome]! Tudo bem? Sua pasta de restituição já está pré-aprovada aqui no escritório. Só estamos aguardando as fotos dos seus documentos para darmos entrada. Sei que às vezes é difícil encontrar a papelada — se precisar de ajuda para emitir algum documento pela internet, é só me avisar. Consegue me mandar as fotos hoje? Cada mês que passa sem a ação é um mês a menos de restituição."
- FU-4 (Contrato enviado, não assinado - 24h): "Olá, [Nome]! Vi que o seu contrato foi gerado, mas ainda não recebemos a assinatura. Quero reforçar: você não paga nada agora. Nossos honorários são cobrados apenas quando você ganhar a causa. É risco zero para você. O link para assinar pelo celular é este: [LINK]. Ficou alguma dúvida sobre o contrato? Estou aqui para explicar o que precisar."
- FU-5 (Sem resposta geral - 7 dias): "Olá, [Nome]. Esta é a minha última mensagem por enquanto. Como advogados especialistas, é nosso dever alertar: o direito à restituição do IR por bitributação prescreve mês a mês. Cada mês que você adia, você perde definitivamente o direito de recuperar aquele valor. O processo é seguro, sem custo inicial e nós cuidamos de tudo. Se decidir seguir em frente, basta responder 'Quero continuar' e retomamos o seu atendimento imediatamente. Um abraço da equipe Sichel & Duboc!"`;

export default function Admin() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Layout states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'fluxos' | 'calendario'>('dashboard');
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('adminDarkMode');
    return saved === 'true';
  });
  
  // Fluxos states
  const [fluxoTab, setFluxoTab] = useState<'prompts' | 'timers' | 'videos'>('prompts');
  const [flowView, setFlowView] = useState<'list' | 'editor'>('list');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiChatPrompt, setAiChatPrompt] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

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

  // Sync selectedLead with leads array updates
  useEffect(() => {
    if (selectedLead) {
      const updatedLead = leads.find(l => l.id === selectedLead.id);
      if (updatedLead && JSON.stringify(updatedLead) !== JSON.stringify(selectedLead)) {
        setSelectedLead(updatedLead);
      }
    }
  }, [leads, selectedLead]);

  // Handle Dark Mode
  useEffect(() => {
    localStorage.setItem('adminDarkMode', isDarkMode.toString());
  }, [isDarkMode]);

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
    // Optimistic update
    setSelectedLead(prev => prev && prev.id === leadId ? { ...prev, status: newStatus } : prev);
    
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
    const newStatus = currentStatus === false ? true : false;
    
    // Optimistic update
    setSelectedLead(prev => prev && prev.id === leadId ? { ...prev, aiEnabled: newStatus } : prev);
    
    try {
      await updateDoc(doc(db, 'leads', leadId), {
        aiEnabled: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao alternar IA:', error);
      // Revert on error
      setSelectedLead(prev => prev && prev.id === leadId ? { ...prev, aiEnabled: currentStatus } : prev);
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
        let errorMessage = 'Erro desconhecido';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Se não for JSON (ex: erro 500 do Vercel), pega o texto
          const errorText = await response.text();
          errorMessage = errorText || `Erro HTTP: ${response.status}`;
        }
        alert('Erro ao enviar mensagem: ' + errorMessage);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem. Verifique a conexão.');
    }
  };

  if (loading) {
    return (
      <div className={`admin-panel min-h-screen flex items-center justify-center ${isDarkMode ? 'dark bg-[#121212]' : 'bg-slate-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#dcb366]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`admin-panel min-h-screen flex flex-col items-center justify-center p-4 relative ${isDarkMode ? 'dark bg-[#121212]' : 'bg-slate-50'}`}>
        <div className="absolute top-4 right-4">
          <button 
            onClick={() => {
              const newMode = !isDarkMode;
              setIsDarkMode(newMode);
              localStorage.setItem('adminDarkMode', String(newMode));
            }}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title={isDarkMode ? "Mudar para tema claro" : "Mudar para tema escuro"}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-xl overflow-hidden shadow-sm border border-slate-100">
              <img src="https://i.imgur.com/pgCrkrr.jpeg" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">Painel Administrativo</h1>
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
              className="w-full bg-slate-800 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-900 transition-colors mt-2"
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
      <div className={`admin-panel min-h-screen flex flex-col items-center justify-center p-4 relative ${isDarkMode ? 'dark bg-[#121212]' : 'bg-slate-50'}`}>
        <div className="absolute top-4 right-4">
          <button 
            onClick={() => {
              const newMode = !isDarkMode;
              setIsDarkMode(newMode);
              localStorage.setItem('adminDarkMode', String(newMode));
            }}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title={isDarkMode ? "Mudar para tema claro" : "Mudar para tema escuro"}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
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
    <div className={`admin-panel min-h-screen flex h-screen overflow-hidden ${isDarkMode ? 'dark bg-[#121212]' : 'bg-slate-50'}`}>
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow-sm border border-slate-100">
            <img src="https://i.imgur.com/pgCrkrr.jpeg" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <h1 className="font-bold text-slate-800 text-lg leading-tight">Painel<br/>Administrativo</h1>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${activeTab === 'dashboard' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>

          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${activeTab === 'chat' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <MessageCircle size={18} />
            Chat
          </button>
          
          <button 
            onClick={() => setActiveTab('calendario')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${activeTab === 'calendario' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <Calendar size={18} />
            Calendário
          </button>
          
          <button 
            onClick={() => setActiveTab('fluxos')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${activeTab === 'fluxos' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <Workflow size={18} />
            Fluxos e IA
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-2 px-2">
            <div className="text-xs text-slate-400 truncate max-w-[150px]">{user.email}</div>
            <button 
              onClick={() => {
                const newMode = !isDarkMode;
                setIsDarkMode(newMode);
                localStorage.setItem('adminDarkMode', String(newMode));
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title={isDarkMode ? "Mudar para tema claro" : "Mudar para tema escuro"}
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 w-full rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            
            {/* Metrics & Controls Header */}
            <div className="bg-white border-b border-slate-200 p-6 shrink-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
              </div>
              
              <div className="grid grid-cols-5 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col">
                  <span className="text-slate-500 text-sm font-medium flex items-center gap-2 mb-2"><Users size={16} /> Total de Leads</span>
                  <span className="text-3xl font-bold text-slate-800">{leads.length}</span>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col">
                  <span className="text-blue-600 text-sm font-medium flex items-center gap-2 mb-2"><BarChart3 size={16} /> Novos</span>
                  <span className="text-3xl font-bold text-blue-700">{leads.filter(l => l.status === 'novo').length}</span>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex flex-col">
                  <span className="text-amber-600 text-sm font-medium flex items-center gap-2 mb-2"><Clock size={16} /> Em Atendimento</span>
                  <span className="text-3xl font-bold text-amber-700">{leads.filter(l => l.status === 'em_atendimento').length}</span>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex flex-col">
                  <span className="text-green-600 text-sm font-medium flex items-center gap-2 mb-2"><CheckCircle size={16} /> Qualificados</span>
                  <span className="text-3xl font-bold text-green-700">{leads.filter(l => l.status === 'qualificado').length}</span>
                </div>
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex flex-col">
                  <span className="text-slate-500 text-sm font-medium flex items-center gap-2 mb-2"><XCircle size={16} /> Descartados</span>
                  <span className="text-3xl font-bold text-slate-700">{leads.filter(l => l.status === 'descartado').length}</span>
                </div>
              </div>
            </div>

            {/* Kanban View (Dashboard) */}
            <div className="flex-1 overflow-x-auto p-6 bg-slate-50/50">
              <div className="flex gap-6 h-full min-w-max">
                {[
                  { id: 'novo', title: 'Novos', color: 'bg-blue-100 text-blue-700 border-blue-200' },
                  { id: 'em_atendimento', title: 'Em Atendimento', color: 'bg-amber-100 text-amber-700 border-amber-200' },
                  { id: 'qualificado', title: 'Qualificados', color: 'bg-green-100 text-green-700 border-green-200' },
                  { id: 'dados_coletados', title: 'Dados Coletados', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
                  { id: 'contrato_enviado', title: 'Contrato Enviado', color: 'bg-purple-100 text-purple-700 border-purple-200' },
                  { id: 'descartado', title: 'Descartados', color: 'bg-slate-100 text-slate-700 border-slate-200' },
                ].map(col => (
                  <div 
                    key={col.id} 
                    className="w-80 flex flex-col bg-slate-100/50 rounded-xl border border-slate-200"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedLeadId) {
                        updateLeadStatus(draggedLeadId, col.id);
                        setDraggedLeadId(null);
                      }
                    }}
                  >
                    <div className={`p-3 m-3 rounded-lg border font-bold text-sm flex justify-between items-center ${col.color}`}>
                      {col.title}
                      <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs">
                        {leads.filter(l => l.status === col.id).length}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 pt-0 space-y-3">
                      {leads.filter(l => l.status === col.id).map(lead => (
                        <div 
                          key={lead.id} 
                          draggable
                          onDragStart={() => setDraggedLeadId(lead.id)}
                          onDragEnd={() => setDraggedLeadId(null)}
                          onClick={() => { setSelectedLead(lead); setActiveTab('chat'); }}
                          className={`bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow ${draggedLeadId === lead.id ? 'opacity-50' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-bold text-slate-800 truncate pr-2">{lead.nome}</div>
                            {lead.aiEnabled !== false ? (
                              <span title="IA Ativa"><Bot size={14} className="text-indigo-500 shrink-0" /></span>
                            ) : (
                              <span title="Atendimento Humano"><User size={14} className="text-slate-400 shrink-0" /></span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                            <MessageCircle size={12} /> {lead.telefone}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="flex flex-1 overflow-hidden bg-slate-50 p-6 gap-6">
            {/* Leads List (Compact) */}
            <div className="w-80 bg-white border border-slate-200 rounded-2xl flex flex-col shrink-0 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h2 className="font-bold text-slate-800 text-lg mb-4">Conversas</h2>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar contatos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {leads.filter(l => l.nome.toLowerCase().includes(searchTerm.toLowerCase()) || l.telefone.includes(searchTerm)).length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">Nenhum contato encontrado.</div>
                ) : (
                  leads.filter(l => l.nome.toLowerCase().includes(searchTerm.toLowerCase()) || l.telefone.includes(searchTerm)).map(lead => (
                    <div 
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`p-4 border-b border-slate-50 cursor-pointer transition-colors flex items-center gap-3 ${selectedLead?.id === lead.id ? 'bg-slate-50 border-l-4 border-l-indigo-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                        <User size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <h3 className="font-semibold text-slate-800 truncate text-sm">{lead.nome}</h3>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(lead.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {lead.status === 'novo' ? 'Novo lead' : 
                           lead.status === 'em_atendimento' ? 'Em atendimento' : 
                           lead.status === 'qualificado' ? 'Qualificado' : 'Descartado'}
                        </div>
                      </div>
                      {lead.status === 'novo' && (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          1
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Lead Details & Chat */}
            <div className="flex-1 flex bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {selectedLead ? (
                <>
                  {/* Chat Area */}
                  <div className="flex-1 flex flex-col border-r border-slate-100">
                    <div className="p-4 border-b border-slate-100 bg-white shrink-0 flex justify-between items-center z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                          <User size={18} />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-slate-800 leading-tight">{selectedLead.nome}</h2>
                          <p className="text-xs text-slate-500">
                            {selectedLead.telefone}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => toggleAI(selectedLead.id, selectedLead.aiEnabled)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${selectedLead.aiEnabled !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          title={selectedLead.aiEnabled !== false ? "Desativar IA e assumir atendimento" : "Reativar atendimento por IA"}
                        >
                          {selectedLead.aiEnabled !== false ? <><Bot size={14} /> IA Ativa</> : <><User size={14} /> Humano</>}
                        </button>
                        <button className="text-slate-400 hover:text-slate-600 transition-colors">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        </button>
                        <button className="text-slate-400 hover:text-slate-600 transition-colors">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-white">
                      {messages.length === 0 ? (
                        <div className="text-center text-slate-400 my-auto text-sm">
                          Nenhuma mensagem registrada.
                        </div>
                      ) : (
                        messages.map(msg => (
                          <div 
                            key={msg.id} 
                            className={`max-w-[75%] flex gap-3 ${
                              msg.sender === 'user' 
                                ? 'self-start' 
                                : 'self-end flex-row-reverse'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-400 mt-auto">
                              {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className={`rounded-2xl p-3.5 shadow-sm border ${
                                msg.sender === 'user' 
                                  ? 'bg-white border-slate-200 rounded-bl-none text-slate-700' 
                                  : 'bg-emerald-50 border-emerald-100 rounded-br-none text-emerald-900'
                              }`}>
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
                              </div>
                              <span className={`text-[10px] text-slate-400 ${msg.sender === 'user' ? 'text-left ml-1' : 'text-right mr-1'}`}>
                                {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                      <form onSubmit={sendMessage} className="flex items-center gap-3">
                        <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors p-2">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                        </button>
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Digite sua mensagem..."
                          className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all"
                        />
                        <button 
                          type="submit"
                          disabled={!newMessage.trim()}
                          className="w-12 h-12 bg-indigo-400 text-white rounded-full flex items-center justify-center hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-400 shrink-0 shadow-sm"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Right Sidebar: Lead Details */}
                  <div className="w-72 bg-slate-50 flex flex-col shrink-0 overflow-y-auto border-l border-slate-100">
                    <div className="p-6">
                      <h3 className="font-bold text-slate-800 mb-4">Detalhes do Lead</h3>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 mb-6">
                        <button 
                          onClick={() => updateLeadStatus(selectedLead.id, 'em_atendimento')}
                          className={`px-3 py-2 rounded text-sm font-medium transition-colors text-left ${selectedLead.status === 'em_atendimento' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                        >
                          Em Atendimento
                        </button>
                        <button 
                          onClick={() => updateLeadStatus(selectedLead.id, 'qualificado')}
                          className={`px-3 py-2 rounded text-sm font-medium transition-colors text-left ${selectedLead.status === 'qualificado' ? 'bg-green-100 text-green-800 shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                        >
                          Qualificar
                        </button>
                        <button 
                          onClick={() => updateLeadStatus(selectedLead.id, 'descartado')}
                          className={`px-3 py-2 rounded text-sm font-medium transition-colors text-left ${selectedLead.status === 'descartado' ? 'bg-red-100 text-red-800 shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                        >
                          Descartar
                        </button>
                      </div>

                      {/* Details Grid (Vertical) */}
                      <div className="flex flex-col gap-3 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                          <span className="block text-slate-400 text-[9px] uppercase font-bold mb-1 tracking-wider">Aposentadoria</span>
                          <span className="font-medium text-slate-700 capitalize">{selectedLead.aposentadoriaComplementar || '-'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                          <span className="block text-slate-400 text-[9px] uppercase font-bold mb-1 tracking-wider">Contribuiu 89-95</span>
                          <span className="font-medium text-slate-700 capitalize">{selectedLead.contribuicao89a95 || '-'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                          <span className="block text-slate-400 text-[9px] uppercase font-bold mb-1 tracking-wider">Paga IR</span>
                          <span className="font-medium text-slate-700 capitalize">{selectedLead.pagaIrAtualmente || '-'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                          <span className="block text-slate-400 text-[9px] uppercase font-bold mb-1 tracking-wider">Localização</span>
                          <span className="font-medium text-slate-700">{selectedLead.cidade || '-'} / {selectedLead.estado || '-'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                          <span className="block text-slate-400 text-[9px] uppercase font-bold mb-1 tracking-wider">Email</span>
                          <span className="font-medium text-slate-700 break-all">{selectedLead.email || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white">
                  <MessageCircle size={48} className="mb-4 opacity-20" />
                  <p>Selecione um lead na lista para ver os detalhes e o chat.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CALENDARIO TAB */}
        {activeTab === 'calendario' && (
          <GoogleCalendar />
        )}

        {/* FLUXOS TAB */}
        {activeTab === 'fluxos' && (
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
            <div className="max-w-6xl mx-auto">
              
              {flowView === 'list' ? (
                <div className="animate-in fade-in duration-300">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-2">Fluxos de Automação</h2>
                      <p className="text-slate-600">Gerencie as respostas automáticas e integrações da IA.</p>
                    </div>
                    <button 
                      onClick={() => setFlowView('editor')}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
                    >
                      <Sparkles size={18} />
                      Criar com IA
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Create New Flow Card */}
                    <button 
                      onClick={() => setFlowView('editor')}
                      className="flex flex-col items-center justify-center p-8 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl hover:bg-slate-100 hover:border-indigo-400 transition-all group h-64"
                    >
                      <div className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-colors mb-4">
                        <Sparkles size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-700 group-hover:text-indigo-700 mb-2 transition-colors">Gerar Novo Fluxo</h3>
                      <p className="text-sm text-slate-500 text-center max-w-[200px]">
                        Descreva o que você precisa e a IA criará a automação
                      </p>
                    </button>
                    
                    {/* Existing Flow Card (Example) */}
                    <div 
                      onClick={() => setFlowView('editor')}
                      className="flex flex-col p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all group h-64"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                          <Workflow size={20} />
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100">Ativo</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">Triagem de Restituição IR</h3>
                      <p className="text-sm text-slate-500 mb-auto line-clamp-3">
                        Qualifica leads para a tese de "Restituição de IR por Bitributação", coleta dados e envia o contrato automaticamente.
                      </p>
                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <span>Atualizado há 2 dias</span>
                        <span className="flex items-center gap-1"><Bot size={14} /> IA Ativa</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="mb-8 flex items-center gap-4">
                    <button 
                      onClick={() => setFlowView('list')}
                      className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
                      title="Voltar para a lista"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    </button>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-1">Configurações do Robô</h2>
                      <p className="text-slate-600">Gerencie a inteligência artificial, regras de follow-up e mídias.</p>
                    </div>
                  </div>

                  {/* Sub-tabs Navigation */}
                  <div className="flex gap-2 mb-6 border-b border-slate-200">
                    <button
                      onClick={() => setFluxoTab('prompts')}
                      className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${fluxoTab === 'prompts' ? 'border-[#dcb366] text-[#dcb366]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      Prompts da IA
                    </button>
                    <button
                      onClick={() => setFluxoTab('timers')}
                      className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${fluxoTab === 'timers' ? 'border-[#dcb366] text-[#dcb366]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      Temporizadores (Follow-ups)
                    </button>
                    <button
                      onClick={() => setFluxoTab('videos')}
                      className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${fluxoTab === 'videos' ? 'border-[#dcb366] text-[#dcb366]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      Vídeos e Mídias
                    </button>
                  </div>

                  {fluxoTab === 'prompts' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-6 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-bold text-slate-800 text-lg">Fluxo de Conversação da IA</h3>
                        <p className="text-sm text-slate-500 mt-1">Configure o comportamento da IA em cada etapa do atendimento.</p>
                      </div>
                      
                      <div className="p-0">
                        <PromptsFlow 
                          aiPrompt={aiPrompt}
                          setAiPrompt={setAiPrompt}
                          aiChatPrompt={aiChatPrompt}
                          setAiChatPrompt={setAiChatPrompt}
                          onSave={handleSavePrompt}
                          saving={savingPrompt}
                          saved={promptSaved}
                          expertPrompt={EXPERT_PROMPT}
                        />
                      </div>
                    </div>
                  )}

              {fluxoTab === 'timers' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="p-6 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-lg">Regras de Follow-up (Temporizadores)</h3>
                    <p className="text-sm text-slate-500 mt-1">Configure o tempo de espera para o robô enviar mensagens automáticas caso o cliente pare de responder.</p>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800">FU-1: Abandono na Triagem</h4>
                          <p className="text-sm text-slate-500">Disparado quando o cliente não responde às primeiras perguntas.</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded border border-slate-200">
                          <Clock size={16} className="text-slate-400" />
                          <span className="font-mono font-bold text-slate-700">4 horas</span>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800">FU-2: Qualificado, sem dados</h4>
                          <p className="text-sm text-slate-500">Disparado quando o cliente passou na triagem mas não enviou o nome/cidade.</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded border border-slate-200">
                          <Clock size={16} className="text-slate-400" />
                          <span className="font-mono font-bold text-slate-700">24 horas</span>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800">FU-3: Dados coletados, sem documentos</h4>
                          <p className="text-sm text-slate-500">Disparado quando o cliente não enviou as fotos dos documentos.</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded border border-slate-200">
                          <Clock size={16} className="text-slate-400" />
                          <span className="font-mono font-bold text-slate-700">48 horas</span>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800">FU-4: Contrato enviado, não assinado</h4>
                          <p className="text-sm text-slate-500">Disparado quando o link do contrato foi enviado mas não houve confirmação.</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded border border-slate-200">
                          <Clock size={16} className="text-slate-400" />
                          <span className="font-mono font-bold text-slate-700">24 horas</span>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800">FU-5: Sem resposta geral</h4>
                          <p className="text-sm text-slate-500">Última tentativa de contato antes de congelar o lead.</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded border border-slate-200">
                          <Clock size={16} className="text-slate-400" />
                          <span className="font-mono font-bold text-slate-700">7 dias</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-indigo-50 text-indigo-800 rounded-lg border border-indigo-100 text-sm">
                      <p className="font-bold mb-1 flex items-center gap-2"><Sparkles size={16} /> Dica de Ouro</p>
                      <p>Os textos exatos de cada Follow-up são definidos dentro do <strong>Prompt do Chatbot</strong>. A IA usa esses temporizadores apenas como gatilho para saber <em>quando</em> enviar a mensagem.</p>
                    </div>
                  </div>
                </div>
              )}

              {fluxoTab === 'videos' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="p-6 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-lg">Biblioteca de Vídeos (Em Breve)</h3>
                    <p className="text-sm text-slate-500 mt-1">Faça upload de vídeos explicativos para a IA enviar automaticamente aos clientes.</p>
                  </div>
                  <div className="p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                    </div>
                    <h4 className="text-xl font-bold text-slate-800 mb-2">Envio de Vídeos Nativos</h4>
                    <p className="text-slate-500 max-w-md mb-6">
                      Em breve, você poderá cadastrar vídeos curtos (ex: "Como funciona a tese", "O escritório é confiável?") e a IA enviará o vídeo nativamente no WhatsApp quando o cliente perguntar.
                    </p>
                    <button disabled className="bg-slate-200 text-slate-500 px-6 py-3 rounded-lg font-bold cursor-not-allowed">
                      Recurso em Desenvolvimento
                    </button>
                  </div>
                </div>
              )}
                </div>
              )}

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
