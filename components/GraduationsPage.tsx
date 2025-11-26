import React, { useState, useContext, FormEvent, useEffect, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Graduation, Student } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { ChevronDown, ChevronRight, UserCheck } from 'lucide-react';

interface GraduationFormProps {
  graduation: Partial<Graduation> | null;
  onSave: (grad: Omit<Graduation, 'id'> & { id?: string }) => void;
  onClose: () => void;
}

const GraduationForm: React.FC<GraduationFormProps> = ({ graduation, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    color: '#FFFFFF',
    minTimeInMonths: 0,
    rank: 0,
    type: 'adult' as 'adult' | 'kids',
    minAge: 0,
    maxAge: 0,
    ...graduation
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) || 0 : value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const selectStyles = "w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500";


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Nome da Faixa" name="name" value={formData.name} onChange={handleChange} required />
      <Input label="Ordem (Rank)" name="rank" type="number" value={formData.rank} onChange={handleChange} required readOnly/>
      <Input label="Cor" name="color" type="color" value={formData.color} onChange={handleChange} required />
       <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Graduação</label>
            <select name="type" value={formData.type} onChange={handleChange} className={selectStyles}>
                <option value="adult">Adulto</option>
                <option value="kids">Infantil</option>
            </select>
        </div>

        {formData.type === 'adult' ? (
            <Input label="Tempo Mínimo (meses)" name="minTimeInMonths" type="number" value={formData.minTimeInMonths} onChange={handleChange} required />
        ) : (
            <div className="grid grid-cols-2 gap-4">
                <Input label="Idade Mínima" name="minAge" type="number" value={formData.minAge} onChange={handleChange} />
                <Input label="Idade Máxima" name="maxAge" type="number" value={formData.maxAge} onChange={handleChange} />
            </div>
        )}
      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
};

const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birthDateObj = new Date(birthDate);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
        age--;
    }
    return age;
};


