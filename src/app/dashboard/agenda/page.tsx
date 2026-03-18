"use client";

import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { Plus, X, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAgendaItems, createAgendaItem, updateAgendaItem, deleteAgendaItem } from "@/app/actions/agenda";

export default function AgendaPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshEvents();
  }, []);

  const refreshEvents = async () => {
    setLoading(true);
    const data = await getAgendaItems();
    setEvents(data.map((item: any) => ({
      ...item,
      start: item.start.toISOString(),
      end: item.end?.toISOString(),
    })));
    setLoading(false);
  };

  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.dateStr);
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (arg: any) => {
    const eventId = arg.event.id;
    const event = events.find(e => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
      setIsModalOpen(true);
    }
  };

  const handleDeleteEvent = async () => {
    if (selectedEvent) {
      const res = await deleteAgendaItem(selectedEvent.id);
      if (res.success) {
        refreshEvents();
        setIsModalOpen(false);
        setSelectedEvent(null);
      } else {
        alert(res.error);
      }
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const title = formData.get("title") as string;
    const date = formData.get("date") as string;
    const category = formData.get("category") as string;
    const notes = formData.get("notes") as string;

    if (!title || !date) return;

    let res;
    if (selectedEvent) {
      res = await updateAgendaItem(selectedEvent.id, {
        title,
        start: new Date(date),
        category,
        description: notes
      });
    } else {
      res = await createAgendaItem({
        title,
        start: new Date(date),
        category,
        description: notes
      });
    }

    if (res.success) {
      setIsModalOpen(false);
      setSelectedEvent(null);
      refreshEvents();
    } else {
      alert(res.error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-card overflow-hidden">
      <header className="p-6 border-b border-border flex items-center justify-between bg-white dark:bg-slate-900 z-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda Dinâmica</h1>
          <p className="text-sm text-muted-foreground italic">"O sucesso são as ações diárias implementadas."</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-6 px-4 py-2 bg-secondary rounded-xl text-[10px] xl:text-xs font-medium">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Prospecção (Ação)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
              <span>Apresentação</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>Capacitação (Teoria)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span>Salas Pequenas</span>
            </div>
          </div>
          <button 
            onClick={() => {
              setSelectedEvent(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={18} />
            Agendar Ação
          </button>
        </div>
      </header>

      <div className="flex-1 p-6 relative overflow-y-auto">
        <style>{`
          .fc { --fc-border-color: #e2e8f0; --fc-button-bg-color: #f8fafc; --fc-button-text-color: #0f172a; --fc-button-hover-bg-color: #f1f5f9; --fc-button-active-bg-color: #e2e8f0; --fc-today-bg-color: #f1f5f9; }
          .fc .fc-toolbar-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; }
          .fc .fc-button { border-radius: 0.75rem; border: 1px solid #e2e8f0; font-weight: 600; padding: 0.5rem 1rem; transition: all 0.2s; }
          .fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-button-primary:not(:disabled):active { background-color: #1e293b; color: white; border-color: #1e293b; }
          .fc-theme-standard td, .fc-theme-standard th { border-color: #f1f5f9; }
          .fc-event { border-radius: 0.5rem; border: none; padding: 4px 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); cursor: pointer; transition: transform 0.1s; font-weight: 500; }
          .fc-event:hover { transform: scale(1.02); }
          .status-done { opacity: 0.5; text-decoration: line-through; }
        `}</style>
        
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay"
          }}
          locale={ptBrLocale}
          events={events.map(ev => ({
            ...ev,
            className: cn(
              ev.status === "DONE" && "status-done",
              ev.category === "prospect" ? "bg-blue-500" : 
              ev.category === "presentation" ? "bg-indigo-600" : 
              ev.category === "training" ? "bg-orange-500" : "bg-emerald-500"
            )
          }))}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="100%"
          expandRows={true}
          selectable={true}
        />
      </div>

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-[2rem] border border-border shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{selectedEvent ? "Editar Ação" : "Nova Ação na Agenda"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-accent rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form className="space-y-4" onSubmit={handleSaveEvent}>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Título da Ação</label>
                <input 
                  name="title"
                  type="text" 
                  defaultValue={selectedEvent?.title || ""}
                  placeholder="Ex: Apresentação para João" 
                  className="w-full mt-1.5 p-3 rounded-2xl bg-secondary border-none focus:ring-2 focus:ring-primary outline-none transition-all"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Data/Hora</label>
                  <input 
                    name="date"
                    type="datetime-local" 
                    defaultValue={selectedEvent?.start ? selectedEvent.start.slice(0, 16) : (selectedDate ? `${selectedDate}T09:00` : "")}
                    className="w-full mt-1.5 p-3 rounded-2xl bg-secondary border-none focus:ring-2 focus:ring-primary outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Categoria</label>
                  <select 
                    name="category"
                    defaultValue={selectedEvent?.category || "prospect"}
                    className="w-full mt-1.5 p-3 rounded-2xl bg-secondary border-none focus:ring-2 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="prospect">Prospecção</option>
                    <option value="presentation">Apresentação</option>
                    <option value="training">Capacitação</option>
                    <option value="small-room">Salas Pequenas</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Notas</label>
                <textarea 
                  name="notes"
                  rows={3}
                  defaultValue={selectedEvent?.notes || ""}
                  className="w-full mt-1.5 p-3 rounded-2xl bg-secondary border-none focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                ></textarea>
              </div>
              
              <div className="flex gap-3 mt-4">
                {selectedEvent && (
                  <button 
                    type="button"
                    onClick={handleDeleteEvent}
                    className="flex-1 bg-destructive/10 text-destructive py-4 rounded-2xl font-bold hover:bg-destructive/20 transition-all"
                  >
                    Excluir
                  </button>
                )}
                <button 
                  type="submit"
                  className="flex-[2] bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:opacity-90 transition-all"
                >
                  {selectedEvent ? "Salvar Alterações" : "Salvar na Agenda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
