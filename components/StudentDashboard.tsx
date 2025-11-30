import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Student, User, Graduation, ClassSchedule, ThemeSettings } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Input from './ui/Input';
import StudentAttendanceChart from './charts/StudentAttendanceChart';
import { Award, Calendar, DollarSign, Medal, Upload, QrCode as IconPix, CreditCard, Loader, CheckCircle, GraduationCap, HeartHandshake } from 'lucide-react';

// ... (Helper functions remain the same) ...

const crc16ccitt = (payload: string): string => {
    let crc = 0xFFFF;
    const polynomial = 0x1021;

    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = ((crc << 1) ^ polynomial) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
};

const generatePixPayload = (
    key: string, 
    name: string, 
    city: string, 
    amount: number, 
    txid: string
): string => {
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const formatField = (id: string, value: string) => {
        const len = value.length.toString().padStart(2, '0');
        return `${id}${len}${value}`;
    };

    // 1. Tratamento de Dados
    const safeKey = key.trim();
    const safeName = normalize(name).substring(0, 25); // Max 25 chars
    const safeCity = normalize(city).substring(0, 15) || 'BRASILIA'; // Max 15 chars
    const safeAmount = amount.toFixed(2);
    // TxID deve ser alfanumérico, sem espaços, max 25 chars.
    const safeTxid = txid.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) || '***';

    // 2. Montagem dos Campos
    // 26 - Merchant Account Information
    const gui = formatField('00', 'BR.GOV.BCB.PIX');
    const chave = formatField('01', safeKey);
    const merchantAccount = formatField('26', gui + chave);

    // 52 - Category Code (0000 = Geral)
    const categoryCode = formatField('52', '0000');

    // 53 - Currency (986 = BRL)
    const currency = formatField('53', '986');

    // 54 - Amount
    const amountField = formatField('54', safeAmount);

    // 58 - Country
    const country = formatField('58', 'BR');

    // 59 - Merchant Name
    const merchantName = formatField('59', safeName);

    // 60 - Merchant City
    const merchantCity = formatField('60', safeCity);

    // 62 - Additional Data (TxID)
    const referenceLabel = formatField('05', safeTxid);
    const additionalData = formatField('62', referenceLabel);

    // 3. Concatenação Inicial (IDs 00 a 62)
    const payloadFormatIndicator = formatField('00', '01');
    
    const rawPayload = 
        payloadFormatIndicator +
        merchantAccount +
        categoryCode +
        currency +
        amountField +
        country +
        merchantName +
        merchantCity +
        additionalData +
        '6304'; // Adiciona ID do CRC e tamanho 04

    // 4. Cálculo e Adição do CRC
    const crc = crc16ccitt(rawPayload);
    
    return rawPayload + crc;
};

// ... (Sub-components: PixPaymentModal, CreditCardModal, UploadProofModal, StatCard) ...