const GraduationsPage: React.FC = () => {
  const { graduations, saveGraduation, deleteGraduation, updateGraduationRanks, loading, students, academies, attendanceRecords } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGraduation, setSelectedGraduation] = useState<Partial<Graduation> | null>(null);
  const [localGraduations, setLocalGraduations] = useState<Graduation[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLocalGraduations([...graduations].sort((a,b) => a.rank - b.rank));
  }, [graduations]);

  const kidsGraduations = useMemo(() => localGraduations.filter(g => g.type === 'kids'), [localGraduations]);
  const adultGraduations = useMemo(() => localGraduations.filter(g => g.type === 'adult'), [localGraduations]);
  
  const groupedEligibleStudents = useMemo(() => {
    const grouped: Record<string, Array<{ student: Student, currentBelt: Graduation, nextBelt: Graduation, reason: string }>> = {};
    
    const allGrads = [...graduations].sort((a, b) => a.rank - b.rank);
    const adultBlueBelt = graduations.find(g => g.name === 'Azul' && g.type === 'adult');

    students.forEach(student => {
        const currentBelt = allGrads.find(g => g.id === student.beltId);
        if (!currentBelt) return;

        const age = calculateAge(student.birthDate || '');
        const promotionDate = student.lastPromotionDate || student.firstGraduationDate;
        
        let monthsInBelt = 0;
        if (promotionDate) {
            const pDate = new Date(promotionDate);
            const now = new Date();
            monthsInBelt = (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth());
        }

        // Logic for Kids
        if (currentBelt.type === 'kids') {
             // Special case: Green -> Blue at 16
             if (currentBelt.name.includes('Verde') && age >= 16 && adultBlueBelt) {
                 if (!grouped[adultBlueBelt.name]) grouped[adultBlueBelt.name] = [];
                 grouped[adultBlueBelt.name].push({ student, currentBelt, nextBelt: adultBlueBelt, reason: "Atingiu 16 anos (transição para adulto)" });
                 return;
             }

             const currentIndex = allGrads.findIndex(g => g.id === currentBelt.id);
             const nextBelt = allGrads[currentIndex + 1];
             
             // Check if next belt exists and is still kids
             if (nextBelt && nextBelt.type === 'kids') {
                 // Check age requirement
                 if (nextBelt.minAge && age >= nextBelt.minAge) {
                     // Optional: Check time in belt if enforced for kids
                     const timeReq = nextBelt.minTimeInMonths || 0;
                     if (monthsInBelt >= timeReq) {
                         if (!grouped[nextBelt.name]) grouped[nextBelt.name] = [];
                         grouped[nextBelt.name].push({ 
                             student, 
                             currentBelt, 
                             nextBelt, 
                             reason: `Idade: ${age} anos | Tempo: ${monthsInBelt}/${timeReq} meses` 
                         });
                     }
                 }
             }
        } 
        // Logic for Adults
        else if (currentBelt.type === 'adult') {
            const currentIndex = allGrads.findIndex(g => g.id === currentBelt.id);
            const nextBelt = allGrads[currentIndex + 1];

            if (nextBelt && nextBelt.type === 'adult') {
                const timeReq = currentBelt.minTimeInMonths; // Time required in CURRENT belt to go to next
                
                // Check Attendance (Example: > 70%)
                const relevantRecords = attendanceRecords.filter(r => r.studentId === student.id && new Date(r.date) >= new Date(promotionDate || 0));
                const presentCount = relevantRecords.filter(r => r.status === 'present').length;
                const totalRecords = relevantRecords.length;
                const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

                if (monthsInBelt >= timeReq && attendanceRate >= 70) {
                     if (!grouped[nextBelt.name]) grouped[nextBelt.name] = [];
                     grouped[nextBelt.name].push({
                         student,
                         currentBelt,
                         nextBelt,
                         reason: `Tempo: ${monthsInBelt}/${timeReq} meses | Freq: ${Math.round(attendanceRate)}%`
                     });
                }
            }
        }
    });

    return grouped;
  }, [students, graduations, attendanceRecords]);

  const toggleGroup = (group: string) => {
      setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };


  const handleOpenModal = (grad: Partial<Graduation> | null = null) => {
    setSelectedGraduation(grad);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGraduation(null);
  };

  const handleSave = async (gradData: Omit<Graduation, 'id'> & { id?: string }) => {
    await saveGraduation(gradData);
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta graduação?')) {
      await deleteGraduation(id);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, grad: Graduation) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(grad.id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDrop = (targetGrad: Graduation) => {
    if (!draggedId || draggedId === targetGrad.id) {
        setDraggedId(null);
        return;
    }

    const reordered = [...localGraduations];
    const draggedIndex = reordered.findIndex(g => g.id === draggedId);
    const targetIndex = reordered.findIndex(g => g.id === targetGrad.id);

    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, draggedItem);
    
    setLocalGraduations(reordered);

    const payload = reordered.map((g, index) => ({ id: g.id, rank: index + 1 }));
    updateGraduationRanks(payload);
    
    setDraggedId(null);
  };

  const renderGraduationTable = (grads: Graduation[], title: string) => (
    <Card>
        <h2 className="text-xl font-bold text-slate-800 mb-4">{title}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="p-4 text-sm font-semibold text-slate-600">Ordem</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Nome</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Cor</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Requisito</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-4 text-center">Carregando...</td></tr>
              ) : grads.map((grad) => (
                <tr 
                  key={grad.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, grad)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(grad)}
                  className={`hover:bg-slate-50 transition-colors ${draggedId === grad.id ? 'opacity-30 bg-amber-50' : ''}`}
                  style={{ cursor: 'move' }}
                >
                  <td className="p-4 text-slate-500 font-mono text-xs">{grad.rank}</td>
                  <td className="p-4 text-slate-800 font-medium">{grad.name}</td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <span className="w-6 h-6 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: grad.color }}></span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 text-sm">
                    {grad.type === 'kids' ? `${grad.minAge} - ${grad.maxAge} anos` : `${grad.minTimeInMonths} meses`}
                  </td>
                  <td className="p-4 flex gap-2 justify-end">
                    <Button variant="secondary" size="sm" onClick={() => handleOpenModal(grad)}>Editar</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(grad.id)}>Excluir</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </Card>
  );


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Gerenciar Graduações</h1>
        <Button onClick={() => handleOpenModal({ rank: localGraduations.length + 1 })}>Adicionar Graduação</Button>
      </div>
      
      {/* Eligibility Section */}
      <Card className="bg-gradient-to-r from-slate-50 to-white border-l-4 border-l-amber-500">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center">
                    <UserCheck className="w-6 h-6 mr-2 text-amber-500" />
                    Alunos Elegíveis para Promoção
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Alunos que atingiram os requisitos mínimos de tempo e idade para a próxima faixa.
                </p>
            </div>
        </div>

        {loading ? (
          <div className="text-center p-8 text-slate-400">Calculando elegibilidade...</div>
        ) : Object.keys(groupedEligibleStudents).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedEligibleStudents).map(([beltName, students]) => (
                <div key={beltName} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                    <button 
                        onClick={() => toggleGroup(beltName)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                        <div className="flex items-center">
                            <span className="font-bold text-slate-700 mr-3">Candidatos à {beltName}</span>
                            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-medium">{students.length} alunos</span>
                        </div>
                        {openGroups[beltName] ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                    </button>
                    
                    {openGroups[beltName] && (
                        <div className="divide-y divide-slate-100">
                            {students.map(({ student, currentBelt, nextBelt, reason }) => {
                                const academy = academies.find(a => a.id === student.academyId);
                                return (
                                    <div key={student.id} className="p-4 flex flex-col sm:flex-row items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center mb-3 sm:mb-0 w-full sm:w-auto">
                                            <img src={student.imageUrl || `https://ui-avatars.com/api/?name=${student.name}`} alt={student.name} className="w-10 h-10 rounded-full object-cover mr-4 border border-slate-200" />
                                            <div>
                                                <p className="font-bold text-slate-800">{student.name}</p>
                                                <p className="text-xs text-slate-500">{academy?.name}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                            <div className="text-right mr-4">
                                                <div className="flex items-center justify-end text-sm text-slate-600">
                                                    <span className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: currentBelt.color}}></span>
                                                    {currentBelt.name}
                                                    <ChevronRight className="w-4 h-4 mx-1 text-slate-400" />
                                                    <span className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: nextBelt.color}}></span>
                                                    <span className="font-bold text-slate-800">{nextBelt.name}</span>
                                                </div>
                                                <p className="text-xs text-green-600 font-medium mt-1">{reason}</p>
                                            </div>
                                            {/* In a real app, add a "Promote" button here linked to the student action */}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <p className="text-slate-500">Nenhum aluno elegível para promoção no momento.</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {renderGraduationTable(kidsGraduations, 'Sistema Infantil (4-15 anos)')}
          {renderGraduationTable(adultGraduations, 'Sistema Adulto (16+ anos)')}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedGraduation?.id ? 'Editar Graduação' : 'Adicionar Graduação'}>
        <GraduationForm graduation={selectedGraduation} onSave={handleSave} onClose={handleCloseModal} />
      </Modal>
    </div>
  );
};

export default GraduationsPage;