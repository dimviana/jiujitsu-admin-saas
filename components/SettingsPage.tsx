
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import { ThemeSettings, SystemEvent } from '../types';
import { Image as ImageIcon, Calendar, Trash2, Edit, Search, CheckSquare, Square, Users } from 'lucide-react';
import Modal from './ui/Modal';

// --- Sub-Component: Audience Selection Modal ---
interface SelectAudienceModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSelection: string[];
    onConfirm: (selection: string[]) => void;
}

const SelectAudienceModal: React.FC<SelectAudienceModalProps> = ({ isOpen, onClose, currentSelection, onConfirm }) => {
    const { students, users, user } = useContext(AppContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentSelection));

    // Combine Students and Users (Staff) into one list
    const audienceList = useMemo(() => {
        let filteredUsers = users.filter(u => u.role !== 'student');
        let filteredStudents = students;

        if (user?.role !== 'general_admin') {
            filteredUsers = filteredUsers.filter(u => u.academyId === user?.academyId);
            filteredStudents = filteredStudents.filter(s => s.academyId === user?.academyId);
        }

        return [
            ...filteredUsers.map(u => ({ id: u.id, name: u.name, type: `Staff (${u.role})` })),
            ...filteredStudents.map(s => ({ id: s.id, name: s.name, type: 'Aluno' }))
        ].filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [users, students, user, searchTerm]);

    const toggleId = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === audienceList.length) {
            setSelectedIds(new Set());
        } else {
            const allIds = audienceList.map(i => i.id);
            setSelectedIds(new Set(allIds));
        }
    };

    const handleSave = () => {
        onConfirm(Array.from(selectedIds));
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quem vai ver este evento?" size="lg">
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar por nome..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="max-h-[50vh] overflow-y-auto border border-slate-200 rounded-lg custom-scrollbar">
                    <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center sticky top-0 z-10">
                        <button onClick={handleSelectAll} className="flex items-center text-sm font-semibold text-slate-600">
                            {selectedIds.size === audienceList.length && audienceList.length > 0 ? <CheckSquare className="w-4 h-4 mr-2" /> : <Square className="w-4 h-4 mr-2" />}
                            Selecionar Todos
                        </button>
                        <span className="ml-auto text-xs text-slate-500">{selectedIds.size} selecionados</span>
                    </div>
                    {audienceList.length > 0 ? audienceList.map(item => (
                        <div key={item.id} className={`flex items-center p-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 cursor-pointer ${selectedIds.has(item.id) ? 'bg-amber-50' : ''}`} onClick={() => toggleId(item.id)}>
                            <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center transition-colors ${selectedIds.has(item.id) ? 'bg-primary border-primary text-white' : 'border-slate-300'}`}>
                                {selectedIds.has(item.id) && <span className="text-xs">✓</span>}
                            </div>
                            <div>
                                <p className="font-medium text-slate-800 text-sm">{item.name}</p>
                                <p className="text-xs text-slate-500">{item.type}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="p-4 text-center text-slate-500">Nenhum membro encontrado.</div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Confirmar Seleção</Button>
                </div>
            </div>
        </Modal>
    );
};

// --- Settings Page ---

const SettingsPage: React.FC = () => {
    const { themeSettings, setThemeSettings, events, saveEvent, deleteEvent, toggleEventStatus } = useContext(AppContext);
    const [activeTab, setActiveTab] = useState<'geral' | 'cores' | 'conteudo' | 'financeiro' | 'midia' | 'direitos' | 'eventos'>('geral');
    const [settings, setSettings] = useState<ThemeSettings>(themeSettings);
    
    // Event State
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [currentEvent, setCurrentEvent] = useState<Partial<SystemEvent>>({});
    const [isAudienceModalOpen, setIsAudienceModalOpen] = useState(false);

    useEffect(() => {
        setSettings(themeSettings);
    }, [themeSettings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setThemeSettings(settings);
    };

    // --- Event Handlers ---
    const handleOpenEventModal = (event: Partial<SystemEvent> = {}) => {
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);
        
        setCurrentEvent({
            title: '',
            description: '',
            footerType: 'text',
            footerContent: '',
            active: true,
            targetAudience: [],
            ...event,
            // Format dates for input datetime-local: YYYY-MM-DDTHH:mm
            startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : now.toISOString().slice(0, 16),
            endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : nextWeek.toISOString().slice(0, 16)
        });
        setIsEventModalOpen(true);
    };

    const handleSaveEvent = async () => {
        if (!currentEvent.title || !currentEvent.startDate || !currentEvent.endDate) {
            alert("Preencha o título e as datas do evento.");
            return;
        }
        await saveEvent(currentEvent as any);
        setIsEventModalOpen(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'footerContent') => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCurrentEvent(prev => ({ ...prev, [field]: reader.result as string }));
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const tabs = [
        { id: 'geral', label: 'Geral' },
        { id: 'cores', label: 'Cores' },
        { id: 'financeiro', label: 'Financeiro' },
        { id: 'conteudo', label: 'Conteúdo' },
        { id: 'midia', label: 'Mídia & Integrações' },
        { id: 'direitos', label: 'Direitos' },
        { id: 'eventos', label: 'Eventos' }
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Configurações do Sistema</h1>
            
            <div className="flex overflow-x-auto border-b border-slate-200">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <Card>
                {activeTab === 'eventos' ? (
                    <div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Gerenciar Eventos (Popups)</h2>
                                <p className="text-sm text-slate-500">Crie avisos e eventos que aparecem para os alunos ao logar.</p>
                            </div>
                            <Button onClick={() => handleOpenEventModal()}>Adicionar Evento</Button>
                        </div>

                        <div className="space-y-4">
                            {events.length === 0 && <p className="text-slate-500 text-center py-8">Nenhum evento criado.</p>}
                            {events.map(event => (
                                <div key={event.id} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg gap-4">
                                    <div className="flex items-center gap-4 w-full">
                                        <div className="w-16 h-16 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                                            {event.imageUrl ? (
                                                <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-slate-400"><ImageIcon className="w-6 h-6"/></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-800 truncate">{event.title}</h3>
                                            <p className="text-xs text-slate-500 flex items-center gap-2 mb-1">
                                                <Calendar className="w-3 h-3"/> {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${event.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                                                    {event.active ? 'Ativo' : 'Inativo'}
                                                </span>
                                                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 flex items-center">
                                                    <Users className="w-3 h-3 mr-1" />
                                                    {event.targetAudience && event.targetAudience.length > 0 
                                                        ? `${event.targetAudience.length} destinatários` 
                                                        : 'Todos'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                        <Button size="sm" variant="secondary" onClick={() => toggleEventStatus(event.id, !event.active)}>{event.active ? 'Desativar' : 'Ativar'}</Button>
                                        <Button size="sm" variant="secondary" onClick={() => handleOpenEventModal(event)}><Edit className="w-4 h-4"/></Button>
                                        <Button size="sm" variant="danger" onClick={() => { if(window.confirm('Excluir evento?')) deleteEvent(event.id) }}><Trash2 className="w-4 h-4"/></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-6">
                        {activeTab === 'geral' && (
                            <div className="space-y-4">
                                <Input label="Nome do Sistema / Academia" name="systemName" value={settings.systemName} onChange={handleChange} />
                                <Input label="URL do Logo" name="logoUrl" value={settings.logoUrl} onChange={handleChange} />
                                <Input label="Nome do App (PWA)" name="appName" value={settings.appName || ''} onChange={handleChange} placeholder="Nome curto para ícone no celular" />
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ícone do App (Base64/URL)</label>
                                    <input type="file" accept="image/*" onChange={(e) => {
                                        if(e.target.files?.[0]) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => setSettings(prev => ({...prev, appIcon: reader.result as string}));
                                            reader.readAsDataURL(e.target.files[0]);
                                        }
                                    }} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-amber-600"/>
                                </div>
                            </div>
                        )}

                        {activeTab === 'cores' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Cor Primária" name="primaryColor" type="color" value={settings.primaryColor} onChange={handleChange} />
                                <Input label="Cor Secundária" name="secondaryColor" type="color" value={settings.secondaryColor} onChange={handleChange} />
                                <Input label="Cor de Fundo" name="backgroundColor" type="color" value={settings.backgroundColor} onChange={handleChange} />
                                <Input label="Cor dos Cards" name="cardBackgroundColor" type="color" value={settings.cardBackgroundColor} onChange={handleChange} />
                            </div>
                        )}

                        {activeTab === 'financeiro' && (
                            <div className="space-y-4">
                                <Input label="Chave PIX" name="pixKey" value={settings.pixKey} onChange={handleChange} />
                                <Input label="Nome do Titular PIX" name="pixHolderName" value={settings.pixHolderName} onChange={handleChange} />
                                <Input label="Valor Mensalidade Padrão" name="monthlyFeeAmount" type="number" value={settings.monthlyFeeAmount} onChange={handleChange} />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Dias Lembrete (Antes)" name="reminderDaysBeforeDue" type="number" value={settings.reminderDaysBeforeDue} onChange={handleChange} />
                                    <Input label="Dias Atraso (Depois)" name="overdueDaysAfterDue" type="number" value={settings.overdueDaysAfterDue} onChange={handleChange} />
                                </div>
                                <h3 className="font-bold pt-4 text-slate-800">Mercado Pago</h3>
                                <Input label="Access Token" name="mercadoPagoAccessToken" value={settings.mercadoPagoAccessToken || ''} onChange={handleChange} type="password" />
                                <Input label="Public Key" name="mercadoPagoPublicKey" value={settings.mercadoPagoPublicKey || ''} onChange={handleChange} />
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" name="creditCardEnabled" checked={settings.creditCardEnabled} onChange={handleChange} id="ccEnabled" className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"/>
                                    <label htmlFor="ccEnabled" className="text-sm font-medium text-gray-700">Habilitar Pagamento com Cartão</label>
                                </div>
                                <Input label="Taxa Adicional Cartão (R$)" name="creditCardSurcharge" type="number" value={settings.creditCardSurcharge || 0} onChange={handleChange} />
                            </div>
                        )}

                        {activeTab === 'conteudo' && (
                            <div className="space-y-4">
                                <p className="text-xs text-slate-500">Cole aqui o código HTML para as seções da página pública.</p>
                                <div><label className="block text-sm font-medium mb-1">Hero HTML</label><textarea name="heroHtml" value={settings.heroHtml} onChange={handleChange} className="w-full border rounded p-2 h-24" /></div>
                                <div><label className="block text-sm font-medium mb-1">Sobre HTML</label><textarea name="aboutHtml" value={settings.aboutHtml} onChange={handleChange} className="w-full border rounded p-2 h-24" /></div>
                                <div><label className="block text-sm font-medium mb-1">Contato (Texto Simples)</label><textarea name="contactHtml" value={settings.contactHtml} onChange={handleChange} className="w-full border rounded p-2 h-24" /></div>
                            </div>
                        )}

                        {activeTab === 'midia' && (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center"><input type="checkbox" name="publicPageEnabled" checked={settings.publicPageEnabled} onChange={handleChange} className="mr-2"/> Página Pública</label>
                                    <label className="flex items-center"><input type="checkbox" name="registrationEnabled" checked={settings.registrationEnabled} onChange={handleChange} className="mr-2"/> Cadastro Academia</label>
                                    <label className="flex items-center"><input type="checkbox" name="socialLoginEnabled" checked={settings.socialLoginEnabled} onChange={handleChange} className="mr-2"/> Login Social</label>
                                </div>
                                <Input label="Google Client ID" name="googleClientId" value={settings.googleClientId || ''} onChange={handleChange} />
                                <div>
                                    <label className="block text-sm font-medium mb-1">Template Mensagem WhatsApp</label>
                                    <textarea name="whatsappMessageTemplate" value={settings.whatsappMessageTemplate || ''} onChange={handleChange} className="w-full border rounded p-2" placeholder="Olá {nome}, tudo bem?" />
                                    <p className="text-xs text-slate-500">Variáveis: {'{nome}'}, {'{aluno}'}</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'direitos' && (
                             <div className="space-y-6 animate-fade-in-down">
                                <h2 className="text-xl font-bold text-[var(--theme-accent)] border-b border-[var(--theme-text-primary)]/10 pb-2">Direitos Autorais e Versão</h2>
                                <Input label="Texto de Copyright" name="copyrightText" value={settings.copyrightText || ''} onChange={handleChange} placeholder="Ex: © 2024 Sua Empresa" />
                                <Input label="Versão do Sistema" name="systemVersion" value={settings.systemVersion || ''} onChange={handleChange} placeholder="Ex: 1.0.0" />
                            </div>
                        )}
                        
                        <div className="flex justify-end items-center gap-4 pt-4 border-t border-[var(--theme-text-primary)]/10 mt-6">
                            <Button type="submit">Salvar Alterações</Button>
                        </div>
                    </form>
                )}
            </Card>

            {/* Event Edit Modal */}
            <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} title="Editor de Evento" size="4xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="space-y-4">
                        <Input label="Título do Evento" value={currentEvent.title || ''} onChange={(e) => setCurrentEvent(prev => ({ ...prev, title: e.target.value }))} placeholder="Ex: Seminário de Verão" required />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Início Exibição" type="datetime-local" value={currentEvent.startDate || ''} onChange={(e) => setCurrentEvent(prev => ({ ...prev, startDate: e.target.value }))} required />
                            <Input label="Fim Exibição" type="datetime-local" value={currentEvent.endDate || ''} onChange={(e) => setCurrentEvent(prev => ({ ...prev, endDate: e.target.value }))} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Descrição</label>
                            <textarea className="w-full border border-slate-200 rounded-lg p-2 h-32 focus:ring-primary focus:border-primary outline-none" value={currentEvent.description || ''} onChange={(e) => setCurrentEvent(prev => ({ ...prev, description: e.target.value }))} placeholder="Detalhes do evento..."></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Imagem Principal</label>
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'imageUrl')} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-amber-600"/>
                            {currentEvent.imageUrl && <img src={currentEvent.imageUrl} alt="Preview" className="mt-2 h-32 object-contain border rounded bg-slate-50" />}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h3 className="font-bold text-sm mb-2 text-slate-700">Rodapé do Popup</h3>
                            <div className="flex gap-4 mb-2">
                                <label className="flex items-center text-sm cursor-pointer"><input type="radio" name="footerType" checked={currentEvent.footerType === 'text'} onChange={() => setCurrentEvent(prev => ({...prev, footerType: 'text'}))} className="mr-2"/> Texto</label>
                                <label className="flex items-center text-sm cursor-pointer"><input type="radio" name="footerType" checked={currentEvent.footerType === 'image'} onChange={() => setCurrentEvent(prev => ({...prev, footerType: 'image'}))} className="mr-2"/> Imagem</label>
                            </div>
                            {currentEvent.footerType === 'text' ? (
                                <Input label="Texto do Rodapé" value={currentEvent.footerContent || ''} onChange={(e) => setCurrentEvent(prev => ({ ...prev, footerContent: e.target.value }))} />
                            ) : (
                                <div>
                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'footerContent')} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-amber-600"/>
                                    {currentEvent.footerContent && <img src={currentEvent.footerContent} alt="Footer Preview" className="mt-2 h-16 object-contain" />}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h3 className="font-bold text-sm mb-2 text-slate-700">Público Alvo</h3>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">
                                    {currentEvent.targetAudience && currentEvent.targetAudience.length > 0 
                                        ? `${currentEvent.targetAudience.length} pessoas selecionadas` 
                                        : 'Todos (Padrão)'}
                                </span>
                                <Button size="sm" variant="secondary" onClick={() => setIsAudienceModalOpen(true)}>
                                    <Users className="w-4 h-4 mr-2" /> Quem vai ver?
                                </Button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-purple-600">HTML Override (Avançado)</label>
                            <textarea className="w-full border border-purple-200 rounded-lg p-2 h-32 bg-purple-50 font-mono text-xs focus:ring-purple-500 focus:border-purple-500 outline-none" value={currentEvent.htmlContent || ''} onChange={(e) => setCurrentEvent(prev => ({ ...prev, htmlContent: e.target.value }))} placeholder="<h1>Meu Popup Personalizado</h1>..."></textarea>
                            <p className="text-[10px] text-slate-500 mt-1">Se preenchido, substitui todo o layout padrão do popup.</p>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                    <Button variant="secondary" onClick={() => setIsEventModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSaveEvent}>Salvar Evento</Button>
                </div>
            </Modal>

            {/* Audience Selection Modal */}
            {isAudienceModalOpen && (
                <SelectAudienceModal 
                    isOpen={isAudienceModalOpen} 
                    onClose={() => setIsAudienceModalOpen(false)}
                    currentSelection={currentEvent.targetAudience || []}
                    onConfirm={(selection) => setCurrentEvent(prev => ({ ...prev, targetAudience: selection }))}
                />
            )}
        </div>
    );
};

export default SettingsPage;
