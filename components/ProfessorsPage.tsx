import React, { useState, useContext, FormEvent, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Professor, Student, Graduation } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Users, X, MessageCircle, ExternalLink } from 'lucide-react';
import { ConfirmationModal } from './ui/ConfirmationModal';

// ... (existing validators and form components) ...

const getBeltStyle = (belt: Graduation) => {
    if (!belt) return { backgroundColor: '#e2e8f0' };
    if (!belt.color2) return { backgroundColor: belt.color };
    
    const angle = belt.gradientAngle ?? 90;
    const h = (belt.gradientHardness ?? 0) / 100;
    const c1 = belt.color;
    const c2 = belt.color2;
    const c3 = belt.color3 || belt.color2;

    if (c3 !== c2) {
        const s1 = h * 33.33;
        const s2 = 50 - (h * 16.67);
        const s3 = 50 + (h * 16.67);
        const s4 = 100 - (h * 33.33);
        return { background: `linear-gradient(${angle}deg, ${c1} ${s1}%, ${c2} ${s2}%, ${c2} ${s3}%, ${c3} ${s4}%)` };
    }
    const s1 = h * 50;
    const s2 = 100 - (h * 50);
    return { background: `linear-gradient(${angle}deg, ${c1} ${s1}%, ${c2} ${s2}%)` };
};

// ... (ProfessorForm, PhotoUploadModal, and most of ProfessorsPage logic remains) ...