const PixPaymentModal: React.FC<{ student: Student; onClose: () => void; onProceedToUpload: () => void; themeSettings: ThemeSettings }> = ({ student, onClose, onProceedToUpload, themeSettings }) => {
    const pixCodeRef = useRef<HTMLInputElement>(null);
    const [copySuccess, setCopySuccess] = useState('');
    const [countdown, setCountdown] = useState(300); // 5 minutes in seconds

    useEffect(() => {
        if (countdown > 0) {
            const timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [countdown]);
    
    const isExpired = countdown === 0;
    const minutes = String(Math.floor(countdown / 60)).padStart(2, '0');
    const seconds = String(countdown % 60).padStart(2, '0');


    const brCode = useMemo(() => {
        // Use EFI Key if enabled, otherwise use General Key
        const activePixKey = themeSettings.efiEnabled ? themeSettings.efiPixKey : themeSettings.pixKey;

        if (!activePixKey || !themeSettings.pixHolderName) {
            return null;
        }
        
        // Identificador da transação único e seguro
        // Formato: JJ + ultimos 8 digitos do ID + timestamp curto
        const cleanId = student.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8); 
        const timestamp = Date.now().toString().slice(-6); 
        const rawTxid = `JJ${cleanId}${timestamp}`;

        return generatePixPayload(
            activePixKey,
            themeSettings.pixHolderName,
            "SAAS", // Cidade padrão ou fixa, pois muitas vezes não vem na config
            themeSettings.monthlyFeeAmount,
            rawTxid
        );
    }, [themeSettings, student]);

    const handleCopy = () => {
        if (pixCodeRef.current) {
            pixCodeRef.current.select();
            navigator.clipboard.writeText(pixCodeRef.current.value);
            setCopySuccess('Copiado!');
            setTimeout(() => setCopySuccess(''), 2000);
        }
    };
    
    if (!brCode) {
        return (
             <Modal isOpen={true} onClose={onClose} title="Pagamento via PIX">
                 <div className="text-center">
                    <p className="text-slate-600">A configuração de PIX não foi realizada corretamente pelo administrador.</p>
                    <p className="text-sm text-slate-500 mt-2">Por favor, entre em contato com a academia.</p>
                    <div className="mt-6 flex justify-end">
                        <Button variant="secondary" onClick={onClose}>Fechar</Button>
                    </div>
                </div>
             </Modal>
        );
    }
    
    // Gerar QR Code Visual
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(brCode)}`;

    return (
        <Modal isOpen={true} onClose={onClose} title="Pagamento via PIX">
            <div className="space-y-4 text-center">
                 {isExpired ? (
                    <div className="flex flex-col items-center justify-center p-8">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mb-4" fill="none" viewBox="0 0 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-xl font-bold text-slate-800">Código PIX Expirado</h3>
                        <p className="text-slate-600 mt-2">O tempo para pagamento acabou. Por favor, feche esta janela e clique em "Pagar Mensalidade" para gerar um novo código.</p>
                        <Button onClick={onClose} className="mt-6">Fechar</Button>
                    </div>
                ) : (
                    <>
                        <div className="bg-amber-100 text-amber-800 font-bold p-3 rounded-lg">
                            Este código expira em: {minutes}:{seconds}
                        </div>
                        <p className="text-slate-600">Pague a mensalidade no valor de <span className="font-bold">{themeSettings.monthlyFeeAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> usando o QR Code ou o código abaixo.</p>
                        
                        <div className="flex justify-center my-4">
                            <img src={qrCodeUrl} alt="PIX QR Code" className="border-4 border-slate-200 rounded-lg"/>
                        </div>

                        <div className="space-y-1 text-left">
                            <label className="text-sm font-medium text-slate-700">PIX Copia e Cola</label>
                            <div className="flex gap-2">
                                <Input readOnly value={brCode} ref={pixCodeRef} />
                                <Button onClick={handleCopy} variant="secondary">{copySuccess || 'Copiar'}</Button>
                            </div>
                        </div>
                         <div className="mt-6 pt-6 border-t border-slate-200 flex flex-col items-center">
                             <p className="font-semibold text-amber-600 mb-2">Já realizou o pagamento?</p>
                             <Button onClick={onProceedToUpload}>Anexar Comprovante</Button>
                         </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

const CreditCardModal: React.FC<{ student: Student; onClose: () => void; onConfirm: () => Promise<void>; amount: number; surcharge: number }> = ({ student, onClose, onConfirm, amount, surcharge }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cardData, setCardData] = useState({
        number: '',
        name: '',
        expiry: '',
        cvc: ''
    });
    
    const total = amount + surcharge;

    const handleFormatCardNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        val = val.replace(/(\d{4})/g, '$1 ').trim();
        setCardData(prev => ({ ...prev, number: val.substring(0, 19) }));
    };

    const handleFormatExpiry = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length >= 2) {
            val = val.substring(0, 2) + '/' + val.substring(2, 4);
        }
        setCardData(prev => ({ ...prev, expiry: val }));
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/payments/credit-card', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    studentId: student.id,
                    amount, // Base amount, surcharge logic handled by backend or display
                    cardData
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao processar pagamento.');
            }

            await onConfirm(); // Refresh UI logic from parent
            onClose();
        } catch (err: any) {
            setError(err.message || 'Falha na transação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Pagamento com Cartão de Crédito">
            <form onSubmit={handlePayment} className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg mb-4 text-center border border-slate-100">
                    <div className="flex justify-between items-center text-sm text-slate-500 mb-1">
                        <span>Mensalidade:</span>
                        <span>{amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    {surcharge > 0 && (
                        <div className="flex justify-between items-center text-sm text-slate-500 mb-2 border-b border-slate-200 pb-2">
                            <span>Taxa de Cartão:</span>
                            <span>+ {surcharge.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                    )}
                    
                    <div className="flex justify-between items-center font-bold text-slate-800 text-lg">
                        <span>Total a Pagar:</span>
                        <span className="text-xl text-blue-600">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded relative text-sm" role="alert">
                        <strong className="font-bold">Erro: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <Input 
                    label="Número do Cartão" 
                    value={cardData.number} 
                    onChange={handleFormatCardNumber} 
                    placeholder="0000 0000 0000 0000" 
                    required 
                />
                <Input 
                    label="Nome do Titular" 
                    value={cardData.name} 
                    onChange={(e) => setCardData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))} 
                    placeholder="COMO ESTÁ NO CARTÃO" 
                    required 
                />
                <div className="grid grid-cols-2 gap-4">
                    <Input 
                        label="Validade" 
                        value={cardData.expiry} 
                        onChange={handleFormatExpiry} 
                        placeholder="MM/AA" 
                        maxLength={5} 
                        required 
                    />
                    <Input 
                        label="CVV" 
                        value={cardData.cvc} 
                        onChange={(e) => setCardData(prev => ({ ...prev, cvc: e.target.value.replace(/\D/g, '').substring(0, 4) }))} 
                        placeholder="123" 
                        type="password"
                        maxLength={4} 
                        required 
                    />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                        {loading ? (
                            <><Loader className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
                        ) : (
                            'Pagar Agora'
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

const UploadProofModal: React.FC<{ onConfirm: () => Promise<void>; onClose: () => void; }> = ({ onConfirm, onClose }) => {
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isPaying, setIsPaying] = useState(false);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            if (e.target.files[0].type === 'application/pdf') {
                setReceiptFile(e.target.files[0]);
            } else {
                alert('Por favor, selecione um arquivo PDF.');
                e.target.value = ''; // Clear the input
                setReceiptFile(null);
            }
        }
    };
    
    const handleSendReceipt = async () => {
        if (!receiptFile) return;
        setIsPaying(true);
        await onConfirm();
        setIsPaying(false);
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Enviar Comprovante de Pagamento">
            <div className="space-y-4">
                <p className="text-slate-600">Para confirmar seu pagamento, por favor, anexe o comprovante em formato PDF.</p>
                <label
                    htmlFor="receipt-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100"
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-slate-400" />
                        <p className="mb-2 text-sm text-slate-500">
                            <span className="font-semibold">Clique para enviar comprovante</span>
                        </p>
                        <p className="text-xs text-slate-500">Apenas arquivos PDF (obrigatório)</p>
                    </div>
                    <input id="receipt-upload" type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
                </label>
                 {receiptFile && (
                    <p className="text-center text-sm text-green-600 font-medium">Arquivo: {receiptFile.name}</p>
                )}
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSendReceipt} disabled={!receiptFile || isPaying}>
                        {isPaying ? 'Enviando...' : 'Enviar Comprovante'}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

const calculateTrainingTime = (startDateString?: string): { years: number; months: number; totalMonths: number } => {
  if (!startDateString) return { years: 0, months: 0, totalMonths: 0 };
  const startDate = new Date(startDateString);
  const now = new Date();
  
  let years = now.getFullYear() - startDate.getFullYear();
  let months = now.getMonth() - startDate.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  return { years, months, totalMonths: years * 12 + months };
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

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | React.ReactNode; color: string }> = ({ icon, title, value, color }) => (
  <Card className="flex items-center p-5">
    <div className={`p-3 rounded-lg mr-4`} style={{ backgroundColor: `${color}1A`}}>
        <div style={{ color: color }}>{icon}</div>
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-xl font-bold text-slate-800">{value}</p>
    </div>
  </Card>
  
);

interface StudentDashboardProps {
  student?: Student;
  user?: User;
  students: Student[];
  graduations: Graduation[];
  schedules: ClassSchedule[];
  themeSettings: ThemeSettings;
  updateStudentPayment: (id: string, status: 'paid' | 'unpaid' | 'scholarship') => Promise<void>;
  users?: User[];
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ 
    student: studentProp, 
    user, 
    students, 
    graduations, 
    schedules, 
    themeSettings, 
    updateStudentPayment 
}) => {
    // ... (Component implementation) ...
    const [paymentModalState, setPaymentModalState] = useState<'closed' | 'pix' | 'card' | 'upload'>('closed');
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    const studentDataFromContext = useMemo(() => students.find(s => s.id === user?.studentId), [students, user]);
    const studentData = studentProp || studentDataFromContext;

    const graduation = useMemo(() => graduations.find(g => g.id === studentData?.beltId), [graduations, studentData]);
    const nextGraduation = useMemo(() => graduations.sort((a,b) => a.rank - b.rank).find(g => g.rank > (graduation?.rank ?? 0)), [graduations, graduation]);

    const { totalMonths: trainingMonths } = calculateTrainingTime(studentData?.firstGraduationDate);

    const timeToNextGrad = useMemo(() => {
        if (!studentData || !graduation || !nextGraduation) return "Parabéns!";

        const age = studentData.birthDate ? calculateAge(studentData.birthDate) : 20;
        
        // Kids' system logic
        if (age < 16 && graduation.type === 'kids' && nextGraduation.minAge) {
            if (age >= nextGraduation.minAge) {
                return "Já tem idade!";
            }
            return `Elegível aos ${nextGraduation.minAge} anos`;
        }
        
        // Adult system logic
        const timeNeeded = graduation.minTimeInMonths;
        if (timeNeeded === 0) return "N/A";
        const timeRemaining = Math.max(0, timeNeeded - (trainingMonths % timeNeeded));
        return `${timeRemaining} meses`;
    }, [graduation, nextGraduation, trainingMonths, studentData]);
    
    const studentSchedules = useMemo(() => {
      if (!studentData) return [];
      const today = new Date();
      const dayOfWeek = today.getDay(); 
      const upcoming = [];
      for(let i=0; i<7; i++){
        const targetDay = (dayOfWeek + i) % 7;
        const daySchedules = schedules.filter(s => {
          const scheduleDayMap: {[key: string]: number} = {'Domingo': 0, 'Segunda-feira': 1, 'Terça-feira': 2, 'Quarta-feira': 3, 'Quinta-feira': 4, 'Sexta-feira': 5, 'Sábado': 6};
          return s.academyId === studentData.academyId && scheduleDayMap[s.dayOfWeek] === targetDay;
        });
        upcoming.push(...daySchedules.map(s => ({...s, dayOffset: i})));
      }
      return upcoming.slice(0, 5);
    }, [schedules, studentData]);

    const shouldShowPaymentButton = useMemo(() => {
        if (!studentData) return false;
        
        // Scholarship students don't need to pay
        if (studentData.paymentStatus === 'scholarship') return false;
        
        // Only show if unpaid
        if (studentData.paymentStatus !== 'unpaid') return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDateDay = studentData.paymentDueDateDay;

        const dueDateThisMonth = new Date(today.getFullYear(), today.getMonth(), dueDateDay);
        const isOverdue = today > dueDateThisMonth;
        
        let upcomingDueDate = new Date(today.getFullYear(), today.getMonth(), dueDateDay);
        if (today.getDate() > dueDateDay) {
            upcomingDueDate.setMonth(upcomingDueDate.getMonth() + 1);
        }
        
        const timeDiff = upcomingDueDate.getTime() - today.getTime();
        const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));
        const isReminderPeriod = daysUntilDue <= 5;

        return isOverdue || isReminderPeriod;
    }, [studentData]);


    const handleConfirmPayment = async () => {
        if (!studentData) return;
        await updateStudentPayment(studentData.id, 'paid');
        setPaymentSuccess(true);
        setTimeout(() => {
            setPaymentSuccess(false);
        }, 3000);
    };

    const getBeltStyle = (grad: Graduation) => {
        if (!grad.color2) return { background: grad.color };

        const angle = grad.gradientAngle ?? 90;
        const hardness = (grad.gradientHardness ?? 0) / 100;
        const color3 = grad.color3 || grad.color2;

        const c1End = 33.33 * hardness;
        const c2Start = 50 - (16.67 * hardness);
        const c2End = 50 + (16.67 * hardness);
        const c3Start = 100 - (33.33 * hardness);

        return {
            background: `linear-gradient(${angle}deg,
                ${grad.color} 0%,
                ${grad.color} ${c1End}%,
                ${grad.color2} ${c2Start}%,
                ${grad.color2} ${c2End}%,
                ${color3} ${c3Start}%,
                ${color3} 100%
        )`
        };
    };

    if (!studentData || !graduation) {
        return <div className="text-center p-8 text-slate-500">Carregando dados do aluno...</div>;
    }

    const stripes = studentData.stripes;

    // Helper to get status visual data
    const getStatusInfo = () => {
        if (studentData.isSocialProject) {
            return { color: '#3B82F6', text: 'Projeto Social', icon: <HeartHandshake className="w-4 h-4 mr-1"/> };
        } else if (studentData.paymentStatus === 'scholarship') {
            return { color: '#8B5CF6', text: 'Isento (Bolsa)', icon: <GraduationCap className="w-4 h-4 mr-1"/> };
        } else if (studentData.paymentStatus === 'paid') {
            return { color: '#10B981', text: 'Em Dia', icon: null };
        } else {
            return { color: '#EF4444', text: 'Pendente', icon: null };
        }
    };
    
    const statusInfo = getStatusInfo();

    return (
        <div className="space-y-6">
            {paymentModalState === 'pix' && (
                <PixPaymentModal 
                    student={studentData}
                    themeSettings={themeSettings}
                    onClose={() => setPaymentModalState('closed')}
                    onProceedToUpload={() => setPaymentModalState('upload')}
                />
            )}
            {paymentModalState === 'card' && (
                <CreditCardModal 
                    student={studentData}
                    amount={themeSettings.monthlyFeeAmount}
                    surcharge={themeSettings.creditCardSurcharge || 0}
                    onClose={() => setPaymentModalState('closed')}
                    onConfirm={handleConfirmPayment}
                />
            )}
            {paymentModalState === 'upload' && (
                 <UploadProofModal 
                    onClose={() => setPaymentModalState('closed')}
                    onConfirm={handleConfirmPayment}
                />
            )}

            {!studentProp && (
              <div>
                  <h1 className="text-3xl font-bold text-slate-800">Olá, {studentData.name.split(' ')[0]}!</h1>
                  <p className="text-slate-500 mt-1">Aqui está um resumo do seu progresso no Jiu-Jitsu.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<Medal/>} title="Graduação Atual" color="#8B5CF6" value={graduation.name} />
                <Card className="p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center">
                            <div className={`p-3 rounded-lg mr-4`} style={{ backgroundColor: `${statusInfo.color}1A`}}>
                                <div style={{ color: statusInfo.color }}><DollarSign/></div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Mensalidade</p>
                                {paymentSuccess ? (
                                    <p className="text-xl font-bold text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Pago</p>
                                ) : (
                                    <p className="text-xl font-bold flex items-center" style={{color: statusInfo.color}}>
                                        {statusInfo.icon} {statusInfo.text}
                                    </p>
                                )}
                            </div>
                        </div>
                        {shouldShowPaymentButton && !studentProp && !paymentSuccess && (
                             <div className="flex flex-col gap-2">
                                <Button size="sm" onClick={() => setPaymentModalState('pix')}>
                                    <IconPix className="w-4 h-4 mr-2" />
                                    PIX
                                </Button>
                                {themeSettings.creditCardEnabled !== false && (
                                    <Button size="sm" variant="secondary" onClick={() => setPaymentModalState('card')}>
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        Cartão
                                    </Button>
                                )}
                             </div>
                        )}
                    </div>
                </Card>
                <StatCard icon={<Calendar/>} title="Tempo de Treino" color="#3B82F6" value={`${Math.floor(trainingMonths/12)}a ${trainingMonths%12}m`} />
                <StatCard icon={<Award/>} title="Próxima Graduação" color="#F59E0B" value={timeToNextGrad} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Sua Progressão</h3>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-slate-700">{graduation.name}</span>
                                <span className="font-bold text-slate-700">{nextGraduation?.name || 'Faixa Preta'}</span>
                            </div>
                             <div 
                                className="w-full h-8 rounded-md flex items-center justify-end shadow-inner relative overflow-hidden" 
                                style={{ 
                                    ...getBeltStyle(graduation),
                                    border: '1px solid rgba(0,0,0,0.1)' 
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/5 pointer-events-none"></div>
                                <div className="h-full w-1/4 bg-black flex items-center justify-center space-x-1 p-1 z-10 shadow-xl">
                                    {Array.from({ length: stripes }).map((_, index) => (
                                        <div key={index} className="h-5 w-1 bg-white shadow-sm"></div>
                                    ))}
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 mt-2 text-center">Você tem {stripes} grau(s) na sua faixa {graduation.name}.</p>
                        </div>

                         <div className="mt-6">
                            <h4 className="font-semibold text-amber-600">Dicas do Mestre</h4>
                            <ul className="list-disc list-inside mt-2 text-slate-600 space-y-1 text-sm">
                                <li>Concentre-se em refinar sua guarda-aranha.</li>
                                <li>Aumente sua participação nos treinos de sexta-feira.</li>
                                <li>Estude as defesas de chave de pé reta.</li>
                            </ul>
                         </div>
                    </Card>
                </div>
                <div>
                   <StudentAttendanceChart studentId={studentData.id} />
                </div>
            </div>

             <Card>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Próximas Aulas</h3>
                {studentSchedules.length > 0 ? (
                    <div className="space-y-3">
                    {studentSchedules.map((schedule, i) => {
                        const classDate = new Date();
                        classDate.setDate(classDate.getDate() + schedule.dayOffset);
                        return (
                            <div key={`${schedule.id}-${i}`} className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="text-center w-14 mr-4 bg-white p-1 rounded shadow-sm">
                                    <p className="font-bold text-amber-600 uppercase text-xs">{classDate.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</p>
                                    <p className="text-lg font-bold text-slate-700 leading-none">{classDate.getDate()}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">{schedule.className}</p>
                                    <p className="text-xs text-slate-500">{schedule.startTime} - {schedule.endTime}</p>
                                </div>
                            </div>
                        )
                    })}
                    </div>
                ): (
                    <p className="text-slate-500 text-center text-sm py-4">Nenhuma aula encontrada esta semana.</p>
                )}
            </Card>
        </div>
    );
};