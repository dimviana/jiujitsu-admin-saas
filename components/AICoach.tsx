import React, { useState } from 'react';
import { generateClassPlan, generateStudentFeedback } from '../services/geminiService';
import { Student } from '../types';
import { Sparkles, BookOpen, UserCheck, Loader } from 'lucide-react';

interface AICoachProps {
    students: Student[];
}

export const AICoach: React.FC<AICoachProps> = ({ students }) => {
    const [mode, setMode] = useState<'class' | 'student'>('class');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Class Plan Inputs
    const [classLevel, setClassLevel] = useState('Iniciante');
    const [classFocus, setClassFocus] = useState('Passagem de Guarda');

    // Student Feedback Inputs
    const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
    const [performanceNote, setPerformanceNote] = useState('');

    const handleGenerateClass = async () => {
        setLoading(true);
        setResult(null);
        const plan = await generateClassPlan(classLevel, classFocus);
        setResult(plan);
        setLoading(false);
    };

    const handleGenerateFeedback = async () => {
        const student = students.find(s => s.id === selectedStudentId);
        if (!student) return;
        setLoading(true);
        setResult(null);
        const feedback = await generateStudentFeedback(student, performanceNote);
        setResult(feedback);
        setLoading(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center mb-4">
                        <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
                        IA Coach
                    </h3>
                    
                    <div className="flex space-x-2 mb-6">
                        <button 
                            onClick={() => { setMode('class'); setResult(null); }}
                            className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${mode === 'class' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            Plano de Aula
                        </button>
                        <button 
                            onClick={() => { setMode('student'); setResult(null); }}
                            className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${mode === 'student' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            Feedback Aluno
                        </button>
                    </div>

                    {mode === 'class' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nível da Aula</label>
                                <select 
                                    value={classLevel} 
                                    onChange={(e) => setClassLevel(e.target.value)}
                                    className="w-full border-slate-200 rounded-lg text-sm"
                                >
                                    <option>Iniciante (Branca)</option>
                                    <option>Intermediário (Azul/Roxa)</option>
                                    <option>Avançado (Marrom/Preta)</option>
                                    <option>Kids (4-8 anos)</option>
                                    <option>Kids (9-14 anos)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Foco Técnico</label>
                                <input 
                                    type="text" 
                                    value={classFocus}
                                    onChange={(e) => setClassFocus(e.target.value)}
                                    className="w-full border-slate-200 rounded-lg text-sm"
                                    placeholder="Ex: Raspagem de gancho"
                                />
                            </div>
                            <button 
                                onClick={handleGenerateClass}
                                disabled={loading}
                                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                            >
                                {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Gerar Plano'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Selecionar Aluno</label>
                                <select 
                                    value={selectedStudentId} 
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                    className="w-full border-slate-200 rounded-lg text-sm"
                                >
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Observação Recente</label>
                                <textarea 
                                    value={performanceNote}
                                    onChange={(e) => setPerformanceNote(e.target.value)}
                                    className="w-full border-slate-200 rounded-lg text-sm"
                                    rows={3}
                                    placeholder="Ex: Está com dificuldade na defesa de passagens emborcadas..."
                                />
                            </div>
                            <button 
                                onClick={handleGenerateFeedback}
                                disabled={loading}
                                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                            >
                                {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Gerar Feedback'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[400px]">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Resultado da IA</h3>
                    
                    {!result && !loading && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <Sparkles className="w-12 h-12 mb-2 opacity-20" />
                            <p>Selecione os parâmetros e clique em gerar.</p>
                        </div>
                    )}

                    {loading && (
                        <div className="h-full flex flex-col items-center justify-center text-purple-600">
                            <Loader className="w-10 h-10 animate-spin mb-4" />
                            <p className="animate-pulse">A IA está pensando...</p>
                        </div>
                    )}

                    {result && mode === 'class' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                <h4 className="font-bold text-purple-800 flex items-center"><ActivityIcon className="w-4 h-4 mr-2"/> Aquecimento (Warm-up)</h4>
                                <p className="text-slate-700 mt-1 whitespace-pre-wrap">{result.warmup}</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <h4 className="font-bold text-blue-800 flex items-center"><BookOpen className="w-4 h-4 mr-2"/> Técnica (Drill)</h4>
                                <p className="text-slate-700 mt-1 whitespace-pre-wrap">{result.drill}</p>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                                <h4 className="font-bold text-orange-800 flex items-center"><UserCheck className="w-4 h-4 mr-2"/> Rola (Sparring)</h4>
                                <p className="text-slate-700 mt-1 whitespace-pre-wrap">{result.sparring}</p>
                            </div>
                        </div>
                    )}

                    {result && mode === 'student' && (
                        <div className="prose prose-slate max-w-none animate-fade-in-up">
                            <div className="whitespace-pre-wrap text-slate-700 bg-slate-50 p-6 rounded-lg">
                                {result}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ActivityIcon = ({className}: {className: string}) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
)
