

import React, { useState, useContext, FormEvent, useEffect } from 'react';
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

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isNotFoundModalOpen, setIsNotFoundModalOpen] = useState(false);
  
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
    if (window.google && themeSettings.socialLoginEnabled && themeSettings.googleClientId) {
        try {
            window.google.accounts.id.initialize({ client_id: themeSettings.googleClientId, callback: handleGoogleLoginResponse });
            window.google.accounts.id.renderButton(document.getElementById("googleBtn"), { theme: "outline", size: "large", width: "100%" });
        } catch (e) {}
    }
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
                            {/* Google Button Container (Rendered by script) */}
                            <div id="googleBtn" className="w-full flex justify-center"></div>

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

                {themeSettings.registrationEnabled && (
                    <div className="text-center mt-6 text-sm pt-4 border-t border-[var(--theme-text-primary)]/10">
                        <button onClick={() => setIsRegisterModalOpen(true)} className="font-semibold text-[var(--theme-accent)] hover:underline">
                            Não tem uma conta? Cadastre sua academia
                        </button>
                    </div>
                )}
            </div>
        </main>
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
