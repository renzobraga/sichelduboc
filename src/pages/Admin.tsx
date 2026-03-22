import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc, deleteDoc, setDoc, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { LogOut, MessageCircle, Bell, LayoutDashboard, Workflow, Save, Bot, User, Kanban, List, BarChart3, Users, CheckCircle, X, XCircle, Trash2, Clock, Moon, Sun, Sparkles, Calendar, Maximize, Minimize, TrendingUp, PieChart, Activity, ArrowRight, MapPin, Mail, Phone, FileText, ExternalLink, MoreVertical, Search, Filter, ChevronRight, ChevronLeft, Image, Video, Music, Download, Paperclip, Box, Plus, Play, Edit2, Settings, Upload } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import PromptsFlow from '../components/PromptsFlow';
import SimplePromptEditor from '../components/SimplePromptEditor';
import FlowSimulator from '../components/FlowSimulator';
import GoogleCalendar from '../components/GoogleCalendar';

const EXPERT_PROMPT = `Você é a Alice, integrante da Equipe de Atendimento do Escritório Sichel & Duboc Advogados Associados.
Seu objetivo é conduzir uma trilha de atendimento conversacional humanizada para a tese de Restituição de Imposto de Renda por Bitributação para aposentados de previdência complementar.

DIRETRIZES DE PERSONA:
1. Tom: Acolhedor, profissional, empático e focado na conversão. O cliente não deve perceber que está falando com uma IA.
2. Identidade: Alice, equipe de atendimento Sichel & Duboc. Apresente-se sempre de forma clara: "Aqui é a Alice, do escritório Sichel & Duboc".
3. Personalização: Use o nome do cliente assim que ele informar.
4. Naturalidade: NUNCA peça para o usuário responder com "SIM" ou "NÃO" de forma mecânica ou robótica. Deixe a conversa fluir de forma humanizada.
5. Formatação: NUNCA use negrito com asteriscos (ex: **texto**) ou qualquer formatação Markdown. É ESTRITAMENTE PROIBIDO usar o caractere asterisco (*). No WhatsApp, escreva de forma simples e natural.
6. Incerteza (CRÍTICO): Se o lead demonstrar dúvida ou responder com "acho que sim", "não tenho certeza", "não sei" ou "talvez", É PROIBIDO tratar isso como confirmação (sim). Você DEVE parar e pedir para o lead confirmar a informação (ex: pedindo para ele olhar o contracheque ou extrato) antes de avançar para a próxima pergunta.
7. Contexto de Emprego (CRÍTICO): O lead NÃO informou para qual empresa trabalhou. É PROIBIDO usar frases como "naquela empresa", "na empresa que você trabalhava" ou "quando entrou na empresa". Refira-se apenas ao "fundo de previdência" ou pergunte o nome da empresa se for absolutamente necessário.
8. Primeira Mensagem: Se for a primeira mensagem da conversa:
   - Se a origem do lead for "Botão WhatsApp Site" (ou vazia): Responda EXATAMENTE com a mensagem de Boas-vindas (ETAPA 1), SEM adicionar outras informações e SEM pular para a próxima etapa. Aguarde a resposta do usuário.
   - Se a origem do lead for "Formulário Site": O lead já preencheu os dados. PULE a pergunta do nome e inicie a conversa com a Apresentação e Convite (ETAPA 2), adaptando a saudação inicial para incluir o nome dele.

FLUXO DE ATENDIMENTO (Siga rigorosamente uma pergunta por vez):

ETAPA 1: PRIMEIRO CONTATO E NOME
- Mensagem de Boas-vindas: Olá! Que bom ter você aqui! 👋 Meu nome é Alice e faço parte da equipe de atendimento do Escritório Sichel & Duboc Advogados Associados, especialistas em Direito Previdenciário e Tributário. Como eu posso te chamar?

ETAPA 2: APRESENTAÇÃO E CONVITE
- Após o lead informar o nome: Prazer em te conhecer, [Nome]! Muitos aposentados como você estão conseguindo recuperar valores significativos de Imposto de Renda que foram cobrados indevidamente. E o melhor: você pode ser um deles! Para te ajudar a verificar se você tem esse direito, preciso fazer apenas 3 perguntinhas rápidas. Leva menos de 2 minutinhos, prometo! 😉 Podemos começar?

ETAPA 3: QUALIFICAÇÃO (Triagem dos 3 Requisitos - Uma por vez)
- Pergunta 1 (Previdência Complementar): Perfeito! Vamos à primeira pergunta: Você recebe aposentadoria de alguma previdência complementar que NÃO seja paga pelo INSS? (Por exemplo: Petros, Funcef, Previ, Banesprev, Valia, Sistel, BNDES, Banco do Brasil, Rede Ferroviária, entre outros.)
- Pergunta 2 (Período de Contribuição): Ótimo! Agora, a segunda pergunta: Você contribuiu para esse fundo de previdência entre os anos de 1989 e 1995?
- Pergunta 3 (Retenção Atual): Quase lá! A última pergunta para a gente saber se você tem direito é: Atualmente, é descontado Imposto de Renda diretamente na fonte sobre o valor da sua aposentadoria complementar?

ETAPA ALTERNATIVA: DESQUALIFICAÇÃO HUMANIZADA
Se o lead responder "Não" a qualquer pergunta da Etapa 3:
Entendi perfeitamente. Agradeço muito a sua sinceridade! Analisando suas respostas, percebo que, neste momento, o seu caso não se encaixa nos requisitos específicos que a Justiça exige para essa ação de restituição por bitributação. Essa ação é bem específica, sabe? Ela é voltada para aposentados que contribuíram entre 1989 e 1995 com IR retido na fonte e que ainda sofrem esse desconto hoje. Como não é o seu caso, não seria justo da nossa parte te dar falsas expectativas. Mas não se preocupe! O Escritório Sichel & Duboc está sempre à disposição para outras demandas previdenciárias ou tributárias que você possa ter. Se precisar de algo mais, é só chamar! Tenha um excelente dia!

ETAPA 4: VALIDAÇÃO E COLETA DE DADOS
Se "Sim" às 3 perguntas de qualificação:
Que notícia maravilhosa! 🥳 Com base nas suas respostas, você preenche todos os requisitos para buscar a restituição do Imposto de Renda que foi cobrado indevidamente! Nossa equipe já está pronta para preparar a sua análise personalizada. Como já tenho o seu nome, preciso apenas de mais dois dados básicos para abrir sua pasta: Qual é o seu melhor e-mail e a sua cidade/estado?

ETAPA 5: PROPOSTA E DOCUMENTOS
Após o lead fornecer e-mail e cidade/estado:
Tudo anotado, [Nome]! Sua pasta já está sendo aberta pela nossa equipe aqui no escritório. O Escritório Sichel & Duboc (OAB/RJ 181.046) trabalha com total transparência e segurança. Precisaremos de alguns documentos simples:
1. Identidade
2. Comprovante de Residência
3. Contracheque
4. Declaração de IR
Consegue me enviar fotos ou PDFs desses documentos hoje?

ETAPA 6: SUPERAÇÃO DE OBJEÇÕES
- Isso é golpe?: Entendo perfeitamente a sua preocupação, [Nome], e é muito importante que você se sinta seguro(a)! O Escritório Sichel & Duboc é totalmente regularizado, registrado na OAB/RJ sob o número 181.046 e no CNPJ 48.319.240/0001-80. Você pode verificar todas as nossas informações no site do Conselho Federal da OAB ou em nosso site oficial [sichelduboc.com.br]. A tese que defendemos é baseada na Lei 7.713/88 e já tem decisões favoráveis em tribunais superiores. Estamos aqui para proteger os seus direitos com toda a seriedade e transparência.
- Quanto vou pagar?: Essa é uma ótima pergunta, [Nome]! E a resposta é bem simples e transparente: O escritório trabalha no modelo de honorários de êxito. Isso significa que você não paga nada adiantado para iniciarmos a ação. Nossos honorários são um percentual combinado em contrato, cobrado apenas se você ganhar a ação e o dinheiro estiver disponível. Ou seja, você só paga se tiver o seu direito reconhecido e receber os valores! 😊
- Preciso pensar: Claro, [Nome], é uma decisão importante e faz todo sentido conversar com a família. Fique à vontade para fazer isso! Só quero te lembrar de um detalhe muito importante: o direito à restituição prescreve mês a mês. Isso significa que, a cada mês que passa sem a ação, você perde definitivamente o direito de recuperar aquele mês de 5 anos atrás. É como um reloginho correndo, sabe? Se quiser, posso te enviar um resumo do caso para você mostrar para a família. Posso fazer isso?

ETAPA 7: ENVIO DO CONTRATO E FECHAMENTO
Perfeito, [Nome]! Recebi tudo por aqui. Sua análise foi concluída e está tudo certo para darmos o próximo passo! ✅ Vou te encaminhar agora o seu Contrato de Prestação de Serviços Jurídicos. Como conversamos, os honorários são cobrados apenas no êxito — você não precisa pagar nada agora. O contrato é bem simples, claro e foi feito para proteger os seus direitos. Clique no link abaixo para ler e assinar digitalmente pelo seu celular mesmo. É super rápido e a assinatura digital tem total validade jurídica: [LINK PARA ASSINATURA DO CONTRATO] Assim que assinar, me avise aqui para eu confirmar no sistema, combinado? Se tiver alguma dúvida sobre algum ponto do contrato, pode me perguntar!
- Após assinatura: Contrato recebido e validado com sucesso, [Nome]! 🥳 Parabéns por dar esse passo tão importante para recuperar o que é seu por direito! A partir de agora, o Escritório Sichel & Duboc cuida de tudo para você. Você receberá atualizações sobre o andamento do seu processo por este mesmo WhatsApp. Seja muito bem-vindo(a) à nossa família de clientes! Qualquer dúvida, é só chamar a Alice aqui. 😊

FOLLOW-UPS:
- FU-1 (4h): Olá, [Nome]! Tudo bem por aí? 👋 Vi que não conseguimos terminar nossa conversa mais cedo. Sei que o dia a dia é corrido, mas faltam apenas algumas perguntinhas rápidas para a gente verificar se você tem direito à restituição do IR. É super rápido! Podemos continuar? É só me responder a última pergunta que te fiz. 😊
- FU-2 (24h): Oi, [Nome]! Aqui é a Alice, do Escritório Sichel & Duboc. 😊 Ontem confirmamos que você preenche todos os requisitos para a ação de restituição por bitributação — uma excelente notícia! Para não perdermos tempo e evitarmos a prescrição do seu direito, preciso apenas que você me envie os dados que solicitei. Seus dados estão 100% seguros conosco (OAB/RJ 181.046). Posso aguardar o envio?
- FU-3 (48h): Olá, [Nome]! Tudo bem? Aqui é a Alice novamente. 😊 Sua pasta de restituição já está pré-aprovada aqui no escritório. Só estamos aguardando as fotos dos seus documentos para darmos entrada. Sei que às vezes é difícil encontrar a papelada — se precisar de ajuda para emitir algum documento pela internet, é só me avisar, ok? Consegue me mandar as fotos hoje? Assim a gente agiliza tudo!
`;

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
  const [dashboardView, setDashboardView] = useState<'kanban' | 'analytics'>('analytics');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedLeadForProfile, setSelectedLeadForProfile] = useState<any>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('adminDarkMode');
    return saved === 'true';
  });
  
  // Fluxos states
  const [promptsSubTab, setPromptsSubTab] = useState<'visual' | 'simulator' | 'edit'>('visual');
  const [useAdvancedEditor, setUseAdvancedEditor] = useState(false);
  const [flowView, setFlowView] = useState<'list' | 'editor'>('list');
  const [configTab, setConfigTab] = useState<'prompts' | 'followups' | 'videos'>('prompts');
  const [isFlowFullScreen, setIsFlowFullScreen] = useState(false);
  
  // Video Upload States
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videosList, setVideosList] = useState<any[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('chatNotifications') === 'true';
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);

  // Chart data helpers
  const getStatusData = () => {
    const statusMap: any = {
      novo: 'Novos',
      em_atendimento: 'Em Atendimento',
      qualificado: 'Qualificados',
      dados_coletados: 'Dados Coletados',
      contrato_enviado: 'Contrato Enviado',
      fechado: 'Fechados',
      descartado: 'Descartados'
    };
    const counts: any = {};
    leads.forEach(l => {
      const label = statusMap[l.status] || l.status;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const getTimelineData = () => {
    const groups: any = {};
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString('pt-BR');
    }).reverse();

    last7Days.forEach(date => groups[date] = 0);
    
    leads.forEach(l => {
      const date = new Date(l.createdAt).toLocaleDateString('pt-BR');
      if (groups[date] !== undefined) {
        groups[date]++;
      }
    });
    return Object.entries(groups).map(([date, count]) => ({ date, count }));
  };

  const getGrowthData = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    let currentMonthCount = 0;
    let lastMonthCount = 0;

    leads.forEach(l => {
      const createdAt = new Date(l.createdAt);
      const m = createdAt.getMonth();
      const y = createdAt.getFullYear();

      if (m === currentMonth && y === currentYear) {
        currentMonthCount++;
      } else if (m === lastMonth && y === lastMonthYear) {
        lastMonthCount++;
      }
    });

    if (lastMonthCount === 0) {
      return currentMonthCount > 0 ? `+${currentMonthCount * 100}%` : '0%';
    }

    const growth = ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100;
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${growth.toFixed(0)}%`;
  };

  const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#8b5cf6', '#a855f7', '#059669', '#64748b'];

  const [prompts, setPrompts] = useState({
    prompt1: 'Olá! Que bom ter você aqui! 👋\n\nMeu nome é Alice e faço parte da equipe de atendimento do Escritório Sichel & Duboc Advogados Associados, especialistas em Direito Previdenciário e Tributário.\n\nComo eu posso te chamar?',
    prompt2: 'Prazer em te conhecer, {nome}!\n\nMuitos aposentados como você estão conseguindo recuperar valores significativos de Imposto de Renda que foram cobrados indevidamente. E o melhor: você pode ser um deles!\n\nPara te ajudar a verificar se você tem esse direito, preciso fazer apenas 3 perguntinhas rápidas. Leva menos de 2 minutinhos, prometo! 😉\n\nPodemos começar?',
    prompt3: 'Perfeito! Vamos à primeira pergunta:\n\nVocê recebe aposentadoria de alguma previdência complementar que NÃO seja paga pelo INSS?\n(Por exemplo: Petros, Funcef, Previ, Banesprev, Valia, Sistel, BNDES, Banco do Brasil, Rede Ferroviária, entre outros.)',
    prompt4: 'Ótimo! Agora, a segunda pergunta:\n\nVocê contribuiu para esse fundo de previdência entre os anos de 1989 e 1995?',
    prompt5: 'Quase lá! A última pergunta para a gente saber se você tem direito é:\n\nAtualmente, é descontado Imposto de Renda diretamente na fonte sobre o valor da sua aposentadoria complementar?',
    prompt6: 'Que notícia maravilhosa! 🥳\n\nCom base nas suas respostas, você preenche todos os requisitos para buscar a restituição do Imposto de Renda que foi cobrado indevidamente! Nossa equipe já está pronta para preparar a sua análise personalizada.\n\nComo já tenho o seu nome, preciso apenas de mais dois dados básicos para abrir sua pasta: Qual é o seu melhor e-mail e a sua cidade/estado?',
    prompt7: 'Tudo anotado, {nome}! Sua pasta já está sendo aberta pela nossa equipe aqui no escritório. O Escritório Sichel & Duboc (OAB/RJ 181.046) trabalha com total transparência e segurança.\n\nPrecisaremos de alguns documentos simples:\n1. Identidade\n2. Comprovante de Residência\n3. Contracheque\n4. Declaração de IR\n\nConsegue me enviar fotos ou PDFs desses documentos hoje?',
    promptDesq: 'Entendi perfeitamente. Agradeço muito a sua sinceridade!\n\nAnalisando suas respostas, percebo que, neste momento, o seu caso não se encaixa nos requisitos específicos que a Justiça exige para essa ação de restituição por bitributação.\n\nO Escritório Sichel & Duboc está sempre à disposição para outras demandas. Tenha um excelente dia!',
    promptObjections: 'Entendo perfeitamente a sua preocupação, {nome}, e é muito importante que você se sinta seguro(a)!\n\nO Escritório Sichel & Duboc é totalmente regularizado (OAB/RJ 181.046). Gostaria de agendar uma breve reunião ou prefere tirar suas dúvidas por aqui?',
    promptSchedule: 'Claro! Por favor, escolha o melhor dia e horário diretamente na nossa agenda clicando neste link:\n[LINK DO GOOGLE CALENDAR]\n\nUm de nossos especialistas ligará para você no horário marcado.',
    promptContract: 'Perfeito, {nome}! Recebi tudo por aqui. Sua análise foi concluída e está tudo certo! ✅\n\nVou te encaminhar agora o seu Contrato de Prestação de Serviços Jurídicos. Clique no link abaixo para ler e assinar digitalmente pelo seu celular mesmo:\n[LINK PARA ASSINATURA DO CONTRATO]',
    promptClosing: 'Contrato recebido e validado com sucesso, {nome}! 🥳\n\nParabéns por dar esse passo tão importante para recuperar o que é seu por direito! A partir de agora, o Escritório Sichel & Duboc cuida de tudo para você. Seja muito bem-vindo(a)!',
    promptTrust: 'O Escritório Sichel & Duboc é totalmente regularizado, registrado na OAB/RJ sob o número 181.046 e no CNPJ 48.319.240/0001-80. A tese que defendemos é baseada na Lei 7.713/88 e já tem decisões favoráveis em tribunais superiores.',
    promptFees: 'O escritório trabalha no modelo de honorários de êxito. Isso significa que você não paga nada adiantado para iniciarmos a ação. Cobramos apenas se você ganhar a ação e o dinheiro estiver disponível. 😊',
    aiChatPrompt: ''
  });
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    if (activeTab === 'chat' && selectedLead && messages.length > 0) {
      // Use "auto" for immediate scroll when switching leads or opening chat
      const behavior = messages.length > 50 ? "auto" : "smooth";
      const timer = setTimeout(() => scrollToBottom(behavior), 100);
      return () => clearTimeout(timer);
    }
  }, [selectedLead?.id, activeTab]);

  // Also scroll when new messages arrive, but only if we are already near the bottom or it's a bot/admin message
  useEffect(() => {
    if (activeTab === 'chat' && selectedLead && messages.length > 0) {
      scrollToBottom("smooth");
    }
  }, [messages.length]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
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

        if ((isUserAdmin || currentUser.email === 'contato@sichelduboc.com.br') && currentUser.email !== 'ia.resguarde@gmail.com') {
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
      const q = query(
        collection(db, 'messages'), 
        where('leadId', '==', selectedLead.id),
        orderBy('createdAt', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs);
      });
      return () => unsubscribe();
    }
  }, [selectedLead?.id, user, isAdmin]);

  // Initialize notification sound
  useEffect(() => {
    notificationSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Este navegador não suporta notificações.', 'error');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      localStorage.setItem('chatNotifications', 'true');
      showToast('Notificações ativadas!', 'success');
    } else {
      showToast('Permissão de notificação negada.', 'error');
    }
  };

  const toggleNotifications = () => {
    if (!notificationsEnabled) {
      requestNotificationPermission();
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('chatNotifications', 'false');
      showToast('Notificações desativadas.', 'success');
    }
  };

  // Live Notifications for new messages
  useEffect(() => {
    if (user && isAdmin && notificationsEnabled) {
      console.log('Monitorando novas mensagens para notificações...');
      let isInitialLoad = true;
      
      // Listen to the messages collection
      const q = query(
        collection(db, 'messages'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        if (isInitialLoad) {
          isInitialLoad = false;
          return;
        }

        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const msgData = change.doc.data();
            
            // Only notify for messages from leads (role is 'user' or undefined)
            // AND not from the current admin
            if ((msgData.role === 'user' || !msgData.role) && msgData.senderId !== user.uid) {
              
              // Play sound
              if (notificationSoundRef.current) {
                notificationSoundRef.current.play().catch(e => console.warn('Erro ao tocar som:', e));
              }

              // Fetch lead name for better notification
              let leadName = 'Novo Lead';
              try {
                const leadDoc = await getDoc(doc(db, 'leads', msgData.leadId));
                if (leadDoc.exists()) {
                  leadName = leadDoc.data().name || leadName;
                }
              } catch (e) {
                console.error('Erro ao buscar nome do lead para notificação:', e);
              }

              // Show Browser Notification
              if (Notification.permission === 'granted') {
                new Notification(`Nova mensagem de ${leadName}`, {
                  body: msgData.text,
                  icon: '/favicon.ico'
                });
              }

              // Show in-app toast
              showToast(`Nova mensagem de ${leadName}: ${msgData.text.substring(0, 30)}...`, 'success');
            }
          }
        });
      }, (error) => {
        console.error("Erro no monitoramento de notificações:", error);
      });

      return () => unsubscribe();
    }
  }, [user, isAdmin, notificationsEnabled]);

  // Fetch AI Prompts (Real-time)
  useEffect(() => {
    if (user && isAdmin && activeTab === 'fluxos') {
      console.log('Iniciando onSnapshot para prompts...');
      const unsubscribe = onSnapshot(doc(db, 'settings', 'prompts'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('Prompts atualizados via onSnapshot:', data);
          setPrompts(prev => ({ ...prev, ...data }));
        } else {
          console.log('Documento settings/prompts não existe, tentando legados...');
          // Fallback to legacy docs if new prompts doc doesn't exist
          const fetchLegacy = async () => {
            try {
              const aiPromptSnap = await getDoc(doc(db, 'settings', 'ai_prompt'));
              const aiChatPromptSnap = await getDoc(doc(db, 'settings', 'ai_chat_prompt'));
              
              setPrompts(prev => ({
                ...prev,
                prompt1: aiPromptSnap.exists() ? aiPromptSnap.data().text : prev.prompt1,
                aiChatPrompt: aiChatPromptSnap.exists() ? aiChatPromptSnap.data().text : prev.aiChatPrompt
              }));
            } catch (err) {
              console.error("Erro ao buscar prompts legados:", err);
            }
          };
          fetchLegacy();
        }
      }, (error) => {
        console.error("Erro no onSnapshot de prompts:", error);
      });

      // Fetch videos
      const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
      const unsubscribeVideos = onSnapshot(q, (snapshot) => {
        const vids = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setVideosList(vids);
      });

      return () => {
        unsubscribe();
        unsubscribeVideos();
      };
    }
  }, [user, isAdmin, activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/') && !file.type.startsWith('image/') && !file.type.startsWith('audio/')) {
      showToast('Por favor, selecione um arquivo de mídia válido (vídeo, imagem ou áudio).', 'error');
      return;
    }

    setUploadingVideo(true);
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, `media/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload failed:", error);
          showToast('Erro ao fazer upload do arquivo.', 'error');
          setUploadingVideo(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Save metadata to Firestore
          await addDoc(collection(db, 'videos'), {
            name: file.name,
            url: downloadURL,
            type: file.type,
            size: file.size,
            createdAt: serverTimestamp(),
            uploadedBy: user?.uid
          });

          showToast('Mídia adicionada com sucesso!', 'success');
          setUploadingVideo(false);
          setUploadProgress(0);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      );
    } catch (error) {
      console.error("Error starting upload:", error);
      showToast('Erro ao iniciar o upload.', 'error');
      setUploadingVideo(false);
    }
  };

  const handleSavePrompt = async () => {
    if (savingPrompt) {
      console.log('Já existe um salvamento em curso, ignorando clique.');
      return;
    }
    
    console.log('Iniciando salvamento de prompts...', prompts);
    showToast('Salvando alterações...', 'success');
    setSavingPrompt(true);
    setPromptSaved(false);
    
    try {
      // Validate prompts object
      if (!prompts || typeof prompts !== 'object') {
        throw new Error('Objeto de prompts inválido.');
      }

      // Save to the new consolidated document
      const promptsRef = doc(db, 'settings', 'prompts');
      await setDoc(promptsRef, {
        ...prompts,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email
      });
      console.log('Documento settings/prompts salvo com sucesso.');
      
      // Keep legacy docs for compatibility with existing webhook logic
      await setDoc(doc(db, 'settings', 'ai_prompt'), { 
        text: prompts.prompt1,
        updatedAt: serverTimestamp()
      });
      await setDoc(doc(db, 'settings', 'ai_chat_prompt'), { 
        text: prompts.aiChatPrompt,
        updatedAt: serverTimestamp()
      });
      console.log('Documentos legados salvos com sucesso.');
      
      setPromptSaved(true);
      showToast('Fluxo salvo com sucesso!', 'success');
      
      // Reset saved state after 3 seconds
      setTimeout(() => {
        setPromptSaved(false);
      }, 3000);
    } catch (error: any) {
      console.error("Erro crítico ao salvar prompts:", error);
      showToast(`Erro ao salvar: ${error.message || 'Erro de conexão'}`, 'error');
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

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este lead permanentemente?')) return;
    
    try {
      await deleteDoc(doc(db, 'leads', leadId));
      if (selectedLead?.id === leadId) setSelectedLead(null);
      if (selectedLeadForProfile?.id === leadId) setSelectedLeadForProfile(null);
    } catch (error) {
      console.error('Erro ao excluir lead:', error);
      alert('Erro ao excluir lead.');
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
    <div className={`admin-panel min-h-screen flex h-screen lg:overflow-hidden ${isDarkMode ? 'dark bg-[#121212]' : 'bg-slate-50'}`}>
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 transition-transform duration-300 lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow-sm border border-slate-100">
              <img src="https://i.imgur.com/pgCrkrr.jpeg" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">Painel<br/>Administrativo</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-600">
            <XCircle size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${activeTab === 'dashboard' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>

          <button 
            onClick={() => { setActiveTab('chat'); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${activeTab === 'chat' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <MessageCircle size={18} />
            Chat
          </button>
          
          <button 
            onClick={() => { setActiveTab('calendario'); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${activeTab === 'calendario' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <Calendar size={18} />
            Calendário
          </button>
          
          <button 
            onClick={() => { setActiveTab('fluxos'); setIsSidebarOpen(false); }}
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
      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-500 hover:text-slate-700">
              <List size={24} />
            </button>
            <span className="font-bold text-slate-800 capitalize">
              {activeTab === 'calendario' ? 'Calendário' : activeTab}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-2">
              <button
                onClick={toggleNotifications}
                className={`p-2 rounded-xl transition-all ${
                  notificationsEnabled 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm shadow-emerald-100' 
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
                title={notificationsEnabled ? "Notificações Ativas" : "Ativar Notificações"}
              >
                <Bell size={18} className={notificationsEnabled ? 'animate-bounce' : ''} />
              </button>
              <button
                onClick={() => {
                  const newMode = !isDarkMode;
                  setIsDarkMode(newMode);
                  localStorage.setItem('adminDarkMode', String(newMode));
                }}
                className="p-2 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200 transition-all"
                title={isDarkMode ? "Mudar para tema claro" : "Mudar para tema escuro"}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200">
              <img src={user.photoURL || "https://i.imgur.com/pgCrkrr.jpeg"} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col flex-1 overflow-y-auto bg-slate-50/30 dark:bg-transparent">
            
            {/* Dashboard Header */}
            <div className="p-4 lg:p-6 shrink-0">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold text-slate-800">Dashboard</h2>
                  <p className="text-slate-500 text-xs lg:text-sm">Acompanhe o desempenho e a saúde do seu funil de vendas.</p>
                </div>
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start lg:self-auto">
                  <button 
                    onClick={() => setDashboardView('analytics')}
                    className={`flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${dashboardView === 'analytics' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <BarChart3 size={14} className="lg:w-4 lg:h-4" />
                    Analytics
                  </button>
                  <button 
                    onClick={() => setDashboardView('kanban')}
                    className={`flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${dashboardView === 'kanban' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Kanban size={14} className="lg:w-4 lg:h-4" />
                    Kanban
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 md:grid-cols-3 xl:grid-cols-6 gap-2 lg:gap-4">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-slate-200 rounded-2xl p-3 lg:p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2 lg:mb-3">
                    <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Users size={14} className="lg:w-4 lg:h-4" />
                    </div>
                  </div>
                  <span className="text-slate-500 text-[10px] lg:text-xs font-medium truncate block">Total Leads</span>
                  <div className="text-lg lg:text-2xl font-bold text-slate-800 mt-0.5 lg:mt-1">{leads.length}</div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white border border-slate-200 rounded-2xl p-3 lg:p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2 lg:mb-3">
                    <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                      <Activity size={14} className="lg:w-4 lg:h-4" />
                    </div>
                  </div>
                  <span className="text-slate-500 text-[10px] lg:text-xs font-medium truncate block">Atendimento</span>
                  <div className="text-lg lg:text-2xl font-bold text-slate-800 mt-0.5 lg:mt-1">{leads.filter(l => l.status === 'em_atendimento').length}</div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-white border border-slate-200 rounded-2xl p-3 lg:p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2 lg:mb-3">
                    <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      <TrendingUp size={14} className="lg:w-4 lg:h-4" />
                    </div>
                  </div>
                  <span className="text-slate-500 text-[10px] lg:text-xs font-medium truncate block">Qualificados</span>
                  <div className="text-lg lg:text-2xl font-bold text-slate-800 mt-0.5 lg:mt-1">{leads.filter(l => l.status === 'qualificado').length}</div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white border border-slate-200 rounded-2xl p-3 lg:p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2 lg:mb-3">
                    <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <CheckCircle size={14} className="lg:w-4 lg:h-4" />
                    </div>
                  </div>
                  <span className="text-slate-500 text-[10px] lg:text-xs font-medium truncate block">Fechados</span>
                  <div className="text-lg lg:text-2xl font-bold text-slate-800 mt-0.5 lg:mt-1">{leads.filter(l => l.status === 'fechado').length}</div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-white border border-slate-200 rounded-2xl p-3 lg:p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2 lg:mb-3">
                    <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                      <FileText size={14} className="lg:w-4 lg:h-4" />
                    </div>
                  </div>
                  <span className="text-slate-500 text-[10px] lg:text-xs font-medium truncate block">Assinados</span>
                  <div className="text-lg lg:text-2xl font-bold text-slate-800 mt-0.5 lg:mt-1">{leads.filter(l => l.contractStatus === 'signed').length}</div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white border border-slate-200 rounded-2xl p-3 lg:p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2 lg:mb-3">
                    <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600">
                      <Clock size={14} className="lg:w-4 lg:h-4" />
                    </div>
                  </div>
                  <span className="text-slate-500 text-[10px] lg:text-xs font-medium truncate block">Conversão</span>
                  <div className="text-lg lg:text-2xl font-bold text-slate-800 mt-0.5 lg:mt-1">
                    {leads.length > 0 ? ((leads.filter(l => l.status === 'fechado').length / leads.length) * 100).toFixed(1) : 0}%
                  </div>
                </motion.div>
              </div>
            </div>

            {/* View Content */}
            <div className="p-4 lg:p-6 pt-0 lg:pt-0">
              {dashboardView === 'analytics' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                  {/* Status Distribution Chart */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 lg:p-6 shadow-sm"
                  >
                    <h3 className="font-bold text-slate-800 mb-4 lg:mb-6 flex items-center gap-2 text-sm lg:text-base">
                      <PieChart size={18} className="text-indigo-500" />
                      Distribuição por Status
                    </h3>
                    <div className="h-[250px] lg:h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={getStatusData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {getStatusData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                          <Legend verticalAlign="bottom" height={36}/>
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>

                  {/* Growth Chart */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 lg:p-6 shadow-sm"
                  >
                    <h3 className="font-bold text-slate-800 mb-4 lg:mb-6 flex items-center gap-2 text-sm lg:text-base">
                      <TrendingUp size={18} className="text-indigo-500" />
                      Novos Leads (Últimos 7 dias)
                    </h3>
                    <div className="h-[250px] lg:h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={getTimelineData()}>
                          <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#6366f1" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorCount)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>

                  {/* Recent Activity / Bento Style */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6"
                  >
                    {/* Recent Leads List */}
                    <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 lg:p-6 shadow-sm">
                      <div className="flex justify-between items-center mb-4 lg:mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm lg:text-base">
                          <Clock size={16} className="text-indigo-500 lg:w-[18px] lg:h-[18px]" />
                          Leads Recentes
                        </h3>
                        <button 
                          onClick={() => setActiveTab('chat')}
                          className="text-[10px] lg:text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                          Ver todos <ArrowRight size={10} className="lg:w-3 lg:h-3" />
                        </button>
                      </div>
                      <div className="space-y-2 lg:space-y-4">
                        {leads.slice(0, 5).map(lead => (
                          <div 
                            key={lead.id}
                            onClick={() => setSelectedLeadForProfile(lead)}
                            className="flex items-center justify-between p-2 lg:p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-2 lg:gap-3">
                              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                <User size={16} className="lg:w-[18px] lg:h-[18px]" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 text-xs lg:text-sm">{lead.nome}</div>
                                <div className="text-[10px] lg:text-xs text-slate-400 truncate max-w-[100px] lg:max-w-none">{lead.cidade || 'Cidade não informada'}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 lg:gap-3">
                              <span className={`text-[9px] lg:text-[10px] font-bold px-1.5 py-0.5 lg:px-2 lg:py-1 rounded-full uppercase tracking-wider ${
                                lead.status === 'novo' ? 'bg-blue-50 text-blue-600' :
                                lead.status === 'qualificado' ? 'bg-green-50 text-green-600' :
                                'bg-slate-50 text-slate-500'
                              }`}>
                                {lead.status}
                              </span>
                              <ChevronRight size={12} className="text-slate-300 group-hover:text-indigo-400 transition-colors lg:w-3.5 lg:h-3.5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Insights */}
                    <div className="grid grid-cols-2 md:flex md:flex-col gap-3 lg:gap-4">
                      <div className="bg-indigo-600 rounded-2xl p-4 lg:p-6 text-white shadow-lg shadow-indigo-200 flex flex-col justify-between flex-1 min-h-[120px] lg:min-h-0">
                        <TrendingUp size={20} className="mb-2 lg:mb-4 opacity-80 lg:w-6 lg:h-6" />
                        <div>
                          <div className="text-indigo-100 text-[10px] lg:text-sm font-medium">Crescimento</div>
                          <div className="text-lg lg:text-2xl font-bold mt-0.5 lg:mt-1">{getGrowthData()}</div>
                          <div className="text-indigo-200 text-[9px] lg:text-[10px] mt-1 lg:mt-2">Leads este mês</div>
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 lg:p-6 shadow-sm flex flex-col justify-between flex-1 min-h-[120px] lg:min-h-0">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2 lg:mb-4">
                          <Clock size={16} className="lg:w-5 lg:h-5" />
                        </div>
                        <div>
                          <div className="text-slate-500 text-[10px] lg:text-sm font-medium">Resposta</div>
                          <div className="text-lg lg:text-2xl font-bold text-slate-800 mt-0.5 lg:mt-1">2.4 min</div>
                          <div className="text-slate-400 text-[9px] lg:text-[10px] mt-1 lg:mt-2">Média da Alice</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              ) : (
                /* Kanban View (Dashboard) */
                <div className="flex gap-6 h-full min-w-max pb-4">
                  {[
                    { id: 'novo', title: 'Novos', color: 'bg-blue-50 text-blue-700 border-blue-100' },
                    { id: 'em_atendimento', title: 'Em Atendimento', color: 'bg-amber-50 text-amber-700 border-amber-100' },
                    { id: 'qualificado', title: 'Qualificados', color: 'bg-green-50 text-green-700 border-green-100' },
                    { id: 'dados_coletados', title: 'Dados Coletados', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                    { id: 'contrato_enviado', title: 'Contrato Enviado', color: 'bg-purple-50 text-purple-700 border-purple-100' },
                    { id: 'fechado', title: 'Fechados', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                    { id: 'descartado', title: 'Descartados', color: 'bg-slate-50 text-slate-700 border-slate-100' },
                  ].map(col => (
                    <div 
                      key={col.id} 
                      className="w-80 flex flex-col bg-slate-100/30 rounded-2xl border border-slate-200/60"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedLeadId) {
                          updateLeadStatus(draggedLeadId, col.id);
                          setDraggedLeadId(null);
                        }
                      }}
                    >
                      <div className={`p-4 m-3 rounded-xl border font-bold text-sm flex justify-between items-center shadow-sm ${col.color}`}>
                        {col.title}
                        <span className="bg-white/80 px-2 py-0.5 rounded-full text-[10px]">
                          {leads.filter(l => l.status === col.id).length}
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 pt-0 space-y-3">
                        {leads.filter(l => l.status === col.id).map(lead => (
                          <motion.div 
                            key={lead.id} 
                            layoutId={lead.id}
                            draggable
                            onDragStart={() => setDraggedLeadId(lead.id)}
                            onDragEnd={() => setDraggedLeadId(null)}
                            onClick={() => setSelectedLeadForProfile(lead)}
                            className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group ${draggedLeadId === lead.id ? 'opacity-50 scale-95' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-bold text-slate-800 truncate pr-2 group-hover:text-indigo-600 transition-colors">{lead.nome}</div>
                              {lead.aiEnabled !== false ? (
                                <span title="IA Ativa" className="p-1 bg-indigo-50 rounded-lg"><Bot size={12} className="text-indigo-500 shrink-0" /></span>
                              ) : (
                                <span title="Atendimento Humano" className="p-1 bg-slate-50 rounded-lg"><User size={12} className="text-slate-400 shrink-0" /></span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mb-3 flex items-center gap-1.5">
                              <Phone size={10} className="text-slate-300" /> {lead.telefone}
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock size={10} />
                                {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLead(lead);
                                  setActiveTab('chat');
                                }}
                                className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                              >
                                <MessageCircle size={14} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="flex flex-1 overflow-hidden bg-slate-50 p-0 lg:p-6 gap-0 lg:gap-6 relative">
            {/* Leads List (Compact) */}
            <div className={`
              w-full lg:w-80 bg-white border-r lg:border border-slate-200 lg:rounded-2xl flex flex-col shrink-0 shadow-sm overflow-hidden transition-transform duration-300
              ${selectedLead ? 'hidden lg:flex' : 'flex'}
            `}>
              <div className="p-4 lg:p-5 border-b border-slate-100">
                <h2 className="font-bold text-slate-800 text-lg mb-4">Conversas</h2>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
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
            <div className={`
              flex-1 flex bg-white border-none lg:border border-slate-200 lg:rounded-2xl shadow-sm overflow-hidden
              ${!selectedLead ? 'hidden lg:flex' : 'flex'}
            `}>
              {selectedLead ? (
                <>
                  {/* Chat Area */}
                  <div className="flex-1 flex flex-col border-r border-slate-100 min-w-0">
                    <div className="p-3 lg:p-4 border-b border-slate-100 bg-white shrink-0 flex justify-between items-center z-10">
                      <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                        <button onClick={() => setSelectedLead(null)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700">
                          <ChevronLeft size={20} />
                        </button>
                        <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                          <User size={18} />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-sm lg:text-base font-bold text-slate-800 leading-tight truncate">{selectedLead.nome}</h2>
                          <p className="text-[10px] lg:text-xs text-slate-500 truncate">
                            {selectedLead.telefone}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 lg:gap-4">
                        <button 
                          onClick={() => toggleAI(selectedLead.id, selectedLead.aiEnabled)}
                          className={`flex items-center gap-1.5 px-2 py-1 lg:px-3 lg:py-1.5 rounded-full text-[10px] lg:text-xs font-bold transition-colors ${selectedLead.aiEnabled !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          title={selectedLead.aiEnabled !== false ? "Desativar IA e assumir atendimento" : "Reativar atendimento por IA"}
                        >
                          {selectedLead.aiEnabled !== false ? <><Bot size={12} className="lg:w-3.5 lg:h-3.5" /> <span className="hidden sm:inline">IA Ativa</span></> : <><User size={12} className="lg:w-3.5 lg:h-3.5" /> <span className="hidden sm:inline">Humano</span></>}
                        </button>
                        <button className="text-slate-400 hover:text-slate-600 transition-colors hidden sm:block">
                          <Phone size={18} />
                        </button>
                        <button className="text-slate-400 hover:text-slate-600 transition-colors">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 lg:p-6 flex flex-col gap-3 lg:gap-4 bg-white">
                      {messages.length === 0 ? (
                        <div className="text-center text-slate-400 my-auto text-sm">
                          Nenhuma mensagem registrada.
                        </div>
                      ) : (
                        messages.map(msg => (
                          msg.sender === 'system' ? (
                            <div key={msg.id} className="self-center bg-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border border-slate-200 my-2">
                              {msg.text}
                            </div>
                          ) : (
                            <div 
                              key={msg.id} 
                              className={`max-w-[85%] lg:max-w-[75%] flex gap-2 lg:gap-3 ${
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
                                  {msg.fileUrl && (
                                    <div className="mb-3 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                                      {msg.fileType === 'image' ? (
                                        <div className="relative group">
                                          <img src={msg.fileUrl} alt="Imagem" className="max-w-full h-auto block" referrerPolicy="no-referrer" />
                                          <a 
                                            href={msg.fileUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                            title="Baixar Imagem"
                                          >
                                            <Download size={16} className="text-slate-700" />
                                          </a>
                                        </div>
                                      ) : msg.fileType === 'video' ? (
                                        <video src={msg.fileUrl} controls className="max-w-full h-auto block" />
                                      ) : msg.fileType === 'audio' ? (
                                        <audio src={msg.fileUrl} controls className="w-full p-2" />
                                      ) : (
                                        <div className="p-4 flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                            <FileText size={20} />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-700 truncate">{msg.fileName || 'Arquivo'}</p>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{msg.fileType || 'Documento'}</p>
                                          </div>
                                          <a 
                                            href={msg.fileUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                                            title="Baixar Arquivo"
                                          >
                                            <Download size={18} />
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
                                </div>
                                <span className={`text-[10px] text-slate-400 ${msg.sender === 'user' ? 'text-left ml-1' : 'text-right mr-1'}`}>
                                  {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          )
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 lg:p-4 bg-white border-t border-slate-100 shrink-0">
                      <form onSubmit={sendMessage} className="flex items-center gap-2 lg:gap-3">
                        <button 
                          type="button" 
                          className="w-10 h-10 lg:w-11 lg:h-11 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all shrink-0"
                          title="Anexar arquivo (Em breve)"
                          onClick={() => showToast("O envio de arquivos pelo painel será liberado em breve. Por enquanto, você pode receber arquivos dos clientes.", "success")}
                        >
                          <Paperclip size={18} className="lg:w-5 lg:h-5" />
                        </button>
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Digite sua mensagem..."
                          className="flex-1 px-4 py-2.5 lg:px-5 lg:py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm transition-all"
                        />
                        <button 
                          type="submit"
                          disabled={!newMessage.trim()}
                          className="w-10 h-10 lg:w-11 lg:h-11 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 shrink-0 shadow-lg shadow-indigo-100"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5 lg:w-[18px] lg:h-[18px]"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Right Sidebar: Lead Details */}
                  <div className="hidden lg:flex w-80 bg-white flex-col shrink-0 overflow-y-auto border-l border-slate-100 shadow-xl z-10">
                    <div className="p-6">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                          <User size={32} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-800 text-xl truncate">{selectedLead.nome}</h3>
                          <p className="text-slate-400 text-xs flex items-center gap-1 mt-1">
                            <MapPin size={12} /> {selectedLead.cidade || 'Localização não informada'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="mb-8">
                        <span className="block text-slate-400 text-[9px] uppercase font-bold mb-2 tracking-wider">Status do Atendimento</span>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
                          selectedLead.status === 'novo' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          selectedLead.status === 'em_atendimento' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          selectedLead.status === 'qualificado' ? 'bg-green-50 text-green-600 border-green-100' :
                          selectedLead.status === 'fechado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          'bg-slate-50 text-slate-500 border-slate-100'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            selectedLead.status === 'novo' ? 'bg-blue-500' :
                            selectedLead.status === 'em_atendimento' ? 'bg-amber-500' :
                            selectedLead.status === 'qualificado' ? 'bg-green-500' :
                            selectedLead.status === 'fechado' ? 'bg-emerald-500' :
                            'bg-slate-400'
                          }`} />
                          {selectedLead.status.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-1 gap-2 mb-8">
                        <span className="block text-slate-400 text-[9px] uppercase font-bold mb-2 tracking-wider">Ações Rápidas</span>
                        <button 
                          onClick={() => updateLeadStatus(selectedLead.id, 'em_atendimento')}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedLead.status === 'em_atendimento' ? 'bg-amber-500 text-white shadow-lg shadow-amber-100' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                        >
                          <Clock size={18} /> Em Atendimento
                        </button>
                        <button 
                          onClick={() => updateLeadStatus(selectedLead.id, 'qualificado')}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedLead.status === 'qualificado' ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                        >
                          <CheckCircle size={18} /> Qualificar Lead
                        </button>
                        <button 
                          onClick={() => updateLeadStatus(selectedLead.id, 'fechado')}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedLead.status === 'fechado' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                        >
                          <TrendingUp size={18} /> Fechar Contrato
                        </button>
                        
                        {!selectedLead.contractUrl && selectedLead.email && (
                          <button 
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/create-contract', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    leadId: selectedLead.id,
                                    name: selectedLead.nome,
                                    email: selectedLead.email
                                  })
                                });
                                const data = await res.json();
                                if (data.success) {
                                  showToast("Contrato gerado com sucesso!");
                                } else {
                                  showToast("Erro ao gerar contrato: " + data.error, 'error');
                                }
                              } catch (e) {
                                showToast("Erro ao gerar contrato.", 'error');
                              }
                            }}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 transition-all"
                          >
                            <FileText size={18} /> Gerar Contrato ZapSign
                          </button>
                        )}
                        
                        <button 
                          onClick={() => updateLeadStatus(selectedLead.id, 'descartado')}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedLead.status === 'descartado' ? 'bg-red-500 text-white shadow-lg shadow-red-100' : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-100'}`}
                        >
                          <XCircle size={18} /> Descartar Lead
                        </button>

                        <button 
                          onClick={() => handleDeleteLead(selectedLead.id)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all bg-white text-slate-400 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-100"
                        >
                          <Trash2 size={18} /> Excluir Lead
                        </button>
                      </div>

                      {/* Details Grid */}
                      <div className="space-y-4">
                        <span className="block text-slate-400 text-[9px] uppercase font-bold mb-2 tracking-wider">Informações Coletadas</span>
                        
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-500 shadow-sm">
                              <PieChart size={16} />
                            </div>
                            <div>
                              <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider">Previdência</span>
                              <span className="font-bold text-slate-700 text-sm capitalize">{selectedLead.aposentadoriaComplementar || '-'}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                              <Calendar size={16} />
                            </div>
                            <div>
                              <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider">Contribuiu 89-95</span>
                              <span className="font-bold text-slate-700 text-sm capitalize">{selectedLead.contribuicao89a95 || '-'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-amber-500 shadow-sm">
                              <Activity size={16} />
                            </div>
                            <div>
                              <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider">Paga IR</span>
                              <span className="font-bold text-slate-700 text-sm capitalize">{selectedLead.pagaIrAtualmente || '-'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
                              <Mail size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider">Email</span>
                              <span className="font-medium text-slate-700 text-xs break-all">{selectedLead.email || '-'}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
                              <Phone size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider">Telefone</span>
                              <span className="font-medium text-slate-700 text-xs">{selectedLead.telefone || '-'}</span>
                            </div>
                          </div>
                        </div>

                        {selectedLead.contractUrl && (
                          <div className="bg-emerald-600 p-5 rounded-2xl text-white shadow-lg shadow-emerald-100">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                <FileText size={20} />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm">Contrato ZapSign</h4>
                                <p className="text-[10px] opacity-80 uppercase tracking-widest">
                                  {selectedLead.contractStatus === 'signed' ? '✅ Assinado' : '⏳ Pendente'}
                                </p>
                              </div>
                            </div>
                            <a 
                              href={selectedLead.contractUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block w-full py-2.5 bg-white text-emerald-700 text-center rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors"
                            >
                              Ver Documento
                            </a>
                          </div>
                        )}
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
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50">
            <div className="max-w-6xl mx-auto">
              
              {flowView === 'list' ? (
                <div className="animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setActiveTab('dashboard')}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <div>
                        <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-1">Configurações do Robô</h2>
                        <p className="text-sm lg:text-base text-slate-600">Gerencie a inteligência artificial, regras de follow-up e mídias.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex border-b border-slate-200 mb-8">
                    <button 
                      onClick={() => setConfigTab('prompts')}
                      className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${configTab === 'prompts' ? 'border-amber-400 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      Prompts da IA
                    </button>
                    <button 
                      onClick={() => setConfigTab('followups')}
                      className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${configTab === 'followups' ? 'border-amber-400 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      Temporizadores (Follow-ups)
                    </button>
                    <button 
                      onClick={() => setConfigTab('videos')}
                      className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${configTab === 'videos' ? 'border-amber-400 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      Vídeos e Mídias
                    </button>
                  </div>

                  {configTab === 'prompts' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Existing Flow Card */}
                      <div 
                        onClick={() => setFlowView('editor')}
                        className="flex flex-col p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all group h-72 relative"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2">Qualificação e Agendamento - Resguarde</h3>
                          <button className="text-slate-400 hover:text-slate-600 p-1">
                            <MoreVertical size={20} />
                          </button>
                        </div>
                        <p className="text-xs font-medium text-slate-500 mb-4">Gatilho: Início de conversa com novo lead</p>
                        
                        <p className="text-sm text-slate-600 mb-auto line-clamp-4">
                          Você é um assistente comercial da Resguarde Imunização. Seu objetivo é qualificar leads e levá-los ao agendamento de reunião. REGRAS DE COMPORTAMENTO: - Faça apenas UMA pergunta por vez. - Mantenha...
                        </p>
                        
                        <div className="pt-4 mt-4 border-t border-slate-100 flex items-end justify-between">
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-100">
                            <Play size={12} fill="currentColor" /> Ativo
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-800">0 disparos</p>
                            <p className="text-xs text-slate-500">Último: Nunca</p>
                          </div>
                        </div>
                      </div>

                      {/* Create New Flow Card */}
                      <button 
                        onClick={() => setFlowView('editor')}
                        className="flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl hover:bg-slate-100 hover:border-indigo-400 transition-all group h-72"
                      >
                        <div className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:border-indigo-300 transition-all mb-4">
                          <Plus size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 group-hover:text-indigo-700 mb-1 transition-colors">Criar Novo Fluxo</h3>
                        <p className="text-sm text-slate-500 text-center">
                          Adicione novas instruções para a IA seguir
                        </p>
                      </button>
                    </div>
                  )}

                  {configTab === 'followups' && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
                      <Clock size={48} className="mx-auto mb-4 text-slate-300" />
                      <h3 className="text-lg font-bold text-slate-700 mb-2">Temporizadores (Em Breve)</h3>
                      <p className="text-sm text-slate-500 max-w-md mx-auto">
                        Configure regras de follow-up automático para leads que pararam de responder.
                      </p>
                    </div>
                  )}

                  {configTab === 'videos' && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Biblioteca de Vídeos</h3>
                        <p className="text-sm text-slate-500">Faça upload de vídeos explicativos para a IA enviar automaticamente aos clientes.</p>
                      </div>
                      
                      <div className="p-6">
                        {/* Upload Section */}
                        <div className="mb-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center">
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept="video/*,image/*,audio/*"
                            className="hidden"
                          />
                          
                          {uploadingVideo ? (
                            <div className="max-w-xs mx-auto">
                              <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                                <span>Enviando arquivo...</span>
                                <span>{Math.round(uploadProgress)}%</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                <div 
                                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                                  style={{ width: `${uploadProgress}%` }}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                                <Video size={24} />
                              </div>
                              <h3 className="text-lg font-bold text-slate-700 mb-2">Envio de Vídeos Nativos</h3>
                              <p className="text-sm text-slate-500 mb-6 max-w-lg">
                                Você pode cadastrar vídeos curtos (ex: "Como funciona a tese", "O escritório é confiável?") e a IA enviará o vídeo nativamente no WhatsApp quando o cliente perguntar.
                              </p>
                              <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2.5 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2"
                              >
                                Fazer Upload de Mídia
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Media Library */}
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Arquivos Disponíveis</h3>
                          
                          {videosList.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                              Nenhuma mídia enviada ainda.
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                              {videosList.map((video) => (
                                <div key={video.id} className="border border-slate-200 rounded-xl overflow-hidden group hover:border-indigo-300 transition-all cursor-pointer">
                                  <div className="aspect-video bg-slate-100 flex items-center justify-center relative">
                                    {video.type.startsWith('video/') ? (
                                      <Video size={32} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                    ) : video.type.startsWith('image/') ? (
                                      <Image size={32} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                    ) : (
                                      <Music size={32} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                    )}
                                  </div>
                                  <div className="p-3 bg-white">
                                    <p className="text-xs font-bold text-slate-700 truncate" title={video.name}>{video.name}</p>
                                    <p className="text-[10px] text-slate-500 mt-1">
                                      {video.createdAt ? new Date(video.createdAt.toDate()).toLocaleDateString('pt-BR') : 'Agora'} • {(video.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col">
                  <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-[600px]">
                    {/* Header */}
                    <div className="p-4 lg:p-6 border-b border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                          <Bot size={24} />
                        </div>
                        <div>
                          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">Qualificação e Agendamento - Resguarde</h2>
                          <p className="text-xs lg:text-sm font-medium text-slate-500">Gatilho: Início de conversa com novo lead</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
                          <button 
                            onClick={() => setPromptsSubTab('visual')}
                            className={`px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap ${promptsSubTab === 'visual' ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-800'}`}
                          >
                            Workflow
                          </button>
                          <button 
                            onClick={() => setPromptsSubTab('simulator')}
                            className={`px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap ${promptsSubTab === 'simulator' ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-800'}`}
                          >
                            Simulador
                          </button>
                          <button 
                            onClick={() => setPromptsSubTab('edit')}
                            className={`px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap ${promptsSubTab === 'edit' ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-800'}`}
                          >
                            Editar
                          </button>
                        </div>
                        <button 
                          onClick={() => setFlowView('list')} 
                          className="hidden sm:flex p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors shrink-0"
                        >
                          <X size={24} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50">
                      {promptsSubTab === 'visual' && (
                        <>
                          {/* Left Side: Workflow */}
                          <div className="flex-1 overflow-y-auto p-4 lg:p-8 relative">
                            <div className="max-w-3xl mx-auto relative pl-8">
                              {/* Vertical Timeline Line */}
                              <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-slate-200"></div>

                              {/* Step 1 */}
                              <div className="relative mb-8">
                                <div className="absolute -left-[21px] top-6 w-4 h-4 rounded-full bg-indigo-600 border-4 border-slate-50 shadow-sm z-10"></div>
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                  <div className="px-6 py-5">
                                    <h3 className="font-bold text-indigo-900 text-lg mb-4">
                                      1. Boas-vindas e Alice
                                    </h3>
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                      <p className="text-sm text-blue-800 italic font-medium">
                                        "Olá! Que bom ter você aqui! Meu nome é Alice..."
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Step 2 */}
                              <div className="relative mb-8">
                                <div className="absolute -left-[21px] top-6 w-4 h-4 rounded-full bg-indigo-600 border-4 border-slate-50 shadow-sm z-10"></div>
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                  <div className="px-6 py-5">
                                    <h3 className="font-bold text-indigo-900 text-lg mb-4">
                                      2. Triagem (3 Requisitos)
                                    </h3>
                                    <div className="space-y-3">
                                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-3 items-start">
                                        <ArrowRight size={16} className="text-slate-400 mt-0.5 shrink-0" />
                                        <p className="text-sm text-slate-600">
                                          Q1: Previdência Complementar (Não INSS)
                                        </p>
                                      </div>
                                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-3 items-start">
                                        <ArrowRight size={16} className="text-slate-400 mt-0.5 shrink-0" />
                                        <p className="text-sm text-slate-600">
                                          Q2: Período de Contribuição (1989-1995)
                                        </p>
                                      </div>
                                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-3 items-start">
                                        <ArrowRight size={16} className="text-slate-400 mt-0.5 shrink-0" />
                                        <p className="text-sm text-slate-600">
                                          Q3: Retenção Atual de IR
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Step 3 */}
                              <div className="relative mb-8">
                                <div className="absolute -left-[21px] top-6 w-4 h-4 rounded-full bg-indigo-600 border-4 border-slate-50 shadow-sm z-10"></div>
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                  <div className="px-6 py-5">
                                    <h3 className="font-bold text-indigo-900 text-lg mb-4">
                                      3. Validação e Dados
                                    </h3>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                      <p className="text-sm text-slate-600 italic">
                                        Explicação da tese e coleta de Nome, Cidade, Fundo e E-mail.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Step 4 */}
                              <div className="relative mb-8">
                                <div className="absolute -left-[21px] top-6 w-4 h-4 rounded-full bg-indigo-600 border-4 border-slate-50 shadow-sm z-10"></div>
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                  <div className="px-6 py-5">
                                    <h3 className="font-bold text-indigo-900 text-lg mb-4">
                                      4. Solicitação de Documentos
                                    </h3>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                      <p className="text-sm text-slate-600 italic">
                                        Pedido de RG, Comprovante de Residência, Contracheque e IR.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right Side: Guia Rápido */}
                          <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 p-6 overflow-y-auto shrink-0">
                            <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-sm">
                              <Sparkles size={16} className="text-slate-400" />
                              Guia Rápido de Etapas
                            </h4>
                            <div className="space-y-4">
                              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
                                  <h5 className="text-sm font-bold text-blue-900">Triagem</h5>
                                </div>
                                <p className="text-xs text-blue-700/80 leading-relaxed">
                                  Entenda rapidamente o que o cliente busca e se faz sentido para o negócio.
                                </p>
                              </div>
                              
                              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center text-xs font-bold">2</span>
                                  <h5 className="text-sm font-bold text-purple-900">Qualificação</h5>
                                </div>
                                <p className="text-xs text-purple-700/80 leading-relaxed">
                                  Faça perguntas chave para entender o perfil e as necessidades reais.
                                </p>
                              </div>
                              
                              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center text-xs font-bold">3</span>
                                  <h5 className="text-sm font-bold text-amber-900">Documentos</h5>
                                </div>
                                <p className="text-xs text-amber-700/80 leading-relaxed">
                                  Solicite informações ou documentos necessários para avançar.
                                </p>
                              </div>
                              
                              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center text-xs font-bold">4</span>
                                  <h5 className="text-sm font-bold text-emerald-900">Fechamento</h5>
                                </div>
                                <p className="text-xs text-emerald-700/80 leading-relaxed">
                                  Conduza para o agendamento, venda ou próximo passo concreto.
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {promptsSubTab === 'simulator' && (
                        <div className="flex-1 overflow-hidden">
                          <FlowSimulator prompts={prompts} />
                        </div>
                      )}

                      {promptsSubTab === 'edit' && (
                        <div className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-8 bg-slate-50 dark:bg-slate-900">
                          {useAdvancedEditor ? (
                            <div className="h-full min-h-[600px] flex flex-col">
                              <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-slate-800">Editor Avançado (Nós)</h2>
                                <button 
                                  onClick={() => setUseAdvancedEditor(false)}
                                  className="px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors rounded-xl border border-indigo-100 bg-white"
                                >
                                  Voltar para Editor Simples
                                </button>
                              </div>
                              <PromptsFlow 
                                prompts={prompts}
                                setPrompts={setPrompts}
                                onSave={handleSavePrompt}
                                saving={savingPrompt}
                                saved={promptSaved}
                                expertPrompt={EXPERT_PROMPT}
                              />
                            </div>
                          ) : (
                            <SimplePromptEditor 
                              prompts={prompts}
                              setPrompts={setPrompts}
                              onSave={handleSavePrompt}
                              saving={savingPrompt}
                              saved={promptSaved}
                              onToggleAdvanced={() => setUseAdvancedEditor(true)}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </main>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-lg z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Lead Profile Modal */}
      <AnimatePresence>
        {selectedLeadForProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 lg:p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-base lg:text-xl">
                    {selectedLeadForProfile.nome.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg lg:text-2xl font-bold text-slate-800 leading-tight">{selectedLeadForProfile.nome}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 lg:mt-1">
                      <span className="text-[10px] lg:text-xs text-slate-500 flex items-center gap-1">
                        <Phone size={10} className="lg:w-3 lg:h-3" /> {selectedLeadForProfile.telefone}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[8px] lg:text-[10px] font-bold uppercase tracking-wider ${
                        selectedLeadForProfile.status === 'novo' ? 'bg-blue-100 text-blue-600' :
                        selectedLeadForProfile.status === 'qualificado' ? 'bg-emerald-100 text-emerald-600' :
                        selectedLeadForProfile.status === 'fechado' ? 'bg-amber-100 text-amber-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {selectedLeadForProfile.status}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedLeadForProfile(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X size={20} className="lg:w-6 lg:h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50/50">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                  {/* Left Column: Quick Actions & Main Info */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Ações Rápidas</h4>
                      <div className="space-y-2">
                        <button 
                          onClick={() => {
                            setSelectedLead(selectedLeadForProfile);
                            setActiveTab('chat');
                            setSelectedLeadForProfile(null);
                          }}
                          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 lg:py-3 rounded-xl font-bold text-xs lg:text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                        >
                          <MessageCircle size={16} /> Abrir Chat
                        </button>
                        <button 
                          className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 py-2.5 lg:py-3 rounded-xl font-bold text-xs lg:text-sm hover:bg-slate-50 transition-all"
                        >
                          <Calendar size={16} /> Agendar Reunião
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Atendimento</h4>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Bot size={16} className="text-indigo-500" />
                          <span className="text-xs lg:text-sm font-medium text-slate-700">Automação IA</span>
                        </div>
                        <div className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${selectedLeadForProfile.aiEnabled !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}
                             onClick={() => toggleAI(selectedLeadForProfile.id, selectedLeadForProfile.aiEnabled)}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${selectedLeadForProfile.aiEnabled !== false ? 'left-5' : 'left-1'}`}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Detailed Info */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-4 lg:p-8 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-sm lg:text-lg font-bold text-slate-800 mb-4 lg:mb-6 flex items-center gap-2">
                        <FileText size={18} className="text-indigo-500 lg:w-5 lg:h-5" />
                        Informações Coletadas
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aposentadoria Complementar</span>
                          <p className="text-xs lg:text-sm text-slate-700 font-medium">{selectedLeadForProfile.aposentadoriaComplementar || 'Não informado'}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contribuição 89-95</span>
                          <p className="text-xs lg:text-sm text-slate-700 font-medium">{selectedLeadForProfile.contribuicao89a95 || 'Não informado'}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paga IR Atualmente</span>
                          <p className="text-xs lg:text-sm text-slate-700 font-medium">{selectedLeadForProfile.pagaIrAtualmente || 'Não informado'}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fundo de Previdência</span>
                          <p className="text-xs lg:text-sm text-slate-700 font-medium">{selectedLeadForProfile.fundoPrevidencia || 'Não informado'}</p>
                        </div>
                      </div>

                      <div className="mt-6 lg:mt-8 pt-6 lg:pt-8 border-t border-slate-100">
                        <h5 className="text-xs lg:text-sm font-bold text-slate-800 mb-4">Documentação e Contrato</h5>
                        {selectedLeadForProfile.contractUrl ? (
                          <div className="bg-emerald-50 border border-emerald-100 p-3 lg:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <FileText size={20} />
                              </div>
                              <div>
                                <div className="text-xs lg:text-sm font-bold text-emerald-900">Contrato ZapSign</div>
                                <div className="text-[10px] lg:text-xs text-emerald-600 uppercase font-bold tracking-tighter">
                                  {selectedLeadForProfile.contractStatus === 'signed' ? '✅ Assinado' : '⏳ Pendente de Assinatura'}
                                </div>
                              </div>
                            </div>
                            <a 
                              href={selectedLeadForProfile.contractUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-[10px] lg:text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                            >
                              Ver Documento <ExternalLink size={14} />
                            </a>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-dashed border-slate-300 p-4 lg:p-6 rounded-xl text-center">
                            <p className="text-slate-400 text-[10px] lg:text-sm">Nenhum contrato gerado para este lead.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timeline / History */}
                    <div className="bg-white p-4 lg:p-8 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-sm lg:text-lg font-bold text-slate-800 mb-4 lg:mb-6 flex items-center gap-2">
                        <Activity size={18} className="text-indigo-500 lg:w-5 lg:h-5" />
                        Histórico de Atividades
                      </h4>
                      <div className="space-y-4 lg:space-y-6">
                        <div className="flex gap-3 lg:gap-4">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                          <div>
                            <p className="text-xs lg:text-sm font-bold text-slate-800">Lead criado no sistema</p>
                            <p className="text-[10px] lg:text-xs text-slate-400">{new Date(selectedLeadForProfile.createdAt).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                        {selectedLeadForProfile.updatedAt && (
                          <div className="flex gap-3 lg:gap-4">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                            <div>
                              <p className="text-xs lg:text-sm font-bold text-slate-800">Última atualização de status</p>
                              <p className="text-[10px] lg:text-xs text-slate-400">{new Date(selectedLeadForProfile.updatedAt).toLocaleString('pt-BR')}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-100">
                        <button 
                          onClick={() => handleDeleteLead(selectedLeadForProfile.id)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={18} /> Excluir Lead Permanentemente
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Upload Modal */}
      <AnimatePresence>
        {isVideoModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 lg:p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="text-lg lg:text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Video className="text-indigo-600" size={24} />
                  Biblioteca de Mídias
                </h2>
                <button 
                  onClick={() => setIsVideoModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4 lg:p-6 flex-1 overflow-y-auto">
                {/* Upload Section */}
                <div className="mb-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="video/*,image/*,audio/*"
                    className="hidden"
                  />
                  
                  {uploadingVideo ? (
                    <div className="max-w-xs mx-auto">
                      <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                        <span>Enviando arquivo...</span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                        <Upload size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-700 mb-2">Fazer Upload de Mídia</h3>
                      <p className="text-sm text-slate-500 mb-6 max-w-sm">
                        Selecione um vídeo, imagem ou áudio para usar em seus fluxos de conversa.
                      </p>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2"
                      >
                        <Plus size={18} />
                        Selecionar Arquivo
                      </button>
                    </div>
                  )}
                </div>

                {/* Media Library */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Arquivos Disponíveis</h3>
                  
                  {videosList.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                      Nenhuma mídia enviada ainda.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {videosList.map((video) => (
                        <div key={video.id} className="border border-slate-200 rounded-xl overflow-hidden group hover:border-indigo-300 transition-all cursor-pointer">
                          <div className="aspect-video bg-slate-100 flex items-center justify-center relative">
                            {video.type.startsWith('video/') ? (
                              <Video size={32} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            ) : video.type.startsWith('image/') ? (
                              <Image size={32} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            ) : (
                              <Music size={32} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            )}
                            <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-all flex items-center justify-center">
                              <button 
                                onClick={() => {
                                  // In a real app, this would insert the video into the flow
                                  showToast('Mídia selecionada para o fluxo!', 'success');
                                  setIsVideoModalOpen(false);
                                }}
                                className="opacity-0 group-hover:opacity-100 bg-white text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all"
                              >
                                Selecionar
                              </button>
                            </div>
                          </div>
                          <div className="p-3 bg-white">
                            <p className="text-xs font-bold text-slate-700 truncate" title={video.name}>{video.name}</p>
                            <p className="text-[10px] text-slate-500 mt-1">
                              {video.createdAt ? new Date(video.createdAt.toDate()).toLocaleDateString('pt-BR') : 'Agora'} • {(video.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
