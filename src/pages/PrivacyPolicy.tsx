import React from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowLeft, Lock, Eye, FileCheck, Scale, Phone, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-[#38383a] hover:text-[#dcb366] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Voltar para o Início</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <h2 className="font-serif text-lg font-bold leading-tight tracking-wide">SICHEL & DUBOC</h2>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#dcb366]">Advogados Associados</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-[#38383a] py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#dcb366] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#dcb366]/20 mb-6">
              <Shield className="w-8 h-8 text-[#dcb366]" />
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-white mb-6">Política de Privacidade</h1>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Sua privacidade e a segurança dos seus dados são fundamentais para nós. Conheça como tratamos suas informações com transparência e rigor jurídico.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 space-y-12"
        >
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-serif font-bold text-[#38383a] mb-4 flex items-center gap-3">
              <FileCheck className="w-6 h-6 text-[#dcb366]" />
              1. Introdução
            </h2>
            <p className="text-slate-600 leading-relaxed">
              O escritório <strong>Sichel & Duboc Advogados Associados</strong> está comprometido com a proteção dos dados pessoais de seus clientes, parceiros e usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).
            </p>
          </section>

          {/* Data Collection */}
          <section>
            <h2 className="text-2xl font-serif font-bold text-[#38383a] mb-4 flex items-center gap-3">
              <Eye className="w-6 h-6 text-[#dcb366]" />
              2. Coleta de Dados
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Coletamos apenas os dados estritamente necessários para a prestação de nossos serviços jurídicos e para a análise de viabilidade de ações de restituição, tais como:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
              <li>Dados de identificação (Nome completo, CPF);</li>
              <li>Dados de contato (E-mail, Telefone/WhatsApp);</li>
              <li>Informações profissionais e previdenciárias (Fundo de pensão, período de contribuição);</li>
              <li>Documentos necessários para a instrução processual (Comprovantes de rendimento, extratos).</li>
            </ul>
          </section>

          {/* Purpose */}
          <section>
            <h2 className="text-2xl font-serif font-bold text-[#38383a] mb-4 flex items-center gap-3">
              <Scale className="w-6 h-6 text-[#dcb366]" />
              3. Finalidade do Tratamento
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Seus dados são utilizados exclusivamente para as seguintes finalidades:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
              <li>Realização de triagem técnica e análise de direito à restituição;</li>
              <li>Comunicação sobre o andamento de consultas e processos;</li>
              <li>Elaboração de contratos de prestação de serviços jurídicos;</li>
              <li>Cumprimento de obrigações legais e regulatórias.</li>
            </ul>
          </section>

          {/* Security */}
          <section>
            <h2 className="text-2xl font-serif font-bold text-[#38383a] mb-4 flex items-center gap-3">
              <Lock className="w-6 h-6 text-[#dcb366]" />
              4. Segurança e Armazenamento
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Implementamos medidas técnicas e organizacionais avançadas para proteger seus dados contra acessos não autorizados, perda, alteração ou qualquer forma de tratamento inadequado. O acesso às informações é restrito a profissionais autorizados e vinculados ao dever de sigilo profissional inerente à advocacia.
            </p>
          </section>

          {/* Sharing */}
          <section>
            <h2 className="text-2xl font-serif font-bold text-[#38383a] mb-4 flex items-center gap-3">
              <Shield className="w-6 h-6 text-[#dcb366]" />
              5. Compartilhamento de Dados
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Não comercializamos seus dados pessoais. O compartilhamento ocorre apenas quando estritamente necessário para o exercício do direito em processos judiciais (Poder Judiciário, Receita Federal) ou com prestadores de serviços tecnológicos que garantem a operação segura de nossos sistemas, sempre sob rigorosos contratos de confidencialidade.
            </p>
          </section>

          {/* User Rights */}
          <section className="bg-slate-50 p-6 rounded-xl border border-slate-100">
            <h2 className="text-xl font-bold text-[#38383a] mb-4">Seus Direitos</h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              De acordo com a LGPD, você possui o direito de solicitar a qualquer momento:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
              <div className="bg-white p-3 rounded border border-slate-200">Confirmação de tratamento</div>
              <div className="bg-white p-3 rounded border border-slate-200">Acesso aos dados</div>
              <div className="bg-white p-3 rounded border border-slate-200">Correção de dados incompletos</div>
              <div className="bg-white p-3 rounded border border-slate-200">Eliminação de dados desnecessários</div>
            </div>
          </section>

          {/* Contact */}
          <section className="pt-8 border-top border-slate-100 text-center">
            <p className="text-slate-500 text-sm mb-4">Para dúvidas sobre nossa Política de Privacidade, entre em contato:</p>
            <a href="mailto:contato@sichelduboc.com.br" className="text-[#dcb366] font-bold hover:underline">contato@sichelduboc.com.br</a>
          </section>
        </motion.div>
      </main>

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
              <p className="text-slate-500 text-xs">
                CNPJ: 48.319.240/0001-80<br/>
                OAB/RJ: 181.046
              </p>
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
    </div>
  );
};

export default PrivacyPolicy;
