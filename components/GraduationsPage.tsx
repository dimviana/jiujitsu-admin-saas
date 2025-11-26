import React, { useState, useContext, FormEvent, useEffect, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Graduation, Student as StudentType } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';

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
  const { graduations, saveGraduation, deleteGraduation, updateGraduationRanks, loading, students, academies } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGraduation, setSelectedGraduation] = useState<Partial<Graduation> | null>(null);
  const [localGraduations, setLocalGraduations] = useState<Graduation[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    setLocalGraduations([...graduations].sort((a,b) => a.rank - b.rank));
  }, [graduations]);

  const kidsGraduations = useMemo(() => localGraduations.filter(g => g.type === 'kids'), [localGraduations]);
  const adultGraduations = useMemo(() => localGraduations.filter(g => g.type === 'adult'), [localGraduations]);
  
  const eligibleForNextBeltKids = useMemo(() => {
    const allKidsGrads = graduations.filter(g => g.type === 'kids').sort((a, b) => a.rank - b.rank);
    const adultBlueBelt = graduations.find(g => g.name === 'Azul');

    return students
        .map(student => {
            const age = calculateAge(student.birthDate || '');
            if (age >= 16) {
                // Special case: Green belt turning 16 is eligible for Blue
                const currentBelt = graduations.find(g => g.id === student.beltId);
                if (currentBelt?.name === 'Verde' && adultBlueBelt) {
                     return { student, nextBelt: adultBlueBelt, reason: `Atingiu 16 anos` };
                }
                return null;
            }
            
            const currentBelt = allKidsGrads.find(g => g.id === student.beltId);
            if (!currentBelt) return null; // Not in the kids system
            
            const currentBeltIndex = allKidsGrads.findIndex(g => g.id === currentBelt.id);
            const nextBelt = allKidsGrads[currentBeltIndex + 1];

            if (nextBelt && nextBelt.minAge && age >= nextBelt.minAge) {
                 return { student, nextBelt, reason: `Atingiu ${nextBelt.minAge} anos` };
            }

            return null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [students, graduations]);


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
        <h2 className="text-xl font-bold text-amber-600 mb-4">{title}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="p-4 text-sm font-semibold text-slate-600">Ordem</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Nome</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Cor</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Requisito</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody>
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
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-opacity ${draggedId === grad.id ? 'opacity-30' : 'opacity-100'}`}
                  style={{ cursor: 'move' }}
                >
                  <td className="p-4 text-slate-700">{grad.rank}</td>
                  <td className="p-4 text-slate-800 font-medium">{grad.name}</td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <span className="w-6 h-6 rounded-full border border-slate-300" style={{ backgroundColor: grad.color }}></span>
                      <span className="ml-3 text-slate-700 font-mono">{grad.color}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-700">
                    {grad.type === 'kids' ? `Idade: ${grad.minAge} - ${grad.maxAge}` : `${grad.minTimeInMonths} meses`}
                  </td>
                  <td className="p-4 flex gap-2">
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Gerenciar Graduações</h1>
        <Button onClick={() => handleOpenModal({ rank: localGraduations.length + 1 })}>Adicionar Graduação</Button>
      </div>
      
      {renderGraduationTable(kidsGraduations, 'Graduações Infantis')}
      {renderGraduationTable(adultGraduations, 'Graduações Adultos')}

      <Card>
        <h2 className="text-xl font-bold text-amber-600 mb-4">Alunos Elegíveis para Próxima Faixa (Infantil)</h2>
        <p className="text-sm text-slate-500 mb-6">
          Alunos que atingiram a idade mínima para a próxima graduação infantil, ou que completaram 16 anos na faixa verde.
        </p>
        {loading ? (
          <div className="text-center p-4">Calculando elegibilidade...</div>
        ) : eligibleForNextBeltKids.length > 0 ? (
          <div className="space-y-4">
            {eligibleForNextBeltKids.map(({ student, nextBelt, reason }) => {
              const currentBelt = graduations.find(g => g.id === student.beltId);
              const academy = academies.find(a => a.id === student.academyId);
              return (
                <div key={student.id} className="flex flex-col sm:flex-row items-center p-3 bg-slate-50 rounded-lg border border-slate-200 gap-4">
                  <img src={student.imageUrl || `https://i.pravatar.cc/150?u=${student.cpf}`} alt={student.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  <div className="flex-grow w-full grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-center sm:text-left">
                    <div>
                      <p className="font-bold text-slate-800">{student.name}</p>
                      <p className="text-sm text-slate-500">{academy?.name || 'N/A'}</p>
                    </div>
                    <div className="text-center">
                       <p className="font-semibold text-slate-700 flex items-center justify-center">
                        <span className="w-3 h-3 rounded-full mr-2 border" style={{backgroundColor: currentBelt?.color}}></span> {currentBelt?.name}
                         <span className="mx-2">&rarr;</span>
                        <span className="w-3 h-3 rounded-full mr-2 border" style={{backgroundColor: nextBelt?.color}}></span> {nextBelt.name}
                      </p>
                      <p className="text-xs text-slate-500">Motivo: {reason}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-slate-700">Idade Atual</p>
                        <p className="font-bold text-lg text-amber-600">{calculateAge(student.birthDate || '')} anos</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-slate-500 py-4">Nenhum aluno elegível no momento.</p>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedGraduation?.id ? 'Editar Graduação' : 'Adicionar Graduação'}>
        <GraduationForm graduation={selectedGraduation} onSave={handleSave} onClose={handleCloseModal} />
      </Modal>
    </div>
  );
};

export default GraduationsPage;