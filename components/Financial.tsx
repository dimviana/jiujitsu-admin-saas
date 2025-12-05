
import React, { useState, useMemo, useContext, useEffect } from 'react';
import { Student, Expense } from '../types';
import { Users, DollarSign, Upload, MessageSquareWarning, FileText, GraduationCap, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';
import { AppContext } from '../context/AppContext';
import jsPDF from 'jspdf';

// --- Charts ---
const FinancialStatusChart: React.FC<{ paidCount: number; unpaidCount: number; scholarshipCount: number }> = ({ paidCount, unpaidCount, scholarshipCount }) => {
    const data = [
        { name: 'Em Dia', value: paidCount, color: '#10B981' },
        { name: 'Inadimplente', value: unpaidCount, color: '#EF4444' },
        { name: 'Bolsista', value: scholarshipCount, color: '#8B5CF6' }
    ].filter(d => d.value > 0);

    if (paidCount === 0 && unpaidCount === 0 && scholarshipCount === 0) {
         return <div className="h-64 flex items-center justify-center text-slate-400">Sem dados financeiros.</div>;
    }

    return (
        <Card className="h-full min-h-[300px]">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Status de Pagamentos</h3>
            <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                    <span className="text-3xl font-bold text-slate-700">{paidCount + unpaidCount + scholarshipCount}</span>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">Total</span>
                </div>
            </div>
            <div className="flex justify-center gap-6 mt-4 flex-wrap">
                {data.map(d => (
                    <div key={d.name} className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: d.color }}></div>
                        <span className="text-sm text-slate-600">{d.name} ({d.value})</span>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const ExpensesChart: React.FC<{ expenses: Expense[] }> = ({ expenses }) => {
    const data = useMemo(() => {
        const today = new Date();
        const last6Months: { name: string; key: string; amount: number }[] = [];
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
            last6Months.push({
                name: monthNames[d.getMonth()],
                key: monthKey,
                amount: 0
            });
        }

        expenses.forEach(exp => {
            const expMonth = exp.date.slice(0, 7);
            const monthData = last6Months.find(m => m.key === expMonth);
            if (monthData) {
                monthData.amount += exp.amount;
            }
        });

        return last6Months;
    }, [expenses]);

    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <Card className="h-full min-h-[300px]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Despesas (Últimos 6 Meses)</h3>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">Total: {totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `R$${value}`} />
                        <Tooltip 
                            cursor={{fill: '#f1f5f9'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                            formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Valor']}
                        />
                        <Bar dataKey="amount" fill="#f87171" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

// --- Sub-Modals ---
const PaymentHistoryModal: React.FC<{ student: Student; onClose: () => void, onRegisterPayment: () => void }> = ({ student, onClose, onRegisterPayment }) => {
    return (
        <Modal isOpen={true} onClose={onClose} title={`Histórico de ${student.name}`}>
            <div className="space-y-4">
                {student.paymentHistory && student.paymentHistory.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        <ul className="space-y-2">
                            {student.paymentHistory.slice().reverse().map(payment => (
                                <li key={payment.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-slate-600">Data: {new Date(payment.date).toLocaleDateString()}</span>
                                    <span className="font-bold text-green-600">
                                        {payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div className="py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <p className="text-slate-500">Nenhum pagamento registrado.</p>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button type="button" variant="secondary" onClick={onClose}>Fechar</Button>
                    {student.paymentStatus !== 'scholarship' && (
                        <Button type="button" onClick={onRegisterPayment}>Registrar Novo Pagamento</Button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

const UploadProofModal: React.FC<{ student: Student; onClose: () => void, onConfirm: () => Promise<void> }> = ({ student, onClose, onConfirm }) => {
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            if (e.target.files[0].type === 'application/pdf') {
                setProofFile(e.target.files[0]);
            } else {
                alert('Por favor, selecione um arquivo PDF.');
                e.target.value = '';
                setProofFile(null);
            }
        }
    };

    const handleSaveClick = async () => {
        if (!proofFile) return;
        setIsSaving(true);
        await onConfirm();
        setIsSaving(false);
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Enviar Comprovante - ${student.name}`}>
            <div className="space-y-4">
                <p className="text-sm text-slate-600">Para registrar o pagamento, é necessário fazer o upload do comprovante em formato PDF.</p>
                <label
                    htmlFor="receipt-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-slate-400" />
                        <p className="mb-2 text-sm text-slate-500">
                            <span className="font-semibold">Clique para enviar o comprovante</span>
                        </p>
                        <p className="text-xs text-slate-400">Apenas arquivos PDF (obrigatório)</p>
                    </div>
                    <input id="receipt-upload" type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
                </label>
                
                {proofFile && (
                    <div className="bg-green-50 p-3 rounded-lg flex items-center text-green-700 text-sm">
                        <span className="font-bold mr-2">✓</span> {proofFile.name}
                    </div>
                )}
            </div>
            <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSaveClick} disabled={!proofFile || isSaving}>
                    {isSaving ? 'Enviando...' : 'Confirmar Pagamento'}
                </Button>
            </div>
        </Modal>
    );
};

const ExpenseModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (data: any) => Promise<void> }> = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onSave({
            description: formData.description,
            amount: parseFloat(formData.amount),
            date: formData.date
        });
        setLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cadastrar Despesa">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input 
                    label="Descrição" 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})} 
                    required 
                    placeholder="Ex: Aluguel, Luz, Equipamentos"
                />
                <Input 
                    label="Valor (R$)" 
                    type="number" 
                    step="0.01" 
                    value={formData.amount} 
                    onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                    required 
                />
                <Input 
                    label="Data" 
                    type="date" 
                    value={formData.date} 
                    onChange={(e) => setFormData({...formData, date: e.target.value})} 
                    required 
                />
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Despesa'}</Button>
                </div>
            </form>
        </Modal>
    );
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <Card className="flex items-center">
        <div className={`p-3 rounded-lg mr-4 text-white shadow-sm`} style={{ backgroundColor: color }}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </Card>
);

// New Automatic Reminder Modal
const ReminderModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    students: Student[];
    onSendAll: () => void;
}> = ({ isOpen, onClose, students, onSendAll }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Lembretes de Pagamento">
        <div className="space-y-4">
            <div className="flex items-start bg-amber-50 p-4 rounded-lg border border-amber-200">
                <MessageSquareWarning className="w-8 h-8 text-amber-500 mr-4 flex-shrink-0" />
                <div>
                    <h4 className="font-bold text-amber-800">Alunos com Vencimento Próximo</h4>
                    <p className="text-sm text-amber-700 mt-1">Os seguintes alunos têm mensalidades vencendo nos próximos dias. Deseja enviar um lembrete via WhatsApp para todos?</p>
                </div>
            </div>

            <div className="max-h-60 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                {students.map(student => (
                    <div key={student.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-md">
                        <span className="font-medium text-slate-700">{student.name}</span>
                        <span className="text-sm text-slate-500">Vence dia {student.paymentDueDateDay}</span>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" onClick={onClose}>Lembrar Mais Tarde</Button>
                <Button onClick={onSendAll}>Enviar Lembretes para Todos</Button>
            </div>
        </div>
    </Modal>
);

export const Financial: React.FC = () => {
    const { students, graduations, themeSettings, setThemeSettings, updateStudentPayment, expenses, saveExpense } = useContext(AppContext);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [updatedCard, setUpdatedCard] = useState<string | null>(null);
    const [isValuesModalOpen, setIsValuesModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    
    // Safely initialize with a number fallback
    const [feeAmount, setFeeAmount] = useState(Number(themeSettings.monthlyFeeAmount) || 0);
    const [feeAmountInput, setFeeAmountInput] = useState((Number(themeSettings.monthlyFeeAmount) || 0).toFixed(2));
    
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

    const { paidStudents, unpaidStudents, scholarshipStudents, totalRevenue } = useMemo(() => {
        const paid = students.filter(s => s.paymentStatus === 'paid');
        const unpaid = students.filter(s => s.paymentStatus === 'unpaid');
        const scholarship = students.filter(s => s.paymentStatus === 'scholarship');
        const revenue = paid.length * (Number(themeSettings.monthlyFeeAmount) || 0);
        return {
            paidStudents: paid.length,
            unpaidStudents: unpaid.length,
            scholarshipStudents: scholarship.length,
            totalRevenue: revenue,
        };
    }, [students, themeSettings.monthlyFeeAmount]);

    const { remindersToSend, overduePayments } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const reminders: Student[] = [];
        const overdue: Student[] = [];

        students.forEach(student => {
            // Skip scholarship students for reminders and overdue logic
            if (!student.paymentDueDateDay || student.paymentStatus === 'scholarship') return;

            const dueDateThisMonth = new Date(today.getFullYear(), today.getMonth(), student.paymentDueDateDay);
            
            const lastDueDate = dueDateThisMonth > today 
                ? new Date(today.getFullYear(), today.getMonth() - 1, student.paymentDueDateDay)
                : dueDateThisMonth;
            
            let nextDueDate = new Date(today.getFullYear(), today.getMonth(), student.paymentDueDateDay);
            if(today.getDate() > student.paymentDueDateDay){
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            }

            if (student.paymentStatus === 'unpaid') {
                const daysSinceLastDue = Math.round((today.getTime() - lastDueDate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysSinceLastDue > 0 && daysSinceLastDue <= (themeSettings.overdueDaysAfterDue || 5)) {
                    overdue.push(student);
                }

                const daysUntilNextDue = Math.round((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                if (daysUntilNextDue >= 0 && daysUntilNextDue <= (themeSettings.reminderDaysBeforeDue || 5)) {
                    reminders.push(student);
                }
            }
        });

        return { remindersToSend: reminders, overduePayments: overdue };
    }, [students, themeSettings]);

    // Effect for automatic reminder modal
    useEffect(() => {
        const reminderShown = sessionStorage.getItem('reminderModalShown');
        if (remindersToSend.length > 0 && !reminderShown) {
            setIsReminderModalOpen(true);
            sessionStorage.setItem('reminderModalShown', 'true');
        }
    }, [remindersToSend]);
    
    // Safety update when theme settings change
    useEffect(() => {
        const val = Number(themeSettings.monthlyFeeAmount) || 0;
        setFeeAmount(val);
        setFeeAmountInput(val.toFixed(2));
    }, [themeSettings]);

    const handleSaveFeeAmount = () => {
        setThemeSettings({ ...themeSettings, monthlyFeeAmount: feeAmount });
        setIsValuesModalOpen(false);
    };
    
    const handleFeeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFeeAmountInput(e.target.value);
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
            setFeeAmount(val);
        }
    };
    
    const handleFeeInputBlur = () => {
        const val = parseFloat(feeAmountInput);
        if (!isNaN(val)) {
            setFeeAmountInput(val.toFixed(2));
            setFeeAmount(val);
        } else {
            setFeeAmountInput('0.00');
            setFeeAmount(0);
        }
    };

    const handleSendReminder = (phone: string, name: string) => {
        if (!phone) return alert("Telefone não cadastrado.");
        const message = `Olá ${name}, tudo bem? Passando para lembrar que sua mensalidade está próxima do vencimento. Qualquer dúvida, estamos à disposição!`;
        const encodedMessage = encodeURIComponent(message);
        const sanitizedPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/55${sanitizedPhone}?text=${encodedMessage}`, '_blank');
    };
    
    const handleSendAllReminders = () => {
        remindersToSend.forEach(student => {
            handleSendReminder(student.phone || '', student.name);
        });
        setIsReminderModalOpen(false);
    };

    const handleSendOverdueNotice = (phone: string, name: string) => {
        if (!phone) return alert("Telefone não cadastrado.");
        const message = `Olá ${name}, tudo bem? Identificamos que sua mensalidade está em atraso. Por favor, regularize sua situação o mais breve possível. Obrigado!`;
        const encodedMessage = encodeURIComponent(message);
        const sanitizedPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/55${sanitizedPhone}?text=${encodedMessage}`, '_blank');
    };

    const handleOpenHistoryModal = (student: Student) => {
        setSelectedStudent(student);
        setIsHistoryModalOpen(true);
    };

    const handleCloseHistoryModal = () => {
        setSelectedStudent(null);
        setIsHistoryModalOpen(false);
    };

    const handleRegisterPayment = () => {
        if (selectedStudent) {
            setIsUploadModalOpen(true);
            setIsHistoryModalOpen(false);
        }
    };
    
    const confirmPayment = async () => {
        if (selectedStudent) {
            await updateStudentPayment(selectedStudent.id, 'paid');
            setUpdatedCard(selectedStudent.id);
            setTimeout(() => {
                setUpdatedCard(null);
            }, 2500);
        }
    };

    const handleStatusUpdate = async (student: Student, status: 'paid' | 'unpaid' | 'scholarship') => {
        if (status === 'paid') {
            setSelectedStudent(student);
            setIsUploadModalOpen(true);
        } else {
            await updateStudentPayment(student.id, status);
            setUpdatedCard(student.id);
            setTimeout(() => {
                setUpdatedCard(null);
            }, 2500);
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const today = new Date().toLocaleDateString('pt-BR');

        doc.setFontSize(22);
        doc.text(`Relatório Financeiro - ${themeSettings.systemName}`, 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Data de Emissão: ${today}`, 20, 30);
        
        doc.setLineWidth(0.5);
        doc.line(20, 35, 190, 35);

        doc.setFontSize(16);
        doc.text("Resumo Geral", 20, 50);

        doc.setFontSize(12);
        doc.text(`Total de Alunos em Dia: ${paidStudents}`, 20, 60);
        doc.text(`Total de Alunos Pendentes: ${unpaidStudents}`, 20, 70);
        doc.text(`Total de Bolsistas: ${scholarshipStudents}`, 20, 80);
        doc.text(`Receita Estimada (Mês): ${totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, 90);

        doc.setFontSize(16);
        doc.text("Alunos Pendentes (Ação Necessária)", 20, 110);

        const unpaidList = students.filter(s => s.paymentStatus === 'unpaid');
        let yPos = 120;

        if (unpaidList.length > 0) {
             doc.setFontSize(10);
             unpaidList.forEach((s, index) => {
                 if (yPos > 280) {
                     doc.addPage();
                     yPos = 20;
                 }
                 doc.text(`${index + 1}. ${s.name} - Venceu dia ${s.paymentDueDateDay}`, 20, yPos);
                 yPos += 7;
             });
        } else {
            doc.setFontSize(12);
            doc.setTextColor(0, 150, 0);
            doc.text("Parabéns! Não há pendências.", 20, 120);
        }

        doc.save(`relatorio_financeiro_${today.replace(/\//g, '-')}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-slate-800">Controle Financeiro</h1>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="danger" onClick={() => setIsExpenseModalOpen(true)}>
                        <TrendingDown className="w-4 h-4 mr-2" />
                        Lançar Despesa
                    </Button>
                    <Button variant="secondary" onClick={handleExportPDF}>
                        <FileText className="w-4 h-4 mr-2" />
                        Exportar Relatório
                    </Button>
                    <Button onClick={() => setIsValuesModalOpen(true)}>Configurar Valores</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Alunos em Dia" 
                    value={paidStudents} 
                    icon={<Users className="w-6 h-6"/>} 
                    color="#10B981" 
                />
                <StatCard 
                    title="Alunos Pendentes" 
                    value={unpaidStudents} 
                    icon={<Users className="w-6 h-6"/>} 
                    color="#EF4444" 
                />
                <StatCard 
                    title="Bolsistas" 
                    value={scholarshipStudents} 
                    icon={<GraduationCap className="w-6 h-6"/>} 
                    color="#8B5CF6" 
                />
                <StatCard 
                    title="Receita Estimada" 
                    value={totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                    icon={<DollarSign className="w-6 h-6"/>} 
                    color="#3B82F6" 
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <FinancialStatusChart paidCount={paidStudents} unpaidCount={unpaidStudents} scholarshipCount={scholarshipStudents} />
                </div>
                <div>
                    <ExpensesChart expenses={expenses} />
                </div>
            </div>
            
            {remindersToSend.length > 0 && (
                <Card className="border-l-4 border-l-amber-500">
                    <h2 className="text-xl font-bold text-amber-600 mb-4">Lembretes a Enviar (Vence em até {themeSettings.reminderDaysBeforeDue} dias)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {remindersToSend.map(student => (
                            <div key={student.id} className="p-3 bg-amber-50 rounded-md flex justify-between items-center border border-amber-100">
                                <div>
                                    <p className="font-semibold text-slate-800">{student.name}</p>
                                    <p className="text-sm text-slate-500">Vence dia: {student.paymentDueDateDay}</p>
                                </div>
                                <Button size="sm" variant="secondary" onClick={() => handleSendReminder(student.phone || '', student.name)}>WhatsApp</Button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

             {overduePayments.length > 0 && (
                <Card className="border-l-4 border-l-red-500">
                    <h2 className="text-xl font-bold text-red-600 mb-4">Cobranças Atrasadas (Venceu há até {themeSettings.overdueDaysAfterDue} dias)</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {overduePayments.map(student => (
                            <div key={student.id} className="p-3 bg-red-50 rounded-md flex justify-between items-center border border-red-100">
                                <div>
                                    <p className="font-semibold text-slate-800">{student.name}</p>
                                    <p className="text-sm text-slate-500">Venceu dia: {student.paymentDueDateDay}</p>
                                </div>
                                <Button size="sm" variant="danger" onClick={() => handleSendOverdueNotice(student.phone || '', student.name)}>Cobrar</Button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <h2 className="text-2xl font-bold text-slate-800 pt-4">Visão Geral dos Alunos</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {students.map(student => {
                    const belt = graduations.find(g => g.id === student.beltId);
                    const isUpdated = updatedCard === student.id;
                    let statusColor = 'bg-red-500';
                    let statusTitle = 'Pendente';
                    let ringColor = 'ring-red-500';

                    if (student.paymentStatus === 'paid') {
                        statusColor = 'bg-green-500';
                        statusTitle = 'Em Dia';
                        ringColor = 'ring-green-500';
                    } else if (student.paymentStatus === 'scholarship') {
                        statusColor = 'bg-purple-500';
                        statusTitle = 'Bolsista';
                        ringColor = 'ring-purple-500';
                    }

                    const cardClass = isUpdated ? `ring-2 ${ringColor} transform scale-105` : 'hover:shadow-md';

                    return (
                        <Card key={student.id} className={`text-center flex flex-col items-center transition-all duration-300 ${cardClass}`}>
                            <div className="relative">
                                <img src={student.imageUrl || `https://ui-avatars.com/api/?name=${student.name}`} alt={student.name} className="w-20 h-20 rounded-full mb-3 border-4 border-slate-50 object-cover shadow-sm" />
                                <span className={`absolute bottom-2 right-0 w-5 h-5 rounded-full border-2 border-white ${statusColor}`} title={statusTitle}></span>
                            </div>
                            
                            <h2 className="text-lg font-bold text-slate-800 line-clamp-1">{student.name}</h2>
                            <p className="text-xs text-slate-400 mb-2">{student.email}</p>
                            
                            {belt && (
                                <div className="flex items-center justify-center bg-slate-50 px-3 py-1 rounded-full text-xs font-medium mb-4 border border-slate-100">
                                    <span className="w-3 h-3 rounded-full mr-2 border border-black/10" style={{ backgroundColor: belt.color }}></span>
                                    {belt.name}
                                </div>
                            )}
                            
                            <div className="mt-auto pt-4 w-full flex flex-col gap-2 border-t border-slate-50">
                                <Button size="sm" variant="secondary" onClick={() => handleOpenHistoryModal(student)}>Histórico</Button>
                                
                                {student.paymentStatus === 'scholarship' ? (
                                    <Button size="sm" variant="danger" onClick={() => handleStatusUpdate(student, 'unpaid')}>Remover Bolsa</Button>
                                ) : (
                                    <>
                                        {student.paymentStatus === 'unpaid' && (
                                            <Button size="sm" variant="success" onClick={() => handleStatusUpdate(student, 'paid')}>Registrar Pagamento</Button>
                                        )}
                                        {student.paymentStatus === 'paid' && (
                                            <Button variant="danger" size="sm" onClick={() => handleStatusUpdate(student, 'unpaid')}>Marcar Pendente</Button>
                                        )}
                                        <Button size="sm" variant="secondary" className="text-purple-600 bg-purple-50 hover:bg-purple-100" onClick={() => handleStatusUpdate(student, 'scholarship')}>Definir Bolsa</Button>
                                    </>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {isHistoryModalOpen && selectedStudent && (
                <PaymentHistoryModal 
                    student={selectedStudent} 
                    onClose={handleCloseHistoryModal}
                    onRegisterPayment={handleRegisterPayment} 
                />
            )}
            
            {isUploadModalOpen && selectedStudent && (
                <UploadProofModal
                    student={selectedStudent}
                    onClose={() => {
                        setIsUploadModalOpen(false);
                        setSelectedStudent(null);
                    }}
                    onConfirm={confirmPayment}
                />
            )}

            <Modal isOpen={isValuesModalOpen} onClose={() => setIsValuesModalOpen(false)} title="Configuração Financeira">
                <div className="space-y-4">
                    <Input 
                        label="Valor Padrão da Mensalidade (R$)"
                        type="number"
                        value={feeAmountInput}
                        onChange={handleFeeInputChange}
                        onBlur={handleFeeInputBlur}
                        step="0.01"
                        min="0"
                    />
                     <p className="text-xs text-slate-500">Este valor será usado para o cálculo da receita estimada e novas cobranças.</p>
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => setIsValuesModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveFeeAmount}>Salvar Alterações</Button>
                    </div>
                </div>
            </Modal>
            
            <ReminderModal 
                isOpen={isReminderModalOpen}
                onClose={() => setIsReminderModalOpen(false)}
                students={remindersToSend}
                onSendAll={handleSendAllReminders}
            />

            <ExpenseModal 
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
                onSave={saveExpense}
            />
        </div>
    );
};
