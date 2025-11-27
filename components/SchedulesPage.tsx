import React, { useState, useContext, FormEvent, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { ClassSchedule, DayOfWeek } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';

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
    academyId: user?.role === 'academy_admin' ? user.academyId || '' : '',
    requiredGraduationId: '',
    ...schedule
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'assistantIds' && e.target instanceof HTMLSelectElement) {
      // FIX: Use selectedOptions and explicitly type `option` to resolve errors on `.selected` and `.value`.
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
        <label className="block text-sm font-medium text-slate-700 mb-1">Professor</label>
        <select name="professorId" value={formData.professorId} onChange={handleChange} required className={selectStyles}>
           <option value="">Selecione um professor</option>
           {professors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
          {professors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
       {user?.role === 'general_admin' && (
         <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Academia</label>
            <select name="academyId" value={formData.academyId} onChange={handleChange} required className={selectStyles}>
               <option value="">Selecione uma academia</option>
               {academies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
         </div>
       )}
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

                return (
                    <Card key={schedule.id} className="p-0 flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1">
                        <div className="h-2 bg-amber-500"></div>
                        <div className="p-5 flex flex-col flex-grow">
                            <div className="flex-grow">
                                <p className="text-sm font-semibold text-amber-600">{schedule.dayOfWeek}</p>
                                <h2 className="text-xl font-bold text-slate-800 mt-1">{schedule.className}</h2>
                                <p className="text-slate-500 font-medium">{schedule.startTime} - {schedule.endTime}</p>
                                <div className="mt-4 space-y-3 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600 font-medium">Professor:</span>
                                        <span className="font-medium text-slate-700">{professor?.name || 'N/A'}</span>
                                    </div>
                                    {/* Conditional display for academy name */}
                                    {user?.role === 'general_admin' && academy && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-600 font-medium">Academia:</span>
                                            <span className="font-medium text-slate-700">{academy.name}</span>
                                        </div>
                                    )}
                                    {requiredGrad && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-600 font-medium">Mínimo:</span>
                                            <div className="flex items-center">
                                                <span className="w-4 h-4 rounded-full mr-2 border border-slate-300" style={{ backgroundColor: requiredGrad.color }}></span>
                                                <span className="font-medium text-slate-700">{requiredGrad.name}</span>
                                            </div>
                                        </div>
                                    )}
                                    {assistants.length > 0 && (
                                        <div className="flex justify-between items-start">
                                            <span className="text-slate-600 font-medium pt-1">Assistentes:</span>
                                            <div className="text-right">
                                                {assistants.map(a => <p key={a.id} className="font-medium text-slate-700">{a.name}</p>)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-auto">
                                {isAdmin && (
                                    <div className="mt-5 pt-4 border-t border-slate-200/60 flex justify-end gap-2">
                                        <Button size="sm" variant="secondary" onClick={() => handleOpenModal(schedule)}>Editar</Button>
                                        <Button size="sm" variant="danger" onClick={() => handleDelete(schedule.id)}>Excluir</Button>
                                    </div>
                                )}
                            </div>
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