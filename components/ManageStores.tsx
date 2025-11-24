
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAppContext } from '../App';
import { MedicalStore } from '../types';
import { Button, Input, Textarea, Icon, Modal, SearchInput } from './ui';
import StoreListItem from './StoreListItem';
import LightRays from './LightRays';

declare var Fuse: any;

const StoreForm = ({ 
    initialData, 
    onSave, 
    onCancel,
    existingNames,
    submitButtonText = 'Save',
}: { 
    initialData?: Partial<MedicalStore>,
    onSave: (store: Omit<MedicalStore, 'id'> & { id?: string | null }) => void, 
    onCancel: () => void,
    existingNames: string[],
    submitButtonText?: string,
}) => {
    const [name, setName] = useState(initialData?.name || '');
    const [address, setAddress] = useState(initialData?.address || '');
    const nameInputRef = useRef<HTMLInputElement>(null);
    const addressInputRef = useRef<HTMLTextAreaElement>(null);
    const submitButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setName(initialData?.name || '');
        setAddress(initialData?.address || '');
    }, [initialData]);

    const nameIsDuplicate = useMemo(() => {
        const trimmedName = name.trim().toLowerCase();
        if (!trimmedName) return false;
        if (initialData?.id && initialData.name?.trim().toLowerCase() === trimmedName) {
            return false;
        }
        return existingNames.includes(trimmedName);
    }, [name, existingNames, initialData]);

    useEffect(() => {
        setTimeout(() => nameInputRef.current?.focus(), 100);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName || !address.trim() || nameIsDuplicate) {
            return;
        }
        onSave({ id: initialData?.id, name: trimmedName, address: address.trim() });
    };

    const isFormValid = name.trim() && address.trim() && !nameIsDuplicate;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const target = e.currentTarget;

        // Ctrl key to select all text
        if (e.key === 'Control') {
            target.select();
        }

        // Arrow key navigation
        if (e.key === 'ArrowDown' && target === nameInputRef.current) {
            e.preventDefault();
            addressInputRef.current?.focus();
        }
        if (e.key === 'ArrowUp' && target === addressInputRef.current) {
            e.preventDefault();
            nameInputRef.current?.focus();
        }

        // Enter key navigation/submission
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (target === nameInputRef.current) {
                addressInputRef.current?.focus();
            } else if (target === addressInputRef.current) {
                if (isFormValid) {
                    submitButtonRef.current?.click();
                }
            }
        }
    };


    return (
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <div>
                <Input
                    ref={nameInputRef}
                    label="STORE NAME:"
                    id={`name-${initialData?.id || 'add'}`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g.; Hammad Medical Store"
                    required
                    onKeyDown={handleKeyDown}
                />
                {nameIsDuplicate && (
                    <p className="form-error-message">
                        <Icon name="error" className="!text-base" />
                        <span>This store name already exists.</span>
                    </p>
                )}
            </div>
            <div>
                <Textarea
                    ref={addressInputRef}
                    label="STORE ADDRESS:"
                    id={`address-${initialData?.id || 'add'}`}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="eg; Rachna Town, Faisalabad"
                    required
                    rows={4}
                    className="min-h-[100px]"
                    onKeyDown={handleKeyDown}
                />
            </div>
            <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button ref={submitButtonRef} type="submit" disabled={!isFormValid} icon="save" variant="primary">
                    {submitButtonText}
                </Button>
            </div>
        </form>
    );
};

