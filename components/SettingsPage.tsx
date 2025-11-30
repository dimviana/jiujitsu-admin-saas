import React, { useContext, useState, FormEvent, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Smartphone, Upload } from 'lucide-react';

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-[var(--theme-text-primary)]/80 mb-1">{label}</label>
        <textarea
            id={id}
            rows={6}
            className="w-full bg-[var(--theme-bg)] border border-[var(--theme-text-primary)]/20 text-[var(--theme-text-primary)] rounded-md px-3 py-2 focus:ring-[var(--theme-accent)] focus:border-[var(--theme-accent)] transition duration-150 ease-in-out font-mono text-sm"
            {...props}
        />
    </div>
);

const SettingsPage: React.FC = () => {
    const { themeSettings, setThemeSettings, activityLogs, users, user, academies } = useContext(AppContext);
    const [settings, setSettings] = useState(themeSettings);
    const [monthlyFeeInput, setMonthlyFeeInput] = useState(themeSettings.monthlyFeeAmount.toFixed(2));
    const [activeTab, setActiveTab] = useState<'system' | 'webpage' | 'activities' | 'pagamentos' | 'direitos' | 'mensagens' | 'mobile'>('system');
    const certInputRef = useRef<HTMLInputElement>(null);

    const isAcademyAdmin = user?.role === 'academy_admin';
    const currentAcademyName = isAcademyAdmin ? academies.find(a => a.id === user.academyId)?.name : 'Sistema Global';

    // Sync local state when themeSettings from context changes
    useEffect(() => {
        setSettings(themeSettings);
        setMonthlyFeeInput(themeSettings.monthlyFeeAmount.toFixed(2));
    }, [themeSettings]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        
        if (name === 'monthlyFeeAmount') {
            setMonthlyFeeInput(value); // Keep typing fluid
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                setSettings(prev => ({ ...prev, [name]: numValue }));
            }
        } else {
            setSettings(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) || 0 : value)
            }));
        }
    };
    
    const handleFeeBlur = () => {
        const val = parseFloat(monthlyFeeInput);
        if (!isNaN(val)) {
            setMonthlyFeeInput(val.toFixed(2));
            setSettings(prev => ({ ...prev, monthlyFeeAmount: val }));
        } else {
            setMonthlyFeeInput('0.00');
            setSettings(prev => ({ ...prev, monthlyFeeAmount: 0 }));
        }
    };

    const handleCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                // Store base64 content
                setSettings(prev => ({ ...prev, efiPixCert: base64 }));
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setThemeSettings(settings);
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-[var(--theme-text-primary)]">Configurações</h1>
                {isAcademyAdmin && (
                    <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full border border-amber-200">
                        Editando: {currentAcademyName}
                    </span>
                )}
            </div>
            
            <div className="border-b border-[var(--theme-text-primary)]/10 overflow-x-auto">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('system')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'system' ? 'border-[var(--theme-accent)] text-[var(--theme-accent)]' : 'border-transparent text-[var(--theme-text-primary)]/60 hover:text-[var(--theme-text-primary)]/80 hover:border-gray-300'}`}
                    >
                        Sistema
                    </button>
                    {(user?.role === 'general_admin' || user?.role === 'academy_admin') && (
                       <>
                           <button
                                onClick={() => setActiveTab('pagamentos')}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'pagamentos' ? 'border-[var(--theme-accent)] text-[var(--theme-accent)]' : 'border-transparent text-[var(--theme-text-primary)]/60 hover:text-[var(--theme-text-primary)]/80 hover:border-gray-300'}`}
                            >
                                Pagamentos
                            </button>
                            <button
                                onClick={() => setActiveTab('mensagens')}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'mensagens' ? 'border-[var(--theme-accent)] text-[var(--theme-accent)]' : 'border-transparent text-[var(--theme-text-primary)]/60 hover:text-[var(--theme-text-primary)]/80 hover:border-gray-300'}`}
                            >
                                Mensagens
                            </button>
                            <button
                                onClick={() => setActiveTab('mobile')}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'mobile' ? 'border-[var(--theme-accent)] text-[var(--theme-accent)]' : 'border-transparent text-[var(--theme-text-primary)]/60 hover:text-[var(--theme-text-primary)]/80 hover:border-gray-300'}`}
                            >
                                <Smartphone className="w-4 h-4 mr-2" />
                                Interface Mobile
                            </button>
                       </>
                    )}
                    <button
                        onClick={() => setActiveTab('webpage')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'webpage' ? 'border-[var(--theme-accent)] text-[var(--theme-accent)]' : 'border-transparent text-[var(--theme-text-primary)]/60 hover:text-[var(--theme-text-primary)]/80 hover:border-gray-300'}`}
                    >
                        Página Web
                    </button>
                    <button
                        onClick={() => setActiveTab('activities')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'activities' ? 'border-[var(--theme-accent)] text-[var(--theme-accent)]' : 'border-transparent text-[var(--theme-text-primary)]/60 hover:text-[var(--theme-text-primary)]/80 hover:border-gray-300'}`}
                    >
                        Atividades
                    </button>
                    <button
                        onClick={() => setActiveTab('direitos')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'direitos' ? 'border-[var(--theme-accent)] text-[var(--theme-accent)]' : 'border-transparent text-[var(--theme-text-primary)]/60 hover:text-[var(--theme-text-primary)]/80 hover:border-gray-300'}`}
                    >
                        Direitos
                    </button>
                </nav>
            </div>

            <Card className="bg-[var(--theme-card-bg)]">
                {activeTab === 'activities' ? (
                     <div className="space-y-4">
                         <h2 className="text-xl font-bold text-[var(--theme-accent)] border-b border-[var(--theme-text-primary)]/10 pb-2">Log de Atividades do Sistema</h2>
                         <div className="max-h-[600px] overflow-y-auto">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-[var(--theme-bg)] border-b border-[var(--theme-text-primary)]/10 z-10">
                                    <tr>
                                        <th className="p-3 text-sm font-semibold text-[var(--theme-text-primary)]/80">Usuário</th>
                                        <th className="p-3 text-sm font-semibold text-[var(--theme-text-primary)]/80">Ação</th>
                                        <th className="p-3 text-sm font-semibold text-[var(--theme-text-primary)]/80">Detalhes</th>
                                        <th className="p-3 text-sm font-semibold text-[var(--theme-text-primary)]/80">Data</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activityLogs.map(log => {
                                        const actor = users.find(u => u.id === log.actorId);
                                        return (
                                            <tr key={log.id} className="border-b border-[var(--theme-bg)] hover:bg-[var(--theme-bg)]">
                                                <td className="p-3 text-sm text-[var(--theme-text-primary)] font-medium">{actor?.name || 'Usuário Removido'}</td>
                                                <td className="p-3 text-sm text-[var(--theme-text-primary)]">{log.action}</td>
                                                <td className="p-3 text-sm text-[var(--theme-text-primary)]/70">{log.details}</td>
                                                <td className="p-3 text-sm text-[var(--theme-text-primary)]/70 whitespace-nowrap">
                                                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                         </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {activeTab === 'system' && (
                            <>
                                <h2 className="text-xl font-bold text-[var(--theme-accent)] border-b border-[var(--theme-text-primary)]/10 pb-2">Identidade Visual</h2>
                                <Input label="Nome do Sistema" name="systemName" value={settings.systemName} onChange={handleChange} />
                                <Input label="URL da Logo" name="logoUrl" value={settings.logoUrl} onChange={handleChange} />

                                <h3 className="text-lg font-semibold text-[var(--theme-text-primary)] pt-4">Cores do Sistema</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <Input label="Cor de Destaque (Acentos)" name="primaryColor" type="color" value={settings.primaryColor} onChange={handleChange} />
                                    <Input label="Cor de Fundo (Página)" name="backgroundColor" type="color" value={settings.backgroundColor} onChange={handleChange} />
                                    <Input label="Cor de Fundo (Cards)" name="cardBackgroundColor" type="color" value={settings.cardBackgroundColor} onChange={handleChange} />
                                    <Input label="Cor do Texto Principal" name="secondaryColor" type="color" value={settings.secondaryColor} onChange={handleChange} />
                                    <Input label="Cor dos Ícones" name="iconColor" type="color" value={settings.iconColor} onChange={handleChange} />
                                    <Input label="Cor dos Botões" name="buttonColor" type="color" value={settings.buttonColor} onChange={handleChange} />
                                    <Input label="Cor do Texto dos Botões" name="buttonTextColor" type="color" value={settings.buttonTextColor} onChange={handleChange} />
                                    <Input label="Cor 1 dos Gráficos" name="chartColor1" type="color" value={settings.chartColor1} onChange={handleChange} />
                                    <Input label="Cor 2 dos Gráficos" name="chartColor2" type="color" value={settings.chartColor2} onChange={handleChange} />
                                </div>
                                
                                <h2 className="text-xl font-bold text-[var(--theme-accent)] border-b border-[var(--theme-text-primary)]/10 pb-2 pt-4">Controle de Cobranças</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="Dias para lembrete (antes do venc.)" name="reminderDaysBeforeDue" type="number" min="0" value={settings.reminderDaysBeforeDue} onChange={handleChange} />
                                    <Input label="Dias para cobrança (após venc.)" name="overdueDaysAfterDue" type="number" min="0" value={settings.overdueDaysAfterDue} onChange={handleChange} />
                                </div>

                                <h2 className="text-xl font-bold text-[var(--theme-accent)] border-b border-[var(--theme-text-primary)]/10 pb-2 pt-4">Controle de Acesso</h2>
                                {user?.role === 'general_admin' && (
                                    <div className="flex justify-between items-center p-3 bg-[var(--theme-bg)] rounded-lg mb-2">
                                        <label htmlFor="registrationEnabled" className="font-medium text-[var(--theme-text-primary)]">Permitir cadastro de novas academias</label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" id="registrationEnabled" name="registrationEnabled" checked={settings.registrationEnabled} onChange={handleChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-amber-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--theme-accent)]"></div>
                                        </label>
                                    </div>
                                )}
                                <div className="flex justify-between items-center p-3 bg-[var(--theme-bg)] rounded-lg">
                                    <label htmlFor="studentProfileEditEnabled" className="font-medium text-[var(--theme-text-primary)]">Permitir edição de perfil pelo aluno</label>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="studentProfileEditEnabled" name="studentProfileEditEnabled" checked={settings.studentProfileEditEnabled} onChange={handleChange} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-amber-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--theme-accent)]"></div>
                                    </label>
                                </div>

                                <h2 className="text-xl font-bold text-[var(--theme-accent)] border-b border-[var(--theme-text-primary)]/10 pb-2 pt-4">Login Social</h2>
                                <div className="flex justify-between items-center p-3 bg-[var(--theme-bg)] rounded-lg">
                                    <label htmlFor="socialLoginEnabled" className="font-medium text-[var(--theme-text-primary)]">Ativar Login com Google & Facebook</label>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="socialLoginEnabled" name="socialLoginEnabled" checked={settings.socialLoginEnabled} onChange={handleChange} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-amber-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--theme-accent)]"></div>
                                    </label>
                                </div>
                                {settings.socialLoginEnabled && (
                                    <div className="space-y-4 pt-2 animate-fade-in-down">
                                        <Input label="Google Client ID" name="googleClientId" value={settings.googleClientId || ''} onChange={handleChange} placeholder="Cole seu Google Client ID aqui" />
                                        <Input label="Facebook App ID" name="facebookAppId" value={settings.facebookAppId || ''} onChange={handleChange} placeholder="Cole seu Facebook App ID aqui" />
                                    </div>
                                )}
                            </>
                        )}
                        
                        {activeTab === 'pagamentos' && (
                            <div className="space-y-6 animate-fade-in-down">
                                <h2 className="text-xl font-bold text-[var(--theme-accent)] border-b border-[var(--theme-text-primary)]/10 pb-2">Configuração Financeira e Gateways</h2>
                                <p className="text-sm text-[var(--theme-text-primary)]/70 -mt-4">
                                  {isAcademyAdmin ? 'Configure os dados de recebimento e integrações de pagamento da sua academia.' : 'Configure os dados padrão do sistema.'}
                                </p>
                                
                                <div className="bg-[var(--theme-bg)]/50 p-4 rounded-lg border border-[var(--theme-text-primary)]/5 space-y-4">
                                    <h3 className="font-semibold text-[var(--theme-text-primary)]">Dados Gerais e PIX (Manual)</h3>
                                    <Input 
                                        label="Valor Padrão da Mensalidade (R$)"
                                        name="monthlyFeeAmount"
                                        type="number"
                                        value={monthlyFeeInput} 
                                        onChange={handleChange}
                                        onBlur={handleFeeBlur}
                                        step="0.01"
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input 
                                          label="Chave PIX (Manual)" 
                                          name="pixKey" 
                                          value={settings.pixKey} 
                                          onChange={handleChange}
                                          placeholder="Email, CPF, Telefone..."
                                        />
                                        <Input 
                                          label="Nome do Titular da Chave" 
                                          name="pixHolderName" 
                                          value={settings.pixHolderName} 
                                          onChange={handleChange}
                                          placeholder="Nome Completo"
                                        />
                                    </div>
                                </div>

                                {/* Mercado Pago Section */}
                                <div className="bg-[var(--theme-bg)]/50 p-4 rounded-lg border border-[var(--theme-text-primary)]/5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-blue-600 flex items-center">
                                            Mercado Pago
                                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Cartão de Crédito</span>
                                        </h3>
                                        <div className="flex items-center">
                                            <label htmlFor="creditCardEnabled" className="mr-2 text-sm font-medium text-[var(--theme-text-primary)]">Ativar Cartão</label>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="creditCardEnabled" name="creditCardEnabled" checked={settings.creditCardEnabled !== false} onChange={handleChange} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-amber-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                    <p className="text-xs text-[var(--theme-text-primary)]/60">Credenciais para processamento de cartão via Mercado Pago.</p>
                                    <Input 
                                        label="Access Token (Produção)" 
                                        name="mercadoPagoAccessToken" 
                                        value={settings.mercadoPagoAccessToken || ''} 
                                        onChange={handleChange}
                                        placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    />
                                    <Input 
                                        label="Public Key" 
                                        name="mercadoPagoPublicKey" 
                                        value={settings.mercadoPagoPublicKey || ''} 
                                        onChange={handleChange}
                                        placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    />
                                </div>

                                {/* EFI Bank Section */}
                                <div className="bg-[var(--theme-bg)]/50 p-4 rounded-lg border border-[var(--theme-text-primary)]/5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-orange-600 flex items-center">
                                            EFI Bank (Efí)
                                            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Boleto / Pix API</span>
                                        </h3>
                                        <div className="flex items-center">
                                            <label htmlFor="efiEnabled" className="mr-2 text-sm font-medium text-[var(--theme-text-primary)]">Ativar Integração EFI</label>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="efiEnabled" name="efiEnabled" checked={!!settings.efiEnabled} onChange={handleChange} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-amber-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                            </label>
                                        </div>
                                    </div>
                                    <p className="text-xs text-[var(--theme-text-primary)]/60">Credenciais para emissão automatizada. Quando ativo, substitui a chave PIX manual.</p>
                                    
                                    <Input 
                                        label="Client ID" 
                                        name="efiClientId" 
                                        value={settings.efiClientId || ''} 
                                        onChange={handleChange}
                                        placeholder="Client_Id_..."
                                    />
                                    <Input 
                                        label="Client Secret" 
                                        name="efiClientSecret" 
                                        value={settings.efiClientSecret || ''} 
                                        onChange={handleChange}
                                        type="password"
                                        placeholder="Client_Secret_..."
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input 
                                            label="Chave PIX (EFI)" 
                                            name="efiPixKey" 
                                            value={settings.efiPixKey || ''} 
                                            onChange={handleChange}
                                            placeholder="Chave cadastrada no EFI"
                                        />
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--theme-text-primary)]/80 mb-1">PIX Certificado (Upload)</label>
                                            <div className="flex items-center gap-2">
                                                <label className="cursor-pointer bg-[var(--theme-card-bg)] border border-[var(--theme-text-primary)]/20 hover:bg-[var(--theme-bg)] text-[var(--theme-text-primary)] px-4 py-2 rounded-lg flex items-center transition-colors text-sm">
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    Selecionar Arquivo
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        ref={certInputRef}
                                                        onChange={handleCertUpload}
                                                        accept=".pem,.p12,.crt"
                                                    />
                                                </label>
                                                {settings.efiPixCert && (
                                                    <span className="text-xs text-green-600 font-medium">Certificado Carregado ✓</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-[var(--theme-text-primary)]/50 mt-1">Formatos: .pem, .p12</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'mensagens' && (
                            <div className="space-y-6 animate-fade-in-down">
                                {/* ... existing messages settings ... */}
                                <h2 className="text-xl font-bold text-[var(--theme-accent)] border-b border-[var(--theme-text-primary)]/10 pb-2">Configuração de Mensagens</h2>
                                <p className="text-sm text-[var(--theme-text-primary)]/70 -mt-4">
                                  Personalize as mensagens automáticas enviadas via WhatsApp.
                                </p>
                                
                                <div className="space-y-4">
                                    <Textarea 
                                        label="Template de Mensagem WhatsApp" 
                                        name="whatsappMessageTemplate" 
                                        value={settings.whatsappMessageTemplate || ''} 
                                        onChange={handleChange} 
                                        placeholder="Olá {nome}, tudo bem?"
                                    />
                                    <div className="bg-[var(--theme-bg)] p-3 rounded text-xs text-[var(--theme-text-primary)]/70 border border-[var(--theme-text-primary)]/10">
                                        <strong>Variáveis disponíveis:</strong>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            <li><code>{'{nome}'}</code>: Nome da pessoa com quem você está falando (Responsável se menor de idade, ou o próprio aluno).</li>
                                            <li><code>{'{aluno}'}</code>: Nome do aluno (Útil quando falando com o responsável).</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'mobile' && (
                            <div className="space-y-6 animate-fade-in-down">
                                <h2 className="text-xl font-bold text-[var(--theme-accent)] border-b border-[var(--theme-text-primary)]/10 pb-2">Interface Mobile (Barra Inferior)</h2>
                                <p className="text-sm text-[var(--theme-text-primary)]/70 -mt-4">
                                  Ajuste a aparência e os botões da barra de navegação no celular.
                                </p>

                                <div className="bg-[var(--theme-bg)]/50 p-4 rounded-lg border border-[var(--theme-text-primary)]/5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label htmlFor="mobileNavVisible" className="font-semibold text-[var(--theme-text-primary)]">Exibir Barra de Menu</label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" id="mobileNavVisible" name="mobileNavVisible" checked={settings.mobileNavVisible !== false} onChange={handleChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-amber-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--theme-accent)]"></div>
                                        </label>
                                    </div>
                                    <p className="text-xs text-[var(--theme-text-primary)]/60 -mt-2">Desative para ocultar completamente o menu inferior em dispositivos móveis.</p>
                                </div>

                                <div className={`bg-[var(--theme-bg)]/50 p-4 rounded-lg border border-[var(--theme-text-primary)]/5 space-y-4 transition-opacity ${settings.mobileNavVisible === false ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <h3 className="font-semibold text-[var(--theme-text-primary)]">Itens do Menu</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center">
                                            <input type="checkbox" id="mobileNavShowDashboard" name="mobileNavShowDashboard" checked={settings.mobileNavShowDashboard} onChange={handleChange} className="w-4 h-4 text-[var(--theme-accent)] bg-gray-100 border-gray-300 rounded focus:ring-[var(--theme-accent)]" />
                                            <label htmlFor="mobileNavShowDashboard" className="ml-2 text-sm font-medium text-[var(--theme-text-primary)]">Início (Dashboard)</label>
                                        </div>
                                        <div className="flex items-center">
                                            <input type="checkbox" id="mobileNavShowSchedule" name="mobileNavShowSchedule" checked={settings.mobileNavShowSchedule} onChange={handleChange} className="w-4 h-4 text-[var(--theme-accent)] bg-gray-100 border-gray-300 rounded focus:ring-[var(--theme-accent)]" />
                                            <label htmlFor="mobileNavShowSchedule" className="ml-2 text-sm font-medium text-[var(--theme-text-primary)]">Horários</label>
                                        </div>
                                        <div className="flex items-center">
                                            <input type="checkbox" id="mobileNavShowStudents" name="mobileNavShowStudents" checked={settings.mobileNavShowStudents} onChange={handleChange} className="w-4 h-4 text-[var(--theme-accent)] bg-gray-100 border-gray-300 rounded focus:ring-[var(--theme-accent)]" />
                                            <label htmlFor="mobileNavShowStudents" className="ml-2 text-sm font-medium text-[var(--theme-text-primary)]">Alunos</label>
                                        </div>
                                        <div className="flex items-center">
                                            <input type="checkbox" id="mobileNavShowProfile" name="mobileNavShowProfile" checked={settings.mobileNavShowProfile} onChange={handleChange} className="w-4 h-4 text-[var(--theme-accent)] bg-gray-100 border-gray-300 rounded focus:ring-[var(--theme-accent)]" />
                                            <label htmlFor="mobileNavShowProfile" className="ml-2 text-sm font-medium text-[var(--theme-text-primary)]">Perfil (Meus Dados)</label>
                                        </div>
                                    </div>
                                </div>

                                <div className={`bg-[var(--theme-bg)]/50 p-4 rounded-lg border border-[var(--theme-text-primary)]/5 space-y-4 transition-opacity ${settings.mobileNavVisible === false ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <h3 className="font-semibold text-[var(--theme-text-primary)]">Cores</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Input label="Cor de Fundo da Barra" name="mobileNavBgColor" type="color" value={settings.mobileNavBgColor} onChange={handleChange} />
                                        <Input label="Cor Ícone Ativo" name="mobileNavActiveColor" type="color" value={settings.mobileNavActiveColor} onChange={handleChange} />
                                        <Input label="Cor Ícone Inativo" name="mobileNavInactiveColor" type="color" value={settings.mobileNavInactiveColor} onChange={handleChange} />
                                    </div>
                                </div>

                                <div className={`bg-[var(--theme-bg)]/50 p-4 rounded-lg border border-[var(--theme-text-primary)]/5 space-y-4 transition-opacity ${settings.mobileNavVisible === false ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <h3 className="font-semibold text-[var(--theme-text-primary)]">Dimensões e Estilo</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input label="Altura da Barra (px)" name="mobileNavHeight" type="number" value={settings.mobileNavHeight} onChange={handleChange} />
                                        <Input label="Tamanho do Ícone (px)" name="mobileNavIconSize" type="number" value={settings.mobileNavIconSize} onChange={handleChange} />
                                        <Input label="Arredondamento dos Cantos (px)" name="mobileNavBorderRadius" type="number" value={settings.mobileNavBorderRadius} onChange={handleChange} />
                                        <Input label="Distância do Fim da Tela (px)" name="mobileNavBottomMargin" type="number" value={settings.mobileNavBottomMargin} onChange={handleChange} />
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-white rounded-lg mt-2 border border-slate-200">
                                        <label htmlFor="mobileNavFloating" className="font-medium text-[var(--theme-text-primary)]">Modo Flutuante (Floating)</label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" id="mobileNavFloating" name="mobileNavFloating" checked={settings.mobileNavFloating} onChange={handleChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-amber-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--theme-accent)]"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'webpage' && (
                             <>
                                {/* ... existing webpage settings ... */}
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-bold text-[var(--theme-accent)]">Configurar Página Web Pública</h2>
                                    <div className="flex items-center">
                                        <label htmlFor="publicPageEnabled" className="mr-3 text-sm font-medium text-[var(--theme-text-primary)]">Ativar Página</label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" id="publicPageEnabled" name="publicPageEnabled" checked={settings.publicPageEnabled} onChange={handleChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-amber-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--theme-accent)]"></div>
                                        </label>
                                    </div>
                                </div>
                                 <p className="text-sm text-[var(--theme-text-primary)]/70 -mt-4">
                                     {isAcademyAdmin 
                                        ? "Personalize a página pública da sua academia. Ela substituirá a página padrão para seus alunos." 
                                        : "Quando ativada, esta página será a primeira coisa que os visitantes verão antes da tela de login."}
                                 </p>
                                 
                                 <Textarea label="Seção Hero (Banner Principal)" name="heroHtml" value={settings.heroHtml} onChange={handleChange} />
                                 <Textarea label="Seção 'Quem Somos'" name="aboutHtml" value={settings.aboutHtml} onChange={handleChange} />
                                 <Textarea label="Seção 'Filiais' (Opcional)" name="branchesHtml" value={settings.branchesHtml} onChange={handleChange} />
                                 <Textarea label="Rodapé" name="footerHtml" value={settings.footerHtml} onChange={handleChange} />
                                 <Textarea label="CSS Personalizado" name="customCss" value={settings.customCss || ''} onChange={handleChange} />
                                 <Textarea label="JavaScript Personalizado" name="customJs" value={settings.customJs || ''} onChange={handleChange} />
                            </>
                        )}

                        {activeTab === 'direitos' && (
                             <div className="space-y-6 animate-fade-in-down">
                                {/* ... existing rights settings ... */}
                                <h2 className="text-xl font-bold text-[var(--theme-accent)] border-b border-[var(--theme-text-primary)]/10 pb-2">Direitos Autorais e Versão</h2>
                                <p className="text-sm text-[var(--theme-text-primary)]/70 -mt-4">
                                  Personalize o texto de copyright e a versão exibidos no rodapé do sistema.
                                </p>
                                <Input 
                                  label="Texto de Copyright" 
                                  name="copyrightText" 
                                  value={settings.copyrightText || ''} 
                                  onChange={handleChange}
                                  placeholder="Ex: © 2024 Sua Empresa"
                                />
                                <Input 
                                  label="Versão do Sistema" 
                                  name="systemVersion" 
                                  value={settings.systemVersion || ''} 
                                  onChange={handleChange}
                                  placeholder="Ex: 1.0.0"
                                />
                            </div>
                        )}
                        
                        <div className="flex justify-end items-center gap-4 pt-4 border-t border-[var(--theme-text-primary)]/10 mt-6">
                            <Button type="submit">Salvar Alterações</Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    );
};

export default SettingsPage;