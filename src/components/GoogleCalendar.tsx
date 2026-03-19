import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Calendar as CalendarIcon, LogIn, LogOut, RefreshCw, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

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

// Custom Toolbar Component
const CustomToolbar = (toolbar: any) => {
  const goToBack = () => {
    toolbar.onNavigate('PREV');
  };

  const goToNext = () => {
    toolbar.onNavigate('NEXT');
  };

  const goToCurrent = () => {
    toolbar.onNavigate('TODAY');
  };

  const label = () => {
    const date = toolbar.date;
    return (
      <span className="text-xl font-bold text-slate-800 capitalize">
        {format(date, 'MMMM yyyy', { locale: ptBR })}
      </span>
    );
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-4">
        {label()}
        <div className="flex items-center gap-1 ml-4">
          <button onClick={goToBack} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={goToNext} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      
      {/* View Switcher (Optional, hiding for cleaner look as requested, but can be added back) */}
      {/* <div className="flex bg-slate-100 p-1 rounded-lg">
        {['month', 'week', 'day', 'agenda'].map((viewName) => (
          <button
            key={viewName}
            onClick={() => toolbar.onView(viewName)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
              toolbar.view === viewName ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {viewName === 'month' ? 'Mês' : viewName === 'week' ? 'Semana' : viewName === 'day' ? 'Dia' : 'Agenda'}
          </button>
        ))}
      </div> */}
    </div>
  );
};

