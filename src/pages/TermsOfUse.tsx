import React from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowLeft, FileText, Scale, Phone, Mail, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsOfUse: React.FC = () => {
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
              <FileText className="w-8 h-8 text-[#dcb366]" />
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-white mb-6">Termos de Uso</h1>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Conheça as regras e condições para a utilização dos nossos serviços e do nosso site, garantindo transparência e segurança para todos.
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
              <Scale className="w-6 h-6 text-[#dcb366]" />
              1. Aceitação dos Termos
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Ao acessar e utilizar o site do escritório <strong>Sichel & Duboc Advogados Associados</strong>, você concorda com estes Termos de Uso. Caso não concorde com alguma das condições aqui estabelecidas, recomendamos que não utilize nossos serviços online.
            </p>
          </section>

          {/* Services */}
          <section>
            <h2 className="text-2xl font-serif font-bold text-[#38383a] mb-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-[#dcb366]" />
              2. Nossos Serviços
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              O conteúdo deste site tem caráter meramente informativo e não substitui a consulta jurídica formal. A disponibilização de informações não cria uma relação advogado-cliente.
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
              <li>As análises preliminares oferecidas pelo site dependem do envio correto de documentos;</li>
              <li>A contratação formal dos serviços jurídicos será feita mediante contrato específico;</li>
              <li>Os resultados de processos judiciais ou administrativos não podem ser garantidos, tratando-se de obrigação de meio e não de resultado.</li>
            </ul>
          </section>

          {/* User Responsibilities */}
          <section>
            <h2 className="text-2xl font-serif font-bold text-[#38383a] mb-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-[#dcb366]" />
              3. Responsabilidades do Usuário
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Ao utilizar nosso site e solicitar análises, o usuário se compromete a:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
              <li>Fornecer informações verdadeiras, exatas e atualizadas;</li>
              <li>Não enviar documentos falsos ou adulterados;</li>
              <li>Utilizar o site apenas para fins lícitos e relacionados aos serviços oferecidos;</li>
              <li>Não tentar violar a segurança do site ou acessar áreas restritas sem autorização.</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-serif font-bold text-[#38383a] mb-4 flex items-center gap-3">
              <Shield className="w-6 h-6 text-[#dcb366]" />
              4. Propriedade Intelectual
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Todo o conteúdo deste site, incluindo textos, imagens, logotipos e design, é de propriedade exclusiva do escritório Sichel & Duboc Advogados Associados ou de seus licenciantes, estando protegido pelas leis de direitos autorais e propriedade intelectual. É proibida a reprodução, distribuição ou modificação sem autorização prévia e expressa.
            </p>
          </section>

          {/* Modifications */}
          <section>
            <h2 className="text-2xl font-serif font-bold text-[#38383a] mb-4 flex items-center gap-3">
              <FileText className="w-6 h-6 text-[#dcb366]" />
              5. Alterações nos Termos
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento, sem aviso prévio. As alterações entrarão em vigor imediatamente após a publicação no site. Recomendamos que você revise esta página periodicamente.
            </p>
          </section>

          {/* Contact */}
          <section className="pt-8 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm mb-4">Para dúvidas sobre nossos Termos de Uso, entre em contato:</p>
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

export default TermsOfUse;