const GlowButton = ({ children, onClick, className = '', icon }: any) => (
    <button 
      onClick={onClick} 
      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 active:scale-95 text-sm 
      bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] 
      border border-indigo-500/50 ${className}`}
    >
      {icon && <Icon name={icon} className="text-xl" />}
      {children}
    </button>
);

export default function ManageStores() {
    const { medicalStores, addMedicalStore, updateMedicalStore, deleteMedicalStore, startBillingForStore, addNotification, activeView, viewBillsForStore } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [storeToEdit, setStoreToEdit] = useState<MedicalStore | null>(null);
    const [storeToDeleteConfirm, setStoreToDeleteConfirm] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; storeId: string | null; }>({ visible: false, x: 0, y: 0, storeId: null });
    const [isDeleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);

    const storeFuse = useMemo(() => new Fuse(medicalStores, { keys: ['name', 'address'], threshold: 0.3 }), [medicalStores]);
    
    const filteredStores = useMemo(() => {
        const sortedStores = [...medicalStores].sort((a, b) => a.name.localeCompare(b.name));
        if (!searchTerm.trim()) return sortedStores;
        return storeFuse.search(searchTerm.trim()).map((result: any) => result.item as MedicalStore);
    }, [searchTerm, medicalStores, storeFuse]);
    
    const allStoreNames = useMemo(() => medicalStores.map(s => s.name.trim().toLowerCase()), [medicalStores]);
    
    const closeContextMenu = useCallback(() => {
        setContextMenu({ visible: false, x: 0, y: 0, storeId: null });
        setDeleteConfirmationVisible(false);
    }, []);

    useEffect(() => {
        if (!contextMenu.visible) return;
        const handleKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && closeContextMenu();
        window.addEventListener('click', closeContextMenu);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('click', closeContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [contextMenu.visible, closeContextMenu]);

    const handleSaveStore = useCallback(async (storeData: { id?: string | null; name: string; address: string }) => {
        if (storeData.id) { // Editing
            await updateMedicalStore({ id: storeData.id, name: storeData.name, address: storeData.address });
            addNotification("Store updated successfully!", "success");
            setIsEditModalOpen(false);
        } else { // Adding
            await addMedicalStore({ name: storeData.name, address: storeData.address });
            addNotification("Store added successfully!", "success");
            setIsAddModalOpen(false);
        }
        closeContextMenu();
    }, [updateMedicalStore, addMedicalStore, addNotification, closeContextMenu]);
    
    const handleDeleteClick = useCallback((store: MedicalStore) => {
        setStoreToDeleteConfirm(store.id);
    }, []);

    const handleConfirmDelete = useCallback(async (storeId: string) => {
        const store = medicalStores.find(s => s.id === storeId);
        if (store) {
            await deleteMedicalStore(storeId);
            addNotification(`"${store.name}" was deleted.`, 'info');
        }
        setStoreToDeleteConfirm(null);
        closeContextMenu();
    }, [medicalStores, deleteMedicalStore, addNotification, closeContextMenu]);

    const handleEdit = useCallback((store: MedicalStore) => {
        setStoreToEdit(store);
        setIsEditModalOpen(true);
        closeContextMenu();
    }, [closeContextMenu]);
    
    const handleListItemMouseLeave = useCallback(() => {
        setStoreToDeleteConfirm(null);
    }, []);

    const handleOpenAddModal = useCallback(() => {
        setStoreToEdit(null);
        setIsAddModalOpen(true);
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent, storeId: string) => {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, storeId });
    }, []);
    
    const contextStore = useMemo(() => medicalStores.find(s => s.id === contextMenu.storeId), [contextMenu.storeId, medicalStores]);

    // --- Keyboard Shortcuts ---
    useEffect(() => {
        if (activeView !== 'manage-stores' || isAddModalOpen || isEditModalOpen || contextMenu.visible) return;

        const handleNav = (e: KeyboardEvent) => {
            if (e.key === 'F12') {
                e.preventDefault();
                handleOpenAddModal();
                return;
            }

            const target = e.target as HTMLElement;
            const isSearchFocused = target === searchInputRef.current;
            const currentLi = target.closest('li.store-list-item');
            
            if (isSearchFocused && e.key === 'ArrowDown' && listRef.current?.children.length) {
                e.preventDefault();
                (listRef.current.children[0] as HTMLElement)?.focus();
                return;
            }

            if (!currentLi || !listRef.current) return;

            const allLis = Array.from(listRef.current.children);
            const currentIndex = allLis.indexOf(currentLi);

            // Navigation between list items
            if (target.tagName === 'LI') {
                if (e.key === 'ArrowUp') { e.preventDefault(); (allLis[currentIndex - 1] as HTMLElement)?.focus(); }
                if (e.key === 'ArrowDown') { e.preventDefault(); (allLis[currentIndex + 1] as HTMLElement)?.focus(); }
                if (e.key === 'ArrowRight') { e.preventDefault(); (currentLi.querySelector('button') as HTMLElement)?.focus(); }
                if (e.key === 'Enter') { e.preventDefault(); (currentLi.querySelector('.store-list-item-actions button') as HTMLElement)?.click(); }
            }

            // Navigation between buttons
            if (target.tagName === 'BUTTON') {
                const buttons = Array.from(currentLi.querySelectorAll('.store-list-item-actions button'));
                const currentButtonIndex = buttons.indexOf(target);
                
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    (buttons[currentButtonIndex + 1] as HTMLElement)?.focus();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    if (currentButtonIndex > 0) {
                        (buttons[currentButtonIndex - 1] as HTMLElement)?.focus();
                    } else {
                        (currentLi as HTMLElement).focus(); // Go back to LI from first button
                    }
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    (allLis[currentIndex - 1] as HTMLElement)?.focus();
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    (allLis[currentIndex + 1] as HTMLElement)?.focus();
                }
            }
        };

        window.addEventListener('keydown', handleNav);
        return () => window.removeEventListener('keydown', handleNav);
    }, [activeView, isAddModalOpen, isEditModalOpen, handleOpenAddModal, contextMenu.visible]);


    return (
        // Applied Theme: Chinese Black Background
        <div className="h-full flex flex-col py-4 md:py-6 animate-fade-in space-y-6 bg-[#0D0E20] relative overflow-hidden">
            {/* Added LightRays background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <LightRays 
                    raysOrigin="top-center" 
                    raysColor="#5b21b6" // Violet-800
                    raysSpeed={0.2} 
                    lightSpread={0.6}
                    rayLength={1.2} 
                    fadeDistance={0.6}
                    mouseInfluence={0.05}
                />
            </div>

            <header className="page-header flex-shrink-0 flex flex-col md:flex-row justify-between items-center gap-4 border-[#2D1C7F] relative z-10 px-4 md:px-6">
                <div>
                  {/* Theme Text Colors: Vodka & Max Blue Purple */}
                  <h1 className="text-3xl md:text-4xl font-bold text-[#C8B3F6] tracking-tight">Manage Stores</h1>
                  <p className="text-[#B0A9E5] mt-1">Add, edit, or start a bill for a customer.</p>
                </div>
                
                <div className="flex w-full md:w-auto gap-4 flex-col md:flex-row md:items-stretch">
                    <SearchInput
                        ref={searchInputRef}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onClear={() => setSearchTerm('')}
                        placeholder="Search Medical Store..."
                        className="w-full md:w-auto"
                        // Theme: Persian Indigo BG, Majorelle Blue Border
                        style={{'--width-of-input': '300px', '--input-bg': '#2D1C7F', '--border-color': '#7546E8', color: '#C8B3F6'} as React.CSSProperties}
                    />
                    {/* Theme: Majorelle Blue Button */}
                    <Button 
                        onClick={handleOpenAddModal} 
                        variant="primary" 
                        icon="add" 
                        className="w-full md:w-auto !h-[44px] !bg-[#7546E8] hover:!bg-[#5e35b1] text-white shadow-[0_0_15px_rgba(117,70,232,0.3)] border border-[#7546E8]"
                    >
                        New Store
                    </Button>
                </div>
            </header>
            
            <main className="flex-grow overflow-hidden flex flex-col relative z-10">
                {/* Theme: Persian Indigo Container with Border */}
                <div className="store-list-container flex-grow overflow-y-auto custom-scrollbar !bg-[#2D1C7F]/10 !border-[#7546E8]/30 !rounded-none !border-x-0">
                    {filteredStores.length > 0 ? (
                        <ul ref={listRef} className="store-list">
                            {filteredStores.map(store => (
                                <StoreListItem
                                    key={store.id}
                                    store={store}
                                    storeToDeleteConfirm={storeToDeleteConfirm}
                                    onStartBilling={startBillingForStore}
                                    onEdit={handleEdit}
                                    onDeleteClick={handleDeleteClick}
                                    onConfirmDelete={handleConfirmDelete}
                                    onMouseLeave={handleListItemMouseLeave}
                                    onContextMenu={handleContextMenu}
                                />
                            ))}
                        </ul>
                    ) : (
                         <div className="w-full h-full">
                            <style>{`
                                @keyframes blob {
                                0% { transform: translate(0px, 0px) scale(1); }
                                33% { transform: translate(30px, -50px) scale(1.1); }
                                66% { transform: translate(-20px, 20px) scale(0.9); }
                                100% { transform: translate(0px, 0px) scale(1); }
                                }
                                .animate-blob {
                                animation: blob 7s infinite;
                                }
                                .animation-delay-2000 {
                                animation-delay: 2s;
                                }
                                .animation-delay-4000 {
                                animation-delay: 4s;
                                }
                            `}</style>

                            <div className="relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center">
                                
                                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-70 animate-blob"></div>
                                
                                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-70 animate-blob animation-delay-2000"></div>
                                
                                <div className="absolute -bottom-32 left-1/2 transform -translate-x-1/2 w-80 h-80 bg-blue-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 animate-blob animation-delay-4000"></div>

                                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"></div>

                                <div className="relative z-10 flex flex-col items-center text-center p-8 animate-fade-in">
                                
                                <div className="relative mb-8 group cursor-default">
                                    <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                                    <div className="relative bg-slate-900 border border-slate-700/50 p-6 rounded-full shadow-xl">
                                    <Icon name={searchTerm ? "search_off" : "storefront"} className="text-5xl text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.5)]" />
                                    </div>
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight drop-shadow-md">
                                    {searchTerm ? "No Stores Found" : "No Stores Found"}
                                </h3>
                                <p className="text-slate-400 max-w-md mb-10 leading-relaxed text-sm">
                                    {searchTerm 
                                        ? `Your search for "${searchTerm}" didn't match any stores.` 
                                        : <>You haven't added any medical stores to your distribution list yet. <br className="hidden sm:block" /> Add one to get started with your sales.</>}
                                </p>

                                {searchTerm ? (
                                    <GlowButton onClick={() => setSearchTerm('')} icon="close">
                                        Clear Search
                                    </GlowButton>
                                ) : (
                                    <GlowButton onClick={handleOpenAddModal} icon="add">
                                        Add First Store
                                    </GlowButton>
                                )}
                                
                                </div>

                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Add Store Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Store">
                <StoreForm
                    initialData={{}}
                    onSave={handleSaveStore}
                    onCancel={() => setIsAddModalOpen(false)}
                    existingNames={allStoreNames}
                    submitButtonText="Add Store"
                />
            </Modal>

            {/* Edit Store Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Store">
                {storeToEdit && (
                    <StoreForm
                        initialData={storeToEdit}
                        onSave={handleSaveStore}
                        onCancel={() => setIsEditModalOpen(false)}
                        existingNames={allStoreNames.filter(name => name !== storeToEdit.name.trim().toLowerCase())}
                        submitButtonText="Save Changes"
                    />
                )}
            </Modal>
            
            {/* Context Menu */}
            {contextMenu.visible && contextStore && (
                 <div
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    className="fixed bg-[#2D1C7F]/90 backdrop-blur-xl border border-[#7546E8]/50 rounded-lg shadow-2xl p-1.5 z-50 w-56 animate-modal-content text-sm"
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <ul className="space-y-1">
                        <li onClick={() => startBillingForStore(contextStore.id)} className="flex items-center gap-3 px-3 py-1.5 text-[#C8B3F6] hover:bg-[#7546E8] hover:text-white rounded-md cursor-pointer transition-colors">
                            <Icon name="receipt_long" className="w-4 text-center" />
                            <span>Create Bill</span>
                        </li>
                        <li onClick={() => handleEdit(contextStore)} className="flex items-center gap-3 px-3 py-1.5 text-[#C8B3F6] hover:bg-[#7546E8] hover:text-white rounded-md cursor-pointer transition-colors">
                            <Icon name="edit" className="w-4 text-center" />
                            <span>Edit Store...</span>
                        </li>
                         <li onClick={() => viewBillsForStore(contextStore.id)} className="flex items-center gap-3 px-3 py-1.5 text-[#C8B3F6] hover:bg-[#7546E8] hover:text-white rounded-md cursor-pointer transition-colors">
                            <Icon name="history" className="w-4 text-center" />
                            <span>View Bills</span>
                        </li>
                        {isDeleteConfirmationVisible ? (
                            <li onClick={() => handleConfirmDelete(contextStore.id)} className="flex items-center gap-3 px-3 py-1.5 text-white bg-red-600 hover:bg-red-500 rounded-md cursor-pointer transition-colors">
                                <Icon name="warning" className="w-4 text-center" />
                                <span>Confirm Delete?</span>
                            </li>
                        ) : (
                            <li onClick={() => setDeleteConfirmationVisible(true)} className="flex items-center gap-3 px-3 py-1.5 text-red-400 hover:bg-red-500 hover:text-white rounded-md cursor-pointer transition-colors">
                                <Icon name="delete" className="w-4 text-center" />
                                <span>Delete Store</span>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