export default function GoogleCalendar() {
  const [events, setEvents] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());

  useEffect(() => {
    // Try to fetch events on mount to check if we are authenticated
    fetchEvents();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsAuthenticated(true);
        fetchEvents();
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

  const handleDisconnect = async () => {
    try {
      await fetch('/api/auth/google/disconnect', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    setIsAuthenticated(false);
    setEvents([]);
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/google/events');
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        setIsAuthenticated(false);
        throw new Error("A API não retornou JSON. Verifique se o backend está rodando corretamente.");
      }

      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        throw new Error('Failed to fetch events');
      }
      
      const data = await response.json();
      
      // Só marca como autenticado se conseguiu ler os dados corretamente
      setIsAuthenticated(true);
      
      const formattedEvents = data.items ? data.items.map((item: any) => ({
        id: item.id,
        title: item.summary || 'Sem título',
        start: new Date(item.start.dateTime || item.start.date),
        end: new Date(item.end.dateTime || item.end.date),
        allDay: !item.start.dateTime,
        description: item.description,
        location: item.location,
      })) : [];
      
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = (slotInfo: any) => {
    setSelectedDate(slotInfo.start);
  };

  const handleSelectEvent = (event: any) => {
    setSelectedDate(event.start);
  };

  const selectedDateEvents = events.filter(event => 
    isSameDay(event.start, selectedDate) || 
    (event.start <= selectedDate && event.end >= selectedDate && !isSameDay(event.start, event.end))
  ).sort((a, b) => a.start.getTime() - b.start.getTime());

  // Custom styles for calendar events
  const eventStyleGetter = (event: any, start: Date, end: Date, isSelected: boolean) => {
    return {
      style: {
        backgroundColor: '#4f46e5', // Indigo-600
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.75rem',
        padding: '2px 4px',
      }
    };
  };

  // Custom styles for day wrapper to highlight selected date
  const dayPropGetter = (date: Date) => {
    if (isSameDay(date, selectedDate)) {
      return {
        className: 'bg-indigo-50/50',
        style: {
          border: '1px solid #c7d2fe', // indigo-200
        },
      };
    }
    return {};
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 h-full overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 shrink-0">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          Calendário
        </h2>
        <p className="text-slate-500 text-sm mt-1">Integração real com Google Calendar para agendamentos.</p>
      </div>

      <div className="flex-1 px-8 pb-8 overflow-hidden">
        {!isAuthenticated ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <CalendarIcon size={48} className="mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">Agenda Desconectada</h3>
            <p className="text-center max-w-md mb-6">
              Conecte sua conta do Google para visualizar e gerenciar seus eventos do Google Calendar diretamente aqui no painel.
            </p>
            <button 
              onClick={handleConnect}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-xl font-medium transition-colors shadow-sm"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Conectar Google Calendar
            </button>
          </div>
        ) : (
          <div className="h-full flex gap-6">
            {/* Main Calendar Area */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col min-w-0">
              {/* Toolbar Actions */}
              <div className="flex justify-end gap-3 mb-6">
                <button 
                  onClick={handleConnect}
                  className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                  Conectar Google Calendar
                </button>
                <button 
                  className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <Plus size={16} />
                  Novo Evento
                </button>
                <button 
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
                  title="Desconectar"
                >
                  <LogOut size={16} />
                </button>
              </div>

              {/* Calendar */}
              <div className="flex-1 min-h-0 custom-calendar-wrapper">
                <style dangerouslySetInnerHTML={{__html: `
                  .custom-calendar-wrapper .rbc-calendar {
                    font-family: inherit;
                  }
                  .custom-calendar-wrapper .rbc-header {
                    padding: 12px 8px;
                    font-weight: 600;
                    font-size: 0.75rem;
                    color: #64748b;
                    text-transform: uppercase;
                    border-bottom: 1px solid #e2e8f0;
                    border-left: none;
                  }
                  .custom-calendar-wrapper .rbc-month-view {
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    overflow: hidden;
                  }
                  .custom-calendar-wrapper .rbc-day-bg {
                    border-left: 1px solid #e2e8f0;
                  }
                  .custom-calendar-wrapper .rbc-day-bg:first-child {
                    border-left: none;
                  }
                  .custom-calendar-wrapper .rbc-month-row {
                    border-top: 1px solid #e2e8f0;
                  }
                  .custom-calendar-wrapper .rbc-date-cell {
                    padding: 8px;
                    font-size: 0.875rem;
                    color: #334155;
                    font-weight: 500;
                  }
                  .custom-calendar-wrapper .rbc-off-range-bg {
                    background-color: #f8fafc;
                  }
                  .custom-calendar-wrapper .rbc-off-range .rbc-button-link {
                    color: #cbd5e1;
                  }
                  .custom-calendar-wrapper .rbc-today {
                    background-color: transparent;
                  }
                  .custom-calendar-wrapper .rbc-today .rbc-button-link {
                    background-color: #4f46e5;
                    color: white;
                    border-radius: 9999px;
                    width: 24px;
                    height: 24px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                  }
                  .custom-calendar-wrapper .rbc-event {
                    background-color: #e0e7ff;
                    color: #4338ca;
                    border: none;
                    border-radius: 4px;
                    padding: 2px 6px;
                    font-size: 0.75rem;
                    font-weight: 500;
                    margin: 1px 4px;
                  }
                  .custom-calendar-wrapper .rbc-event.rbc-selected {
                    background-color: #4f46e5;
                    color: white;
                  }
                `}} />
                <BigCalendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  views={[Views.MONTH]}
                  view={view}
                  date={date}
                  onNavigate={(newDate) => setDate(newDate)}
                  onView={(newView) => setView(newView)}
                  selectable
                  onSelectSlot={handleSelectSlot}
                  onSelectEvent={handleSelectEvent}
                  components={{
                    toolbar: CustomToolbar,
                  }}
                  eventPropGetter={eventStyleGetter}
                  dayPropGetter={dayPropGetter}
                  messages={{
                    noEventsInRange: "Não há eventos neste período.",
                  }}
                  culture="pt-BR"
                />
              </div>
            </div>

            {/* Sidebar - Daily Events */}
            <div className="w-80 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col shrink-0">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <CalendarIcon size={20} className="text-slate-500" />
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4">
                {selectedDateEvents.length === 0 ? (
                  <div className="text-center text-slate-500 mt-10 text-sm">
                    Nenhum evento para esta data.
                  </div>
                ) : (
                  selectedDateEvents.map((event) => (
                    <div key={event.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 hover:border-indigo-100 hover:shadow-sm transition-all">
                      <div className="text-xs font-semibold text-indigo-600 mb-1">
                        {event.allDay ? 'Dia inteiro' : `${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}`}
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm mb-1">{event.title}</h4>
                      {event.location && (
                        <p className="text-xs text-slate-500 truncate mt-2 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                          {event.location}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
