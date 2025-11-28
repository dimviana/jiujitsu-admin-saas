

import React, { useState, useContext, FormEvent, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { Eye as IconEye, EyeOff as IconEyeOff, Facebook } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

declare global {
  interface Window {
    google: any;
  }
}

const formatCPF = (value: string): string => {
  return value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
};

const validateCPF = (cpf: string): boolean => {
    if (typeof cpf !== 'string') return false;
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;

    const digits = cpf.split('').map(el => +el);

    const rest = (count: number): number => {
        let sum = 0;
        for (let i = 0; i < count; i++) {
        sum += digits[i] * (count + 1 - i);
        }
        const remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    };

    if (rest(9) !== digits[9]) return false;
    if (rest(10) !== digits[10]) return false;

    return true;
};

interface RegisterFormProps {
  onSave: (data: any) => Promise<{ success: boolean; message?: string }>;
  onClose: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSave, onClose }) => {
  const [formData, setFormData] = useState({ name: '', address: '', responsible: '', responsibleRegistration: '', email: '', password: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (formData.password !== confirmPassword) { setError('As senhas não coincidem.'); return; }
    setError(''); setLoading(true);
    const result = await onSave(formData);
    if (!result.success) setError(result.message || 'Erro no cadastro.');
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-center text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
      <Input label="Nome da Academia" name="name" value={formData.name} onChange={handleChange} required />
      <Input label="Endereço" name="address" value={formData.address} onChange={handleChange} required />
      <Input label="Nome do Responsável" name="responsible" value={formData.responsible} onChange={handleChange} required />
      <Input label="CPF do Responsável" name="responsibleRegistration" value={formData.responsibleRegistration} onChange={handleChange} required />
      <hr className="my-2" />
      <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
      <Input label="Senha" name="password" type="password" value={formData.password} onChange={handleChange} required />
      <Input label="Confirmar Senha" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Cadastrando...' : 'Cadastrar'}</Button>
      </div>
    </form>
  );
};

interface StudentRegisterFormProps {
    onClose: () => void;
}

const StudentRegisterForm: React.FC<StudentRegisterFormProps> = ({ onClose }) => {
    const { academies } = useContext(AppContext);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        cpf: '',
        phone: '',
        birthDate: '',
        academyId: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const availableAcademies = academies.filter(a => a.status === 'active' && a.allowStudentRegistration);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'cpf') {
            setFormData(prev => ({ ...prev, cpf: formatCPF(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.password !== formData.confirmPassword) {
            setError("As senhas não coincidem.");
            return;
        }

        if (!validateCPF(formData.cpf)) {
            setError("CPF inválido.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/register-student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            
            if (res.ok) {
                setSuccess(data.message || 'Cadastro realizado com sucesso! Aguarde aprovação.');
                setTimeout(() => onClose(), 3000);
            } else {
                setError(data.message || 'Erro ao realizar cadastro.');
            }
        } catch (err) {
            setError("Erro de conexão. Tente novamente.");
        }
        setLoading(false);
    };

    if (success) {
        return (
            <div className="text-center p-6 space-y-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800">Sucesso!</h3>
                <p className="text-slate-600">{success}</p>
                <p className="text-sm text-slate-500">Você será redirecionado em instantes...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             {error && <p className="text-sm text-center text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
            
            <Input label="Nome Completo" name="name" value={formData.name} onChange={handleChange} required />
            <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
            
            <div className="grid grid-cols-2 gap-4">
                <Input label="CPF" name="cpf" value={formData.cpf} onChange={handleChange} required maxLength={14} />
                <Input label="Nascimento" name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} required />
            </div>
            
            <Input label="Telefone" name="phone" value={formData.phone} onChange={handleChange} required placeholder="(00) 00000-0000" />

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Selecione sua Academia</label>
                <select 
                    name="academyId" 
                    value={formData.academyId} 
                    onChange={handleChange} 
                    required 
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-primary focus:border-primary outline-none"
                >
                    <option value="">Selecione...</option>
                    {availableAcademies.map(ac => (
                        <option key={ac.id} value={ac.id}>{ac.name}</option>
                    ))}
                </select>
                {availableAcademies.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">Nenhuma academia aceitando registros no momento.</p>
                )}
            </div>

            <hr className="my-2" />
            
            <Input label="Senha" name="password" type="password" value={formData.password} onChange={handleChange} required />
            <Input label="Confirmar Senha" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required />

            <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
                <Button type="submit" disabled={loading || availableAcademies.length === 0}>
                    {loading ? 'Enviando...' : 'Solicitar Cadastro'}
                </Button>
            </div>
        </form>
    );
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isStudentRegisterModalOpen, setIsStudentRegisterModalOpen] = useState(false);
  const [isNotFoundModalOpen, setIsNotFoundModalOpen] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  
  const { themeSettings, login, loginGoogle, user, registerAcademy, loading: appLoading } = useContext(AppContext);

  const handleGoogleLoginResponse = async (response: any) => {
    setLoading(true); setError('');
    try {
        await loginGoogle(response.credential);
    } catch (err: any) {
        setError('Falha ao autenticar com Google.');
    }
    setLoading(false);
  };

  const handleFacebookLogin = () => {
      // Mocked handler since actual FB SDK requires valid App ID and domain whitelisting
      setError("Login com Facebook requer configuração de App ID válida.");
  };

  useEffect(() => {
    if (!themeSettings.socialLoginEnabled || !themeSettings.googleClientId) return;

    const initializeGoogle = () => {
        if (window.google && window.google.accounts && googleBtnRef.current) {
            try {
                window.google.accounts.id.initialize({ 
                    client_id: themeSettings.googleClientId, 
                    callback: handleGoogleLoginResponse 
                });
                window.google.accounts.id.renderButton(
                    googleBtnRef.current, 
                    { theme: "outline", size: "large", width: "100%" } // customization attributes
                );
            } catch (e) {
                console.error("Erro ao inicializar botão Google:", e);
            }
        }
    };

    // Tentar inicializar imediatamente
    if (window.google) {
        initializeGoogle();
    }

    // Configurar um intervalo para checar se o script carregou (caso de internet lenta)
    const interval = setInterval(() => {
        if (window.google && googleBtnRef.current && googleBtnRef.current.innerHTML === '') {
            initializeGoogle();
        }
    }, 1000);

    return () => clearInterval(interval);
  }, [themeSettings.socialLoginEnabled, themeSettings.googleClientId]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val.includes('@') && /^[\d.-]*$/.test(val)) { setEmail(formatCPF(val)); return; }
    setEmail(val);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
        await login(email, password);
    } catch (err: any) {
        if (err.message?.includes('User or password invalid') && themeSettings.registrationEnabled) {
             setIsNotFoundModalOpen(true);
        }
        else {
             setError(err.message || 'Erro ao logar.');
        }
    }
    setLoading(false);
  };

  const handleRegisterSave = async (data: any) => {
    const result = await registerAcademy(data);
    if (result.success) {
        setIsRegisterModalOpen(false);
        setError('');
    }
    return result;
  };
  
  if (appLoading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (user) return null; // App.tsx will redirect or render Dashboard

  return (
    <div className="min-h-screen flex flex-col bg-[var(--theme-bg)]">
        <main className="flex-grow flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[var(--theme-card-bg)] rounded-2xl p-8 shadow-lg">
                <div className="text-center">
                    <img src={themeSettings.logoUrl} alt="Logo" className="mx-auto h-16 w-auto mb-4" />
                    <h1 className="text-3xl font-bold text-[var(--theme-text-primary)]">{themeSettings.systemName}</h1>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <Input id="email" label="Email ou CPF" value={email} onChange={handleEmailChange} required />
                    <div>
                        <label className="block text-sm font-medium mb-1 text-[var(--theme-text-primary)]">Senha</label>
                        <div className="relative">
                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border rounded-md px-3 py-2" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">{showPassword ? <IconEyeOff className="w-5 h-5"/> : <IconEye className="w-5 h-5"/>}</button>
                        </div>
                    </div>
                    {error && <p className={`text-sm text-center p-2 rounded ${error.includes('sucesso') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{error}</p>}
                    <Button type="submit" disabled={loading} className="w-full">{loading ? 'Entrando...' : 'Entrar'}</Button>
                </form>
                
                {themeSettings.socialLoginEnabled && (
                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-[var(--theme-card-bg)] text-slate-500">Ou entre com</span>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                            {/* Google Button Container */}
                            {themeSettings.googleClientId && (
                                <div ref={googleBtnRef} id="googleBtn" className="w-full flex justify-center min-h-[40px]"></div>
                            )}

                            {/* Facebook Button */}
                            <button
                                type="button"
                                onClick={handleFacebookLogin}
                                disabled={loading}
                                className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-transparent rounded text-sm font-medium text-white bg-[#1877F2] hover:bg-[#1864D9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1877F2] transition-colors disabled:opacity-50 shadow-sm"
                            >
                                <Facebook className="w-5 h-5 mr-2" />
                                <span>Entrar com Facebook</span>
                            </button>
                        </div>
                    </div>
                )}
                
                <div className="text-center mt-6 space-y-2 pt-4 border-t border-[var(--theme-text-primary)]/10">
                    <button onClick={() => setIsStudentRegisterModalOpen(true)} className="text-sm font-medium text-[var(--theme-accent)] hover:underline block w-full">
                        Sou Aluno e quero me cadastrar
                    </button>

                    {themeSettings.registrationEnabled && (
                        <button onClick={() => setIsRegisterModalOpen(true)} className="text-sm font-medium text-[var(--theme-text-primary)] hover:text-[var(--theme-accent)] hover:underline block w-full">
                            Cadastre sua academia
                        </button>
                    )}
                </div>
            </div>
        </main>
        
        <Modal isOpen={isStudentRegisterModalOpen} onClose={() => setIsStudentRegisterModalOpen(false)} title="Cadastro de Aluno">
            <StudentRegisterForm onClose={() => setIsStudentRegisterModalOpen(false)} />
        </Modal>

        {themeSettings.registrationEnabled && (
            <>
                <Modal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} title="Cadastrar Nova Academia">
                    <RegisterForm onSave={handleRegisterSave} onClose={() => setIsRegisterModalOpen(false)} />
                </Modal>
                <Modal isOpen={isNotFoundModalOpen} onClose={() => setIsNotFoundModalOpen(false)} title="Usuário não encontrado">
                    <div className="text-center">
                        <p>Deseja cadastrar uma nova academia?</p>
                        <div className="flex justify-center gap-4 mt-4">
                            <Button variant="secondary" onClick={() => setIsNotFoundModalOpen(false)}>Não</Button>
                            <Button onClick={() => { setIsNotFoundModalOpen(false); setIsRegisterModalOpen(true); }}>Sim</Button>
                        </div>
                    </div>
                </Modal>
            </>
        )}
    </div>
  );
};

export default Login;