import React, { useContext, useState, FormEvent } from 'react';
import { AppContext } from '../context/AppContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

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
    const { themeSettings, setThemeSettings, activityLogs, users, user } = useContext(AppContext);
    const [settings, setSettings] = useState(themeSettings);
    const [activeTab, setActiveTab] = useState<'system' | 'webpage' | 'activities' | 'pagamentos' | 'direitos'>('system');

    // Sync local state when themeSettings from context changes
    React.useEffect(() => {
        setSettings(themeSettings);
    }, [themeSettings]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) || 0 : value)
        }));
    };
    
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setThemeSettings(settings);
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-[var(--theme-text-primary)]">Configurações</h1>
            
            <div className="border-b border-[var(--theme-text-primary)]/10">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('system')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'system' ? 'border-[var(--theme-accent)] text-[var(--theme-accent)]' : 'border-transparent text-[var(--theme-text-primary)]/60 hover:text-[var(--theme-text-primary)]/80 hover:border-gray-300'}`}
                    >
                        Sistema
                    </button>
                    {user?.role === 'general_admin' && (
                       <button
                            onClick={() => setActiveTab('pagamentos')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'pagamentos' ? 'border-[var(--theme-accent)] text-[var(--theme-accent)]' : 'border-transparent text-[var(--theme-text-primary)]/60 hover:text-[var(--theme-text-primary)]/80 hover:border-gray-300'}`}
                        >
                            Pagamentos
                        </button>
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

                                {user?.role === 'general_admin' && (
                                    <>
                                        <h2 className="text-xl font-bold text-[var(--theme-accent)] border-b border-[var(--theme-text-primary)]/10 pb-2 pt-4">Controle de Acesso</h2>
                                        <div className="flex justify-between items-center p-3 bg-[var(--theme-bg)] rounded-lg">
                                            <label htmlFor="registrationEnabled" className="font-medium text-[var(--theme-text-primary)]">Permitir cadastro de novas academias</label>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="registrationEnabled" name="registrationEnabled" checked={settings.registrationEnabled} onChange={handleChange} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-amber-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--theme-accent)]"></div>
                                            </label>
                                        </div>
                                    </>
                                )}

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
                        
                        {activeTab === 'pagamentos' && user?.role === 'general_admin' && (
                            <div className="space-y-6 animate-fade-in-down">
                                <h2 className="text-xl font-bold text-[var(--theme-accent)] border-b border-[var(--theme-text-primary)]/10 pb-2">Configuração PIX</h2>
                                <p className="text-sm text-[var(--theme-text-primary)]/70 -mt-4">
                                  Insira os dados da chave PIX que será usada para receber os pagamentos das mensalidades.
                                </p>
                                <Input 
                                  label="Chave PIX" 
                                  name="pixKey" 
                                  value={settings.pixKey} 
                                  onChange={handleChange}
                                  placeholder="Email, CPF/CNPJ, Telefone ou Chave Aleatória"
                                />
                                <Input 
                                  label="Nome do Titular da Chave" 
                                  name="pixHolderName" 
                                  value={settings.pixHolderName} 
                                  onChange={handleChange}
                                  placeholder="Nome que aparecerá para o pagador"
                                  maxLength={25}
                                />
                            </div>
                        )}

                        {activeTab === 'webpage' && (
                             <>
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
                                 <p className="text-sm text-[var(--theme-text-primary)]/70 -mt-4">Quando ativada, esta página será a primeira coisa que os visitantes verão antes da tela de login.</p>
                                 
                                 <Textarea label="Seção Hero (Banner Principal)" name="heroHtml" value={settings.heroHtml} onChange={handleChange} />
                                 <Textarea label="Seção 'Quem Somos'" name="aboutHtml" value={settings.aboutHtml} onChange={handleChange} />
                                 <Textarea label="Seção 'Filiais'" name="branchesHtml" value={settings.branchesHtml} onChange={handleChange} />
                                 <Textarea label="Rodapé" name="footerHtml" value={settings.footerHtml} onChange={handleChange} />
                                 <Textarea label="CSS Personalizado" name="customCss" value={settings.customCss || ''} onChange={handleChange} />
                                 <Textarea label="JavaScript Personalizado" name="customJs" value={settings.customJs || ''} onChange={handleChange} />
                            </>
                        )}

                        {activeTab === 'direitos' && (
                             <div className="space-y-6 animate-fade-in-down">
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