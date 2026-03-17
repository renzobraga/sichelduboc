import React, { useState } from 'react';
import { Scale, FileText, CheckCircle2, AlertCircle, ChevronRight, Phone, Mail, MapPin, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  
  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    cidade: '',
    estado: '',
    aposentadoriaComplementar: '',
    contribuicao89a95: '',
    pagaIrAtualmente: ''
  });

  const isEligible = 
    formData.aposentadoriaComplementar === 'sim' && 
    formData.contribuicao89a95 === 'sim' && 
    formData.pagaIrAtualmente === 'sim';

  const showEligibilityMessage = 
    formData.aposentadoriaComplementar !== '' && 
    formData.contribuicao89a95 !== '' && 
    formData.pagaIrAtualmente !== '';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'telefone') {
      let v = value.replace(/\D/g, '');
      if (v.length > 11) v = v.slice(0, 11);
      
      let formatted = v;
      if (v.length > 2) {
        formatted = `(${v.slice(0, 2)}) ${v.slice(2)}`;
      }
      if (v.length > 7) {
        formatted = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
      }
      setFormData(prev => ({ ...prev, [name]: formatted }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isEligible) return;
    
    const phoneDigits = formData.telefone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      alert("Por favor, insira um número de WhatsApp válido com DDD.");
      return;
    }
    
    setFormStatus('submitting');
    
    try {
      const response = await fetch('/api/submit-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormStatus('success');
        // Reset form after 5 seconds
        setTimeout(() => {
          setFormStatus('idle');
          setFormData({
            nome: '', telefone: '', email: '', cidade: '', estado: '',
            aposentadoriaComplementar: '', contribuicao89a95: '', pagaIrAtualmente: ''
          });
        }, 5000);
      } else {
        let errorMessage = 'Falha ao enviar o formulário.';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch (e) {
          // Se não for JSON (ex: erro 500 da Vercel)
          errorMessage = `Erro no servidor (${response.status}). Verifique se as variáveis de ambiente estão configuradas na Vercel.`;
        }
        alert(`Erro: ${errorMessage}`);
        setFormStatus('idle');
      }
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      alert('Erro de conexão. Por favor, tente novamente mais tarde.');
      setFormStatus('idle');
    }
  };

  const scrollToForm = () => {
    const formSection = document.getElementById('analise');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="fixed top-0 w-full bg-[#38383a]/95 backdrop-blur-sm z-50 border-b border-[#4a4a4c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <div>
              <h1 className="font-serif text-xl font-bold leading-tight tracking-wide">SICHEL & DUBOC</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#dcb366]">Advogados Associados</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#sobre-a-acao" className="hover:text-white transition-colors">Sobre a Ação</a>
            <a href="#requisitos" className="hover:text-white transition-colors">Requisitos</a>
            <button 
              onClick={scrollToForm}
              className="bg-[#dcb366] hover:bg-[#c49d52] text-[#38383a] px-6 py-2.5 rounded-sm font-semibold transition-colors"
            >
              Análise Gratuita
            </button>
          </nav>

          {/* Mobile CTA Button */}
          <button 
            onClick={scrollToForm}
            className="md:hidden bg-[#dcb366] hover:bg-[#c49d52] text-[#38383a] px-4 py-2 text-xs font-bold rounded-sm transition-colors shadow-lg"
          >
            Análise Gratuita
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-[#38383a]">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&q=80&w=2000" 
            alt="Biblioteca jurídica" 
            className="w-full h-full object-cover opacity-15"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#38383a] via-[#38383a]/90 to-[#38383a]/40"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#dcb366]/30 bg-[#dcb366]/10 text-[#dcb366] text-xs font-bold uppercase tracking-wider mb-6">
                <Scale className="w-3 h-3" />
                Direito Previdenciário & Tributário
              </div>
              <h2 className="font-serif text-4xl md:text-6xl font-bold text-white mb-6 leading-[1.1]">
                Restituição de Imposto de Renda para Aposentados
              </h2>
              <p className="text-slate-300 text-lg md:text-xl mb-10 leading-relaxed max-w-xl">
                Se você contribuiu para previdência complementar (como Petros, Funcef, Previ, Banesprev, Valia, Sistel, entre outras) entre 1989 e 1995, pode ter direito à restituição de valores pagos indevidamente.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={scrollToForm}
                  className="bg-[#dcb366] hover:bg-[#c49d52] text-[#38383a] px-8 py-4 rounded-sm font-semibold text-lg transition-colors flex items-center justify-center gap-2"
                >
                  Quero verificar meu direito agora
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:block relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 aspect-[4/3]">
                <img 
                  src="https://i.imgur.com/kSwchsC.png" 
                  alt="Aposentado" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#38383a]/80 via-transparent to-transparent"></div>
              </div>
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-[#dcb366]/20 rounded-full blur-2xl -z-10"></div>
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#dcb366]/10 rounded-full blur-3xl -z-10"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sobre a Ação Section */}
      <section id="sobre-a-acao" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h3 className="font-serif text-3xl md:text-4xl font-bold text-[#38383a] mb-4">Sobre a Ação de Restituição</h3>
            <div className="w-20 h-1 bg-[#dcb366] mx-auto mb-6"></div>
            <p className="text-slate-600 text-lg">
              Entenda por que milhares de aposentados estão buscando judicialmente a devolução de valores retidos indevidamente.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Scale className="w-10 h-10 text-[#dcb366]" />,
                title: "Bitributação",
                desc: "O imposto foi pago na fonte durante a contribuição e está sendo cobrado novamente no recebimento."
              },
              {
                icon: <FileText className="w-10 h-10 text-[#dcb366]" />,
                title: "Lei 7.713/88",
                desc: "Fundamentação jurídica baseada na legislação vigente no período de 1989 a 1995."
              },
              {
                icon: <CheckCircle2 className="w-10 h-10 text-[#dcb366]" />,
                title: "Direito Reconhecido",
                desc: "Jurisprudência favorável em tribunais superiores para casos de bitributação comprovada."
              },
              {
                icon: <AlertCircle className="w-10 h-10 text-[#dcb366]" />,
                title: "Prescrição",
                desc: "Ação visa recuperar os valores pagos nos últimos 5 anos e ajustar as cobranças futuras."
              }
            ].map((item, i) => (
              <div key={i} className="p-8 border border-slate-100 rounded-lg hover:shadow-xl transition-shadow bg-slate-50/50">
                <div className="mb-6">{item.icon}</div>
                <h4 className="font-serif text-xl font-bold text-[#38383a] mb-3">{item.title}</h4>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <button 
              onClick={scrollToForm}
              className="inline-flex items-center justify-center gap-2 bg-[#dcb366] hover:bg-[#c49d52] text-[#38383a] px-8 py-4 rounded-sm font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              Descobrir se tenho direito
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Explanatory Section */}
      <section className="py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="font-serif text-3xl md:text-4xl font-bold text-[#38383a] mb-6">
                Por que isso acontece?
              </h3>
              <div className="w-20 h-1 bg-[#dcb366] mb-8"></div>
              <div className="space-y-6 text-slate-600 text-lg leading-relaxed">
                <p>
                  Entre 1989 e 1995, muitos trabalhadores contribuíram para seus fundos de previdência complementar já com incidência de Imposto de Renda.
                </p>
                <p>
                  Ao se aposentarem, passaram a sofrer nova tributação sobre valores que já haviam sido tributados anteriormente — o que pode configurar <span className="text-[#38383a] font-bold">bitributação</span>.
                </p>
                <p>
                  Em diversos casos, é possível buscar a restituição judicial desses valores.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 relative z-10">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-[#dcb366]/10 flex items-center justify-center flex-shrink-0">
                    <Scale className="w-6 h-6 text-[#dcb366]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#38383a] text-xl">Entendimento Jurídico</h4>
                    <p className="text-slate-500 text-sm">Contexto e Autoridade</p>
                  </div>
                </div>
                <p className="text-slate-600 italic">
                  "A justiça brasileira reconhece que o imposto não pode incidir duas vezes sobre a mesma base de cálculo. Se você pagou na fonte durante a contribuição, não deve pagar novamente no recebimento do benefício proporcional àquele período."
                </p>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#dcb366]/10 rounded-full blur-2xl -z-0"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-[#38383a]/5 rounded-full blur-3xl -z-0"></div>
            </div>
          </div>
          <div className="mt-16 text-center">
            <button 
              onClick={scrollToForm}
              className="inline-flex items-center justify-center gap-2 bg-[#38383a] hover:bg-[#2c2c2e] text-white px-8 py-4 rounded-sm font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              Falar com um especialista
              <ChevronRight className="w-5 h-5 text-[#dcb366]" />
            </button>
          </div>
        </div>
      </section>

      {/* Requisitos Section */}
      <section id="requisitos" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h3 className="font-serif text-3xl md:text-4xl font-bold text-[#38383a] mb-4">Quem tem direito a essa ação?</h3>
            <div className="w-20 h-1 bg-[#dcb366] mx-auto mb-6"></div>
            <p className="text-slate-600 text-lg">
              Para que possamos ingressar com a ação de restituição, é necessário preencher <strong>todos</strong> os três requisitos abaixo:
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: <FileText className="w-8 h-8 text-[#dcb366]" />,
                title: "1. Previdência Complementar",
                desc: "Receber aposentadoria complementar (não paga pelo INSS) até os dias atuais. Ex: BNDES, Banco do Brasil, Rede Ferroviária, Petros, Funcef, etc."
              },
              {
                icon: <CheckCircle2 className="w-8 h-8 text-[#dcb366]" />,
                title: "2. Período de Contribuição",
                desc: "Ter contribuído para o fundo de previdência complementar e ter pago Imposto de Renda sobre tais contribuições no período compreendido entre os anos de 1989 e 1995."
              },
              {
                icon: <AlertCircle className="w-8 h-8 text-[#dcb366]" />,
                title: "3. Retenção Atual",
                desc: "Estar pagando (sofrendo retenção na fonte) Imposto de Renda sobre o benefício recebido atualmente."
              }
            ].map((req, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.5 }}
                className="p-8 border border-slate-200 rounded-lg bg-slate-50 relative"
              >
                <div className="absolute -top-6 left-8 w-12 h-12 bg-[#38383a] rounded-full flex items-center justify-center shadow-lg">
                  {req.icon}
                </div>
                <h4 className="font-serif text-xl font-bold text-[#38383a] mt-4 mb-3">{req.title}</h4>
                <p className="text-slate-600 leading-relaxed">{req.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-16 text-center">
            <button 
              onClick={scrollToForm}
              className="inline-flex items-center justify-center gap-2 bg-[#dcb366] hover:bg-[#c49d52] text-[#38383a] px-8 py-4 rounded-sm font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              Solicitar minha análise gratuita
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Authority Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#38383a] rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row">
            <div className="lg:w-1/2 p-12 lg:p-16 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#dcb366]/30 bg-[#dcb366]/10 text-[#dcb366] text-xs font-bold uppercase tracking-wider mb-6 w-fit">
                Autoridade e Confiança
              </div>
              <h3 className="font-serif text-3xl md:text-4xl font-bold text-white mb-6">
                Especialistas em restituição tributária
              </h3>
              <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                O escritório <span className="text-white font-semibold">Sichel & Duboc Advogados Associados</span> atua na defesa dos direitos de aposentados e contribuintes em demandas tributárias e previdenciárias, com foco em resultados e segurança jurídica.
              </p>
              <div className="space-y-4">
                {[
                  "Atendimento personalizado",
                  "Análise técnica individualizada",
                  "Transparência no acompanhamento do processo"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-white/90">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#dcb366] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-[#38383a]" />
                    </div>
                    <span className="text-lg font-medium">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row gap-8 text-sm text-slate-400">
                <div>
                  <span className="block text-white/50 text-[10px] uppercase tracking-widest mb-1">Registro OAB</span>
                  <span className="font-mono text-slate-300">181.046 OAB/RJ</span>
                </div>
                <div>
                  <span className="block text-white/50 text-[10px] uppercase tracking-widest mb-1">CNPJ</span>
                  <span className="font-mono text-slate-300">48.319.240/0001-80</span>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2 relative min-h-[400px]">
              {/* Imagem Desktop (Documentos) */}
              <img 
                src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=2070" 
                alt="Análise de documentos tributários" 
                className="hidden lg:block absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {/* Imagem Mobile (Cliente) */}
              <img 
                src="https://i.imgur.com/kSwchsC.png" 
                alt="Cliente" 
                className="block lg:hidden absolute inset-0 w-full h-full object-cover object-top"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#38383a] via-transparent to-transparent lg:block hidden"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#38383a] via-transparent to-transparent lg:hidden block"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Urgency Section */}
      <section className="py-12 bg-[#dcb366]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#38383a] flex items-center justify-center flex-shrink-0 shadow-lg">
                <AlertCircle className="w-6 h-6 text-[#dcb366]" />
              </div>
              <div>
                <h3 className="text-[#38383a] text-2xl font-bold font-serif">Não deixe valores prescreverem</h3>
                <p className="text-[#38383a]/80 font-medium">O direito à restituição pode estar sujeito a prazos legais.</p>
              </div>
            </div>
            <div className="text-[#38383a] md:text-right max-w-md flex flex-col items-start md:items-end gap-4">
              <p className="text-lg font-bold">Quanto antes for realizada a análise, maior a segurança jurídica.</p>
              <button 
                onClick={scrollToForm}
                className="inline-flex items-center justify-center gap-2 bg-[#38383a] hover:bg-[#2c2c2e] text-white px-6 py-3 rounded-sm font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                Garantir minha restituição
                <ChevronRight className="w-4 h-4 text-[#dcb366]" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section id="analise" className="py-24 bg-[#38383a] relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#dcb366] via-[#38383a] to-[#38383a]"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="font-serif text-3xl md:text-5xl font-bold text-white mb-6">
              Faça sua Análise Gratuita
            </h3>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Responda às perguntas abaixo para que nossa equipe de especialistas jurídicos possa analisar o seu caso e verificar a viabilidade de ingressar com a ação de restituição.
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-xl shadow-2xl p-8 md:p-10"
          >
            {formStatus === 'success' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-10 text-center">
                <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
                <h5 className="text-2xl font-bold text-emerald-900 mb-4">Análise Solicitada com Sucesso!</h5>
                <p className="text-emerald-700 text-lg mb-6">
                  Excelente! Você atende aos requisitos iniciais. Nossa equipe de especialistas jurídicos entrará em contato em até 24 horas para dar andamento ao seu caso.
                </p>
                <p className="text-sm text-emerald-600 font-medium">
                  Por favor, separe seus comprovantes de rendimento e extratos do fundo de pensão.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Triagem Section */}
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-[#38383a] text-[#dcb366] flex items-center justify-center font-bold text-sm">1</div>
                    <h4 className="font-bold text-[#38383a] text-lg uppercase tracking-wider">Triagem Inicial</h4>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-[#38383a] mb-3">Você recebe aposentadoria complementar (não paga pelo INSS)?</label>
                      <div className="flex gap-4">
                        {['sim', 'nao'].map((opt) => (
                          <label key={opt} className="flex-1 cursor-pointer">
                            <input 
                              type="radio" 
                              name="aposentadoriaComplementar" 
                              value={opt}
                              checked={formData.aposentadoriaComplementar === opt}
                              onChange={handleInputChange}
                              className="sr-only peer"
                            />
                            <div className="p-3 text-center border-2 border-slate-200 rounded-md peer-checked:border-[#dcb366] peer-checked:bg-[#dcb366]/5 peer-checked:text-[#38383a] transition-all font-semibold capitalize">
                              {opt}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#38383a] mb-3">Contribuiu para previdência complementar entre 1989 e 1995?</label>
                      <div className="flex gap-4">
                        {['sim', 'nao'].map((opt) => (
                          <label key={opt} className="flex-1 cursor-pointer">
                            <input 
                              type="radio" 
                              name="contribuicao89a95" 
                              value={opt}
                              checked={formData.contribuicao89a95 === opt}
                              onChange={handleInputChange}
                              className="sr-only peer"
                            />
                            <div className="p-3 text-center border-2 border-slate-200 rounded-md peer-checked:border-[#dcb366] peer-checked:bg-[#dcb366]/5 peer-checked:text-[#38383a] transition-all font-semibold capitalize">
                              {opt}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#38383a] mb-3">Paga Imposto de Renda sobre o benefício atualmente?</label>
                      <div className="flex gap-4">
                        {['sim', 'nao'].map((opt) => (
                          <label key={opt} className="flex-1 cursor-pointer">
                            <input 
                              type="radio" 
                              name="pagaIrAtualmente" 
                              value={opt}
                              checked={formData.pagaIrAtualmente === opt}
                              onChange={handleInputChange}
                              className="sr-only peer"
                            />
                            <div className="p-3 text-center border-2 border-slate-200 rounded-md peer-checked:border-[#dcb366] peer-checked:bg-[#dcb366]/5 peer-checked:text-[#38383a] transition-all font-semibold capitalize">
                              {opt}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {showEligibilityMessage && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={`p-4 rounded-md flex items-start gap-3 ${isEligible ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}
                  >
                    {isEligible ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="font-medium">Você preenche os requisitos iniciais! Complete seus dados abaixo para prosseguir com a análise detalhada.</p>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="font-medium">Infelizmente, com base nas suas respostas, você pode não se enquadrar nos requisitos para esta ação específica.</p>
                      </>
                    )}
                  </motion.div>
                )}

                {/* Contact Data Section */}
                <div className={`space-y-6 transition-opacity duration-500 ${isEligible ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-[#38383a] text-[#dcb366] flex items-center justify-center font-bold text-sm">2</div>
                    <h4 className="font-bold text-[#38383a] text-lg uppercase tracking-wider">Seus Dados de Contato</h4>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#38383a]">Nome Completo</label>
                      <input 
                        type="text" 
                        name="nome"
                        value={formData.nome}
                        onChange={handleInputChange}
                        required={isEligible}
                        className="w-full p-3 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#dcb366] focus:border-transparent outline-none transition-all"
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#38383a]">WhatsApp / Telefone</label>
                      <input 
                        type="tel" 
                        name="telefone"
                        value={formData.telefone}
                        onChange={handleInputChange}
                        required={isEligible}
                        className="w-full p-3 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#dcb366] focus:border-transparent outline-none transition-all"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#38383a]">E-mail</label>
                      <input 
                        type="email" 
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required={isEligible}
                        className="w-full p-3 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#dcb366] focus:border-transparent outline-none transition-all"
                        placeholder="seu@email.com"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-[#38383a]">Cidade</label>
                        <input 
                          type="text" 
                          name="cidade"
                          value={formData.cidade}
                          onChange={handleInputChange}
                          required={isEligible}
                          className="w-full p-3 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#dcb366] focus:border-transparent outline-none transition-all"
                          placeholder="Cidade"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-[#38383a]">Estado</label>
                        <input 
                          type="text" 
                          name="estado"
                          value={formData.estado}
                          onChange={handleInputChange}
                          required={isEligible}
                          className="w-full p-3 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#dcb366] focus:border-transparent outline-none transition-all"
                          placeholder="UF"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={!isEligible || formStatus === 'submitting'}
                  className={`w-full py-5 rounded-sm font-bold text-xl uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 ${isEligible && formStatus !== 'submitting' ? 'bg-[#38383a] text-white hover:bg-[#2a2a2c] hover:scale-[1.01]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  {formStatus === 'submitting' ? (
                    <>
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Processando...
                    </>
                  ) : (
                    'Solicitar Análise Gratuita'
                  )}
                </button>
                <p className="text-center text-xs text-slate-400">
                  Seus dados estão protegidos de acordo com a LGPD e serão utilizados exclusivamente para esta análise.
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2c2c2e] py-8 border-t border-[#38383a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8">
            
            {/* Brand */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <div className="mb-4">
                <h2 className="font-serif text-xl font-bold leading-tight tracking-wide text-white">SICHEL & DUBOC</h2>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#dcb366]">Advogados Associados</p>
              </div>
              <p className="text-slate-400 text-sm mb-4 max-w-xs">
                Especialistas na defesa dos direitos de aposentados e contribuintes em demandas tributárias e previdenciárias.
              </p>
              <div className="text-slate-500 text-xs space-y-1">
                <p>OAB/RJ: 181.046</p>
                <p>CNPJ: 48.319.240/0001-80</p>
              </div>
            </div>

            {/* Contact */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Contato</h3>
              <div className="space-y-3 text-slate-400 text-sm">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
                  <Phone className="w-4 h-4 text-[#dcb366] shrink-0 mt-0.5" /> 
                  <span>(22) 98146-9517 &nbsp;|&nbsp; (22) 2523-1196</span>
                </div>
                <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
                  <Mail className="w-4 h-4 text-[#dcb366] shrink-0 mt-0.5" /> 
                  <span>contato@sichelduboc.com.br</span>
                </div>
                <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#dcb366] shrink-0 mt-0.5" /> 
                  <span>Av. Conselheiro Julius Arp 80, Espaço Arp, Bloco 4 Pavimento 3, sala 311</span>
                </div>
              </div>
            </div>

            {/* Links & Legal */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Institucional</h3>
              <div className="flex flex-col gap-2 mb-6">
                <Link to="/politica-de-privacidade" className="text-slate-400 text-sm hover:text-[#dcb366] transition-colors">
                  Política de Privacidade
                </Link>
                <Link to="/termos-de-uso" className="text-slate-400 text-sm hover:text-[#dcb366] transition-colors">
                  Termos de Uso
                </Link>
              </div>
              
              <div className="mt-auto">
                <p className="text-slate-500 text-xs">
                  © {new Date().getFullYear()} Sichel & Duboc Advogados.<br/>Todos os direitos reservados.
                </p>
              </div>
            </div>

          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/5522981469517?text=Olá,%20gostaria%20de%20uma%20análise%20gratuita%20sobre%20a%20restituição%20do%20Imposto%20de%20Renda."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#20bd5a] hover:scale-110 transition-all duration-300 flex items-center justify-center group"
        aria-label="Falar no WhatsApp"
      >
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>
      </a>
    </div>
  );
};

export default Home;
