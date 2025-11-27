import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import Card from './ui/Card';
import { Building, ChevronDown, ChevronRight, User, Briefcase } from 'lucide-react';

const AcademiesPage: React.FC = () => {
    const { academies, professors, students, loading } = useContext(AppContext);
    const [expandedAcademy, setExpandedAcademy] = useState<string | null>(null);

    const toggleAcademy = (id: string) => {
        setExpandedAcademy(prev => (prev === id ? null : id));
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Academias</h1>
            
            {loading ? (
                <div className="text-center text-slate-500">Carregando academias...</div>
            ) : (
                <div className="space-y-4">
                    {academies.map(academy => {
                        const academyProfessors = professors.filter(p => p.academyId === academy.id);
                        const academyStudents = students.filter(s => s.academyId === academy.id);
                        const isExpanded = expandedAcademy === academy.id;

                        return (
                            <Card key={academy.id} className="p-0 overflow-hidden">
                                <button 
                                    className="w-full text-left p-4 flex justify-between items-center bg-slate-50 hover:bg-slate-100"
                                    onClick={() => toggleAcademy(academy.id)}
                                >
                                    <div className="flex items-center">
                                        <Building className="w-6 h-6 mr-3 text-primary"/>
                                        <div>
                                            <h2 className="font-bold text-slate-800">{academy.name}</h2>
                                            <p className="text-sm text-slate-500">{academy.address}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className="text-sm text-slate-500">{academyProfessors.length} Professores</span>
                                        <span className="text-sm text-slate-500">{academyStudents.length} Alunos</span>
                                        {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400"/> : <ChevronRight className="w-5 h-5 text-slate-400"/>}
                                    </div>
                                </button>
                                
                                {isExpanded && (
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200">
                                        {/* Professors List */}
                                        <div>
                                            <h3 className="font-semibold text-slate-700 mb-2 flex items-center"><Briefcase className="w-4 h-4 mr-2"/> Professores</h3>
                                            <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                                {academyProfessors.length > 0 ? academyProfessors.map(prof => (
                                                    <li key={prof.id} className="text-sm p-2 bg-slate-50 rounded-md">{prof.name}</li>
                                                )) : <li className="text-sm text-slate-400 italic">Nenhum professor.</li>}
                                            </ul>
                                        </div>
                                        {/* Students List */}
                                        <div>
                                            <h3 className="font-semibold text-slate-700 mb-2 flex items-center"><User className="w-4 h-4 mr-2"/> Alunos</h3>
                                            <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                                {academyStudents.length > 0 ? academyStudents.map(stud => (
                                                    <li key={stud.id} className="text-sm p-2 bg-slate-50 rounded-md">{stud.name}</li>
                                                )) : <li className="text-sm text-slate-400 italic">Nenhum aluno.</li>}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AcademiesPage;