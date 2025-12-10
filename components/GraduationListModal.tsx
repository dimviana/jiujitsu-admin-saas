
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Student } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Filter, FileDown, CheckSquare, Square, ArrowUp, ArrowDown } from 'lucide-react';
import { generateGraduationReport } from '../services/graduationReportService';

interface GraduationListModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Helper to calculate frequency
const calculateFrequency = (student: Student, attendanceRecords: any[]) => {
    const promotionDate = student.lastPromotionDate || student.firstGraduationDate;
    if (!promotionDate) return 0;
    
    const startDate = new Date(promotionDate);
    const relevantRecords = attendanceRecords.filter(r => r.studentId === student.id && new Date(r.date) >= startDate);
    
    if (relevantRecords.length === 0) return 0;
    
    const present = relevantRecords.filter(r => r.status === 'present').length;
    return (present / relevantRecords.length) * 100;
};

export const GraduationListModal: React.FC<GraduationListModalProps> = ({ isOpen, onClose }) => {
    const { students, graduations, attendanceRecords, user, academies } = useContext(AppContext);
    
    const [filterBeltId, setFilterBeltId] = useState<string>('all');
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    
    // State to hold temporary changes for the report (stripes, next belt)
    const [reportConfig, setReportConfig] = useState<Record<string, { stripes: number, nextBeltId: string | '' }>>({});

    // Filter and Sort students
    const filteredStudents = useMemo(() => {
        let list = students.filter(s => s.status === 'active');
        if (filterBeltId !== 'all') {
            list = list.filter(s => s.beltId === filterBeltId);
        }
        
        return list.sort((a, b) => {
            const beltA = graduations.find(g => g.id === a.beltId);
            const beltB = graduations.find(g => g.id === b.beltId);
            
            const rankA = beltA?.rank || 0;
            const rankB = beltB?.rank || 0;

            // Sort by Rank
            if (rankA !== rankB) {
                return sortOrder === 'asc' ? rankA - rankB : rankB - rankA;
            }
            
            // Sort by Stripes
            const stripesA = a.stripes || 0;
            const stripesB = b.stripes || 0;
            
            if (stripesA !== stripesB) {
                 return sortOrder === 'asc' ? stripesA - stripesB : stripesB - stripesA;
            }

            // Sort by Name (Alphabetical always asc for consistency within same rank/stripes)
            return a.name.localeCompare(b.name);
        });
    }, [students, filterBeltId, graduations, sortOrder]);

    // Initialize report config when students change
    useMemo(() => {
        const config: Record<string, { stripes: number, nextBeltId: string | '' }> = {};
        const sortedGraduations = [...graduations].sort((a, b) => a.rank - b.rank);

        filteredStudents.forEach(student => {
            const currentBelt = graduations.find(g => g.id === student.beltId);
            let nextBeltId = '';
            
            if (currentBelt) {
                const nextBelt = sortedGraduations.find(g => g.rank > currentBelt.rank && g.type === currentBelt.type);
                if (nextBelt) nextBeltId = nextBelt.id;
            }

            // Preserve existing edits if re-rendering, otherwise set defaults
            if (reportConfig[student.id]) {
                config[student.id] = reportConfig[student.id];
            } else {
                config[student.id] = {
                    stripes: student.stripes,
                    nextBeltId: nextBeltId
                };
            }
        });
        setReportConfig(prev => ({ ...prev, ...config }));
    }, [filteredStudents, graduations]);

    const handleSelectAll = () => {
        if (selectedStudentIds.size === filteredStudents.length) {
            setSelectedStudentIds(new Set());
        } else {
            setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
        }
    };

    const toggleStudent = (id: string) => {
        const newSet = new Set(selectedStudentIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedStudentIds(newSet);
    };

    const updateConfig = (studentId: string, field: 'stripes' | 'nextBeltId', value: any) => {
        setReportConfig(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value
            }
        }));
    };

    const handleGeneratePDF = () => {
        const selectedStudentsList = filteredStudents.filter(s => selectedStudentIds.has(s.id));
        
        if (selectedStudentsList.length === 0) {
            alert("Selecione pelo menos um aluno para gerar o relatório.");
            return;
        }

        const reportItems = selectedStudentsList.map(student => {
            const config = reportConfig[student.id];
            const currentBelt = graduations.find(g => g.id === student.beltId);
            const nextBelt = config.nextBeltId ? graduations.find(g => g.id === config.nextBeltId) : undefined;
            const frequency = calculateFrequency(student, attendanceRecords);

            if (!currentBelt) return null;

            return {
                studentName: student.name,
                currentBelt: currentBelt,
                currentStripes: config.stripes,
                frequency: frequency,
                nextBelt: nextBelt,
                isPromotion: !!nextBelt && nextBelt.id !== currentBelt.id
            };
        }).filter(item => item !== null) as any[]; // Cast to remove nulls

        const academyName = user?.academyId 
            ? academies.find(a => a.id === user.academyId)?.name || 'Academia' 
            : 'Relatório Geral';

        generateGraduationReport(academyName, reportItems);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Lista de Graduação" size="4xl">
            <div className="space-y-4">
                {/* Filters */}
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 flex-wrap">
                    <Filter className="w-5 h-5 text-slate-500" />
                    <select 
                        value={filterBeltId}
                        onChange={(e) => setFilterBeltId(e.target.value)}
                        className="bg-white border border-slate-300 text-slate-700 rounded-md px-3 py-1.5 text-sm focus:ring-amber-500 outline-none"
                    >
                        <option value="all">Todas as Faixas Atuais</option>
                        {graduations.sort((a,b) => a.rank - b.rank).map(g => (
                            <option key={g.id} value={g.id}>{g.name} ({g.type === 'kids' ? 'Kids' : 'Adulto'})</option>
                        ))}
                    </select>
                    
                    <button 
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-1 bg-white border border-slate-300 text-slate-700 rounded-md px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors"
                        title={sortOrder === 'asc' ? "Ordenação: Menor para Maior Graduação" : "Ordenação: Maior para Menor Graduação"}
                    >
                        {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                        <span className="hidden sm:inline">{sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}</span>
                    </button>

                    <span className="text-sm text-slate-500 ml-auto w-full sm:w-auto text-right">
                        {filteredStudents.length} alunos encontrados
                    </span>
                </div>

                {/* Table */}
                <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 z-10">
                            <tr>
                                <th className="p-3 w-10 text-center cursor-pointer" onClick={handleSelectAll}>
                                    {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? 
                                        <CheckSquare className="w-5 h-5 text-amber-600" /> : 
                                        <Square className="w-5 h-5 text-slate-400" />
                                    }
                                </th>
                                <th className="p-3">Aluno</th>
                                <th className="p-3">Faixa Atual</th>
                                <th className="p-3 text-center">Freq.</th>
                                <th className="p-3 w-24 text-center">Graus (Novo)</th>
                                <th className="p-3">Próxima Faixa (Sugerida)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStudents.map(student => {
                                const isSelected = selectedStudentIds.has(student.id);
                                const currentBelt = graduations.find(g => g.id === student.beltId);
                                const config = reportConfig[student.id] || { stripes: 0, nextBeltId: '' };
                                const freq = calculateFrequency(student, attendanceRecords);

                                return (
                                    <tr key={student.id} className={`hover:bg-slate-50 ${isSelected ? 'bg-amber-50/30' : ''}`}>
                                        <td className="p-3 text-center cursor-pointer" onClick={() => toggleStudent(student.id)}>
                                            {isSelected ? 
                                                <CheckSquare className="w-5 h-5 text-amber-600 mx-auto" /> : 
                                                <Square className="w-5 h-5 text-slate-300 mx-auto" />
                                            }
                                        </td>
                                        <td className="p-3 font-medium text-slate-700">{student.name}</td>
                                        <td className="p-3">
                                            {currentBelt && (
                                                <div className="flex items-center">
                                                    <span className="w-3 h-3 rounded-full mr-2 border border-slate-300" style={{ backgroundColor: currentBelt.color }}></span>
                                                    {currentBelt.name} <span className="ml-1 text-slate-400 text-xs">({student.stripes}º)</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className={`p-3 text-center font-bold ${freq < 75 ? 'text-red-500' : 'text-green-600'}`}>
                                            {Math.round(freq)}%
                                        </td>
                                        <td className="p-3">
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max="10" 
                                                className="w-16 p-1 border border-slate-300 rounded text-center"
                                                value={config.stripes}
                                                onChange={(e) => updateConfig(student.id, 'stripes', parseInt(e.target.value))}
                                            />
                                        </td>
                                        <td className="p-3">
                                            <select 
                                                className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white"
                                                value={config.nextBeltId}
                                                onChange={(e) => updateConfig(student.id, 'nextBeltId', e.target.value)}
                                            >
                                                <option value="">Manter Atual</option>
                                                {graduations
                                                    .filter(g => g.type === currentBelt?.type) // Only show same type (kid/adult)
                                                    .sort((a,b) => a.rank - b.rank)
                                                    .map(g => (
                                                        <option key={g.id} value={g.id}>{g.name}</option>
                                                    ))
                                                }
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                    <span className="text-slate-500 text-sm">
                        {selectedStudentIds.size} alunos selecionados para o relatório.
                    </span>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleGeneratePDF} disabled={selectedStudentIds.size === 0}>
                            <FileDown className="w-4 h-4 mr-2" />
                            Gerar PDF de Graduação
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
