import React, { useState, useContext, FormEvent, useMemo, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ClassSchedule, DayOfWeek } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Heart, Shield, Users } from 'lucide-react';

interface ScheduleFormProps {
  schedule: Partial<ClassSchedule> | null;
  onSave: (schedule: Omit<ClassSchedule, 'id'> & { id?: string }) => void;
  onClose: () => void;
}

const DAYS_OF_WEEK_ORDER: DayOfWeek[] = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const ScheduleForm: React.FC<ScheduleFormProps> = ({ schedule, onSave, onClose }) => {
  const { professors, academies, user, graduations } = useContext(AppContext);
  const [formData, setFormData] = useState({
    className: '',
    dayOfWeek: 'Segunda-feira' as DayOfWeek,
    startTime: '',
    endTime: '',
    professorId: '',
    assistantIds: [] as string[],
    academyId: user?.role === 'academy_admin' ? user.academyId || '' : (schedule?.academyId || ''),
    requiredGraduationId: '',
    ...schedule
  });

  // Filter professors based on the selected academy.
  // If no academy is selected (yet), show all (or none, depending on preference).
  // For academy_admins, this automatically filters to their academy.
  const availableProfessors = useMemo(() => {
      if (!formData.academyId) return professors;
      return professors.filter(p => p.academyId === formData.academyId);
  }, [professors, formData.academyId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'assistantIds' && e.target instanceof HTMLSelectElement) {
      const selectedIds = Array.from(e.target.selectedOptions)
        .map((option: HTMLOptionElement) => option.value);
      setFormData(prev => ({ ...prev, assistantIds: selectedIds }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const selectStyles = "w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Nome da Turma" name="className" value={formData.className} onChange={handleChange} required />
      
      {user?.role === 'general_admin' && (
         <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Academia</label>
            <select name="academyId" value={formData.academyId} onChange={handleChange} required className={selectStyles}>
               <option value="">Selecione uma academia</option>
               {academies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
         </div>
       )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Dia da Semana</label>
        <select name="dayOfWeek" value={formData.dayOfWeek} onChange={handleChange} required className={selectStyles}>
          {DAYS_OF_WEEK_ORDER.map(day => <option key={day} value={day}>{day}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Horário de Início" name="startTime" type="time" value={formData.startTime} onChange={handleChange} required />
        <Input label="Horário de Fim" name="endTime" type="time" value={formData.endTime} onChange={handleChange} required />
      </div>
       <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Graduação Mínima</label>
        <select name="requiredGraduationId" value={formData.requiredGraduationId} onChange={handleChange} required className={selectStyles}>
           <option value="">Selecione uma graduação</option>
           {graduations.sort((a,b) => a.rank - b.rank).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
       <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Professor Responsável</label>
        <select 
            name="professorId" 
            value={formData.professorId} 
            onChange={handleChange} 
            required 
            className={selectStyles}
            disabled={!formData.academyId && user?.role === 'general_admin'}
        >
           <option value="">{(!formData.academyId && user?.role === 'general_admin') ? 'Selecione uma academia primeiro' : 'Selecione um professor'}</option>
           {availableProfessors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
       <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Assistentes (segure Ctrl/Cmd para selecionar vários)</label>
        <select
          name="assistantIds"
          value={formData.assistantIds || []}
          onChange={handleChange}
          multiple
          className={`${selectStyles} h-24`}
        >
          {availableProfessors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      
      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
};


const SchedulesPage: React.FC = () => {
  const { schedules, saveSchedule, deleteSchedule, loading, professors, academies, user, graduations } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Partial<ClassSchedule> | null>(null);
  
  // Favorites State
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
        const saved = localStorage.getItem('schedule_favorites');
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
  });

  const toggleFavorite = (scheduleId: string) => {
    setFavorites(prev => {
        const newFavs = prev.includes(scheduleId) 
            ? prev.filter(id => id !== scheduleId) 
            : [...prev, scheduleId];
        localStorage.setItem('schedule_favorites', JSON.stringify(newFavs));
        return newFavs;
    });
  };

  const filteredSchedules = useMemo(() => {
    let studentSchedules: ClassSchedule[] = [];
    if (user?.role === 'student') {
        // Students see schedules from their academy that match their graduation level
        const studentGrad = graduations.find(g => g.id === user?.studentId);
        studentSchedules = schedules.filter(s => {
            const requiredGrad = graduations.find(g => g.id === s.requiredGraduationId);
            return s.academyId === user.academyId && (studentGrad?.rank ?? 0) >= (requiredGrad?.rank ?? 0);
        });
        return studentSchedules;
    }
    if (user?.role === 'academy_admin') {
        return schedules.filter(s => s.academyId === user.academyId);
    }
    return schedules;
  }, [schedules, user, graduations]);


  const handleOpenModal = (schedule: Partial<ClassSchedule> | null = null) => {
    setSelectedSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSchedule(null);
  };

  const handleSave = async (scheduleData: Omit<ClassSchedule, 'id'> & { id?: string }) => {
    await saveSchedule(scheduleData);
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este horário?')) {
      await deleteSchedule(id);
    }
  };
  
  const isAdmin = user?.role === 'general_admin' || user?.role === 'academy_admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Horários das Turmas</h1>
        {isAdmin && <Button onClick={() => handleOpenModal({})}>Adicionar Horário</Button>}
      </div>
      
      {loading ? (
        <div className="text-center">Carregando horários...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredSchedules.sort((a,b) => {
                const dayA = DAYS_OF_WEEK_ORDER.indexOf(a.dayOfWeek as DayOfWeek);
                const dayB = DAYS_OF_WEEK_ORDER.indexOf(b.dayOfWeek as DayOfWeek);
                if (dayA !== dayB) return dayA - dayB;
                return a.startTime.localeCompare(b.startTime);
            }).map(schedule => {
                const professor = professors.find(p => p.id === schedule.professorId);
                const academy = academies.find(a => a.id === schedule.academyId);
                const requiredGrad = graduations.find(g => g.id === schedule.requiredGraduationId);
                const assistants = professors.filter(p => schedule.assistantIds.includes(p.id));
                const isFavorite = favorites.includes(schedule.id);

                return (
                    <Card key={schedule.id} className="p-0 flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1 relative h-full">
                        <div className="h-2 bg-amber-500"></div>
                        <div className="p-5 flex flex-col flex-grow relative">
                            {/* Favorite Button (Students Only) */}
                            {user?.role === 'student' && (
                                <button 
                                    onClick={() => toggleFavorite(schedule.id)}
                                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors z-10"
                                    title={isFavorite ? "Remover dos favoritos" : "Marcar como favorito"}
                                >
                                    <Heart 
                                        className={`w-6 h-6 transition-colors ${isFavorite ? 'text-red-500 fill-red-500' : 'text-slate-300'}`} 
                                    />
                                </button>
                            )}

                            <div className="flex-grow">
                                <p className="text-sm font-semibold text-amber-600 mb-1">{schedule.dayOfWeek}</p>
                                <h2 className="text-xl font-bold text-slate-800 pr-8">{schedule.className}</h2>
                                <p className="text-slate-500 font-medium text-lg mt-1">{schedule.startTime} - {schedule.endTime}</p>
                                
                                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-sm font-medium">Professor:</span>
                                        <span className="font-semibold text-slate-700">{professor?.name || 'N/A'}</span>
                                    </div>
                                    
                                    {/* Conditional display for academy name */}
                                    {user?.role === 'general_admin' && academy && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 text-sm font-medium">Academia:</span>
                                            <span className="font-medium text-slate-700 text-sm">{academy.name}</span>
                                        </div>
                                    )}

                                    {requiredGrad && (
                                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                                            <span className="text-xs text-slate-500 font-bold uppercase flex items-center">
                                                <Shield className="w-3 h-3 mr-1" /> Mínimo
                                            </span>
                                            <div className="flex items-center">
                                                <div 
                                                    className="w-3 h-3 rounded-full mr-2 border border-slate-300 shadow-sm" 
                                                    style={{ backgroundColor: requiredGrad.color }}
                                                />
                                                <span className="text-sm font-semibold text-slate-700">{requiredGrad.name}</span>
                                            </div>
                                        </div>
                                    )}

                                    {assistants.length > 0 && (
                                        <div>
                                            <span className="text-xs text-slate-500 font-bold uppercase flex items-center mb-1">
                                                <Users className="w-3 h-3 mr-1" /> Assistentes
                                            </span>
                                            <div className="flex flex-wrap gap-1">
                                                {assistants.map(a => (
                                                    <span key={a.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                        {a.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {isAdmin && (
                                <div className="mt-5 pt-4 border-t border-slate-200/60 flex justify-end gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => handleOpenModal(schedule)}>Editar</Button>
                                    <Button size="sm" variant="danger" onClick={() => handleDelete(schedule.id)}>Excluir</Button>
                                </div>
                            )}
                        </div>
                    </Card>
                );
            })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedSchedule?.id ? 'Editar Horário' : 'Adicionar Horário'}>
        <ScheduleForm schedule={selectedSchedule} onSave={handleSave} onClose={handleCloseModal} />
      </Modal>
    </div>
  );
};

export default SchedulesPage;