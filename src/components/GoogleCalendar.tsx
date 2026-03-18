import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Calendar as CalendarIcon, LogIn, LogOut, RefreshCw } from 'lucide-react';

const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function GoogleCalendar() {
  const [events, setEvents] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if we have a token stored in localStorage or if we just returned from OAuth
    const token = localStorage.getItem('google_calendar_token');
    if (token) {
      setIsAuthenticated(true);
      fetchEvents(token);
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.token) {
        localStorage.setItem('google_calendar_token', event.data.token);
        setIsAuthenticated(true);
        fetchEvents(event.data.token);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnect = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();

      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        alert('Por favor, permita popups para este site para conectar sua conta.');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      alert('Erro ao iniciar conexão com Google Calendar.');
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('google_calendar_token');
    setIsAuthenticated(false);
    setEvents([]);
  };

  const fetchEvents = async (token: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/google/events', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          handleDisconnect();
          throw new Error('Token expirado');
        }
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      
      const formattedEvents = data.items.map((item: any) => ({
        id: item.id,
        title: item.summary || 'Sem título',
        start: new Date(item.start.dateTime || item.start.date),
        end: new Date(item.end.dateTime || item.end.date),
        allDay: !item.start.dateTime,
      }));
      
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white h-full">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="text-[#dcb366]" />
            Google Agenda
          </h2>
          <p className="text-slate-500 text-sm mt-1">Gerencie seus agendamentos e reuniões diretamente pelo painel.</p>
        </div>
        
        <div>
          {!isAuthenticated ? (
            <button 
              onClick={handleConnect}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <LogIn size={18} />
              Conectar Google Agenda
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => fetchEvents(localStorage.getItem('google_calendar_token')!)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-lg transition-colors"
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Atualizar
              </button>
              <button 
                onClick={handleDisconnect}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                Desconectar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-hidden">
        {!isAuthenticated ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <CalendarIcon size={48} className="mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">Agenda Desconectada</h3>
            <p className="text-center max-w-md mb-6">
              Conecte sua conta do Google para visualizar e gerenciar seus eventos do Google Calendar diretamente aqui no painel.
            </p>
            <button 
              onClick={handleConnect}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
            >
              <LogIn size={20} />
              Conectar Agora
            </button>
          </div>
        ) : (
          <div className="h-full bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              messages={{
                next: "Próximo",
                previous: "Anterior",
                today: "Hoje",
                month: "Mês",
                week: "Semana",
                day: "Dia",
                agenda: "Agenda",
                date: "Data",
                time: "Hora",
                event: "Evento",
                noEventsInRange: "Não há eventos neste período.",
              }}
              culture="pt-BR"
            />
          </div>
        )}
      </div>
    </div>
  );
}