const ProfessorsPage: React.FC = () => {
  // ... (context and state setup) ...
  const { professors, academies, graduations, saveProfessor, deleteProfessor, demoteInstructor, loading, students } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState<Partial<Professor> | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [professorForPhoto, setProfessorForPhoto] = useState<Professor | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [professorToDelete, setProfessorToDelete] = useState<Professor | null>(null);
  const [isDemoteModalOpen, setIsDemoteModalOpen] = useState(false);
  const [professorToDemote, setProfessorToDemote] = useState<Professor | null>(null);
  const [studentsListModal, setStudentsListModal] = useState<{ professorName: string, students: Student[] } | null>(null);

  const professorDanData = useMemo(() => {
    // ... (logic) ...
    const data = new Map<string, { dan: number }>();
    const blackBeltRank = graduations.find(g => g.name === 'Preta')?.rank || 5;

    professors.forEach(prof => {
        const profGraduation = graduations.find(g => g.id === prof.graduationId);
        if (!prof.blackBeltDate || !profGraduation || profGraduation.rank < blackBeltRank) {
            data.set(prof.id, { dan: 0 });
            return;
        }

        const blackBeltDate = new Date(prof.blackBeltDate);
        const today = new Date();
        const yearsAsBlackBelt = (today.getTime() - blackBeltDate.getTime()) / (1000 * 3600 * 24 * 365.25);

        let dan = 0;
        if (yearsAsBlackBelt >= 48) dan = 9;
        else if (yearsAsBlackBelt >= 38) dan = 8;
        else if (yearsAsBlackBelt >= 31) dan = 7;
        else if (yearsAsBlackBelt >= 24) dan = 6;
        else if (yearsAsBlackBelt >= 19) dan = 5;
        else if (yearsAsBlackBelt >= 14) dan = 4;
        else if (yearsAsBlackBelt >= 9) dan = 3;
        else if (yearsAsBlackBelt >= 6) dan = 2;
        else if (yearsAsBlackBelt >= 3) dan = 1;

        data.set(prof.id, { dan });
    });
    return data;
  }, [professors, graduations]);

  // ... (handlers) ...
  const handleOpenModal = (prof: Partial<Professor> | null = null) => { setSelectedProfessor(prof); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedProfessor(null); };
  const handleSave = async (profData: Omit<Professor, 'id'> & { id?: string }) => { await saveProfessor(profData); handleCloseModal(); };
  const handleDeleteClick = (prof: Professor) => { setProfessorToDelete(prof); setIsDeleteModalOpen(true); };
  const handleConfirmDelete = async () => { if (professorToDelete) { await deleteProfessor(professorToDelete.id); setProfessorToDelete(null); } };
  const handleDemoteClick = (e: React.MouseEvent, prof: Professor) => { e.stopPropagation(); setProfessorToDemote(prof); setIsDemoteModalOpen(true); };
  const handleConfirmDemote = async () => { if (professorToDemote) { await demoteInstructor(professorToDemote.id); setProfessorToDemote(null); } };
  const handleOpenPhotoModal = (prof: Professor) => { setProfessorForPhoto(prof); setIsPhotoModalOpen(true); };
  const handleClosePhotoModal = () => { setIsPhotoModalOpen(false); setProfessorForPhoto(null); };
  const handleSavePhoto = async (profToUpdate: Professor, newImageUrl: string) => { const { id, name, fjjpe_registration, cpf, academyId, graduationId, blackBeltDate, birthDate } = profToUpdate; await saveProfessor({ id, name, fjjpe_registration, cpf, academyId, graduationId, blackBeltDate, birthDate, imageUrl: newImageUrl }); handleClosePhotoModal(); };
  const handleWhatsAppClick = (phone: string | undefined) => { if (!phone) return; const cleanPhone = phone.replace(/\D/g, ''); const url = `https://wa.me/55${cleanPhone}`; window.open(url, '_blank'); };
  const handleShowStudents = (e: React.MouseEvent, prof: Professor) => { e.stopPropagation(); const associatedStudents = students.filter(s => s.academyId === prof.academyId); setStudentsListModal({ professorName: prof.name, students: associatedStudents }); };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Gerenciar Professores</h1>
        <Button onClick={() => handleOpenModal({})}>Adicionar Professor</Button>
      </div>

      {loading ? (
        <div className="text-center p-8 text-slate-500">Carregando professores...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {professors.map(prof => {
                const academy = academies.find(a => a.id === prof.academyId);
                const graduation = graduations.find(g => g.id === prof.graduationId);
                const { dan } = professorDanData.get(prof.id) || { dan: 0 };
                const age = prof.birthDate ? calculateAge(prof.birthDate) : null;
                const studentCount = students.filter(s => s.academyId === prof.academyId).length;
                
                return (
                    <Card key={prof.id} className="p-0 flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1 w-full relative">
                         {prof.isInstructor && graduation && (
                            <button 
                                onClick={(e) => handleDemoteClick(e, prof)}
                                className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full shadow-md border group transition-all hover:scale-105 hover:bg-red-50"
                                style={{ 
                                    backgroundColor: graduation.color,
                                    borderColor: graduation.color,
                                    color: graduation.color.toLowerCase() === '#ffffff' ? '#000' : '#fff'
                                }}
                                title="Clique para remover a promoção de instrutor (rebaixar a aluno)"
                            >
                                <span className="font-bold text-xs flex items-center">
                                    INSTRUTOR
                                    <X className={`w-3 h-3 ml-1 opacity-60 group-hover:opacity-100 ${graduation.color.toLowerCase() === '#ffffff' ? 'text-black' : 'text-white'}`} />
                                </span>
                            </button>
                        )}
                        <div 
                            className="h-2" 
                            style={graduation ? getBeltStyle(graduation) : { background: '#e2e8f0' }}
                        ></div>
                        <div className="p-5 flex flex-col flex-grow">
                            {/* ... (profile rendering) ... */}
                            <div className="flex items-center mb-4">
                                <button onClick={() => handleOpenPhotoModal(prof)} className="relative group flex-shrink-0">
                                    <img 
                                        src={prof.imageUrl || `https://ui-avatars.com/api/?name=${prof.name}`} 
                                        alt={prof.name} 
                                        className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 group-hover:opacity-75 transition-opacity shadow-sm"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full transition-opacity">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </div>
                                </button>
                                <div className="ml-4 overflow-hidden">
                                    <h2 className="text-xl font-bold text-slate-800 truncate">{prof.name}</h2>
                                    <p className="text-sm text-slate-500 truncate">{academy?.name || 'Sem Academia'}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-3 text-sm flex-grow">
                                {graduation && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600 font-medium">Graduação:</span>
                                        <div className="flex items-center">
                                            <span 
                                                className="w-4 h-4 rounded-full mr-2 border border-slate-300 shadow-sm" 
                                                style={getBeltStyle(graduation)}
                                            ></span>
                                            <span className="font-medium text-slate-700">{graduation.name}</span>
                                        </div>
                                    </div>
                                )}
                                {/* ... (rest of details) ... */}
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 font-medium">Registro:</span>
                                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-600">{prof.fjjpe_registration || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 font-medium">CPF:</span>
                                    <span className="text-slate-700">{prof.cpf}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 font-medium">Nascimento:</span>
                                    <span className="text-slate-700">
                                        {prof.birthDate ? `${new Date(prof.birthDate).toLocaleDateString()} (${age} anos)` : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 font-medium flex items-center">
                                        <Users className="w-3 h-3 mr-1" /> Alunos Associados:
                                    </span>
                                    <button 
                                        onClick={(e) => handleShowStudents(e, prof)}
                                        className="font-semibold text-primary bg-amber-50 hover:bg-amber-100 transition-colors px-2 py-0.5 rounded text-xs border border-amber-200 cursor-pointer flex items-center"
                                        title="Ver alunos"
                                    >
                                        {studentCount}
                                        <ExternalLink className="w-3 h-3 ml-1" />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <div className="pt-4 mt-4">
                                    <div 
                                        className="w-full h-8 rounded-md flex items-center justify-end shadow-inner relative overflow-hidden" 
                                        style={{ ...getBeltStyle(graduation as Graduation), border: '1px solid rgba(0,0,0,0.1)' }}
                                        title={`${graduation?.name}${dan > 0 ? ` - ${dan}º Dan` : ''}`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/5 pointer-events-none"></div>
                                        {dan > 0 && (
                                            <div className="h-full w-auto min-w-[25%] bg-red-600 flex items-center justify-center space-x-1 p-1 z-10 border-l-2 border-black">
                                                {Array.from({ length: dan }).map((_, index) => (
                                                    <div key={index} className="h-5 w-1 bg-white shadow-sm"></div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => handleOpenModal(prof)}>Editar</Button>
                                    <Button size="sm" variant="danger" onClick={() => handleDeleteClick(prof)}>Excluir</Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedProfessor?.id ? 'Editar Professor' : 'Adicionar Professor'}>
        <ProfessorForm professor={selectedProfessor} onSave={handleSave} onClose={handleCloseModal} />
      </Modal>

      {studentsListModal && (
          <Modal isOpen={true} onClose={() => setStudentsListModal(null)} title={`Alunos de ${studentsListModal.professorName}`} size="lg">
              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                  {studentsListModal.students.length > 0 ? (
                      <div className="space-y-2">
                          {studentsListModal.students.map(student => {
                              const belt = graduations.find(g => g.id === student.beltId);
                              return (
                                  <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                                      <div className="flex items-center">
                                          <img 
                                              src={student.imageUrl || `https://ui-avatars.com/api/?name=${student.name}`} 
                                              alt={student.name} 
                                              className="w-10 h-10 rounded-full object-cover mr-3 border border-slate-200"
                                          />
                                          <div>
                                              <p className="font-semibold text-slate-800 text-sm">{student.name}</p>
                                              {belt && (
                                                  <div className="flex items-center text-xs text-slate-500">
                                                      <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: belt.color, border: '1px solid #ddd' }}></span>
                                                      {belt.name}
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                      {student.phone && (
                                          <button
                                              onClick={() => handleWhatsAppClick(student.phone)}
                                              className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-sm flex items-center justify-center"
                                              title="Conversar no WhatsApp"
                                          >
                                              <MessageCircle className="w-4 h-4" />
                                          </button>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  ) : (
                      <div className="text-center py-8 text-slate-500">
                          Nenhum aluno associado a esta academia no momento.
                      </div>
                  )}
              </div>
              <div className="mt-6 flex justify-end pt-4 border-t border-slate-100">
                  <Button variant="secondary" onClick={() => setStudentsListModal(null)}>Fechar</Button>
              </div>
          </Modal>
      )}

      {isPhotoModalOpen && professorForPhoto && (
          <PhotoUploadModal
              professor={professorForPhoto}
              onSave={handleSavePhoto}
              onClose={handleClosePhotoModal}
          />
      )}

      <ConfirmationModal 
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Excluir Professor"
          message={`Tem certeza que deseja excluir o professor ${professorToDelete?.name}?`}
          confirmText="Sim, excluir"
          cancelText="Não"
          variant="danger"
      />
      
      <ConfirmationModal 
          isOpen={isDemoteModalOpen}
          onClose={() => setIsDemoteModalOpen(false)}
          onConfirm={handleConfirmDemote}
          title="Remover Promoção de Instrutor"
          message={`Tem certeza que deseja remover o status de Instrutor de ${professorToDemote?.name}? Ele voltará a ser apenas um Aluno e será removido desta lista de professores.`}
          confirmText="Sim, remover"
          cancelText="Cancelar"
          variant="danger"
      />
    </div>
  );
};

export default ProfessorsPage;