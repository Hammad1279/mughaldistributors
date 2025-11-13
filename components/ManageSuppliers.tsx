import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAppContext } from '../App';
import { Supplier } from '../types';
import { Button, Input, Textarea, Icon, Modal, Card, SearchInput } from './ui';
import SupplierListItem from './SupplierListItem';
import { StockLevelsModal } from './StockLevelsModal';

declare var Fuse: any;

const SupplierForm = ({ 
    initialData, 
    onSave, 
    onCancel,
    existingNames,
    submitButtonText = 'Save',
}: { 
    initialData?: Partial<Supplier>,
    onSave: (supplier: Omit<Supplier, 'id'> & { id?: string | null }) => void, 
    onCancel: () => void,
    existingNames: string[],
    submitButtonText?: string,
}) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        address: initialData?.address || '',
        contactPerson: initialData?.contactPerson || '',
        phone: initialData?.phone || '',
    });
    const nameInputRef = useRef<HTMLInputElement>(null);
    const addressInputRef = useRef<HTMLTextAreaElement>(null);
    const contactPersonInputRef = useRef<HTMLInputElement>(null);
    const phoneInputRef = useRef<HTMLInputElement>(null);
    const submitButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setFormData({
            name: initialData?.name || '',
            address: initialData?.address || '',
            contactPerson: initialData?.contactPerson || '',
            phone: initialData?.phone || '',
        });
        setTimeout(() => nameInputRef.current?.focus(), 100);
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const nameIsDuplicate = useMemo(() => {
        const trimmedName = formData.name.trim().toLowerCase();
        if (!trimmedName) return false;
        if (initialData?.id && initialData.name?.trim().toLowerCase() === trimmedName) {
            return false;
        }
        return existingNames.includes(trimmedName);
    }, [formData.name, existingNames, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = formData.name.trim();
        if (!trimmedName || !formData.address.trim() || nameIsDuplicate) {
            return;
        }
        onSave({ id: initialData?.id, ...formData, name: trimmedName });
    };

    const isFormValid = formData.name.trim() && formData.address.trim() && !nameIsDuplicate;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Exclude Shift+Enter for textarea
            e.preventDefault();
            const target = e.target as HTMLElement;

            if (target === nameInputRef.current) {
                addressInputRef.current?.focus();
            } else if (target === addressInputRef.current) {
                contactPersonInputRef.current?.focus();
            } else if (target === contactPersonInputRef.current) {
                phoneInputRef.current?.focus();
            } else if (target === phoneInputRef.current) {
                submitButtonRef.current?.focus();
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <div>
                <Input ref={nameInputRef} label="Supplier Name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g., Global Pharma" required onKeyDown={handleKeyDown} />
                {nameIsDuplicate && (
                    <p className="form-error-message mt-1.5">
                        <Icon name="error" className="!text-base" />
                        <span>This supplier name already exists.</span>
                    </p>
                )}
            </div>
            <Textarea ref={addressInputRef} label="Address" name="address" value={formData.address} onChange={handleChange} placeholder="Supplier's physical address" required onKeyDown={handleKeyDown} />
            <Input ref={contactPersonInputRef} label="Contact Person (Optional)" name="contactPerson" value={formData.contactPerson} onChange={handleChange} placeholder="e.g., Mr. Ahmed" onKeyDown={handleKeyDown} />
            <Input ref={phoneInputRef} label="Phone (Optional)" name="phone" value={formData.phone} onChange={handleChange} placeholder="e.g., 0300-1234567" onKeyDown={handleKeyDown} />
            <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button ref={submitButtonRef} type="submit" disabled={!isFormValid} icon="save" variant="primary">
                    {submitButtonText}
                </Button>
            </div>
        </form>
    );
};

export default function ManageSuppliers() {
    const { suppliers, addSupplier, updateSupplier, deleteSupplier, startPurchaseForSupplier, viewPurchaseHistoryForSupplier, addNotification } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; supplierId: string | null; }>({ visible: false, x: 0, y: 0, supplierId: null });
    const [isDeleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);

    const supplierFuse = useMemo(() => new Fuse(suppliers, { keys: ['name', 'address', 'contactPerson'], threshold: 0.3 }), [suppliers]);
    
    const filteredSuppliers = useMemo(() => {
        const sorted = [...suppliers].sort((a, b) => a.name.localeCompare(b.name));
        if (!searchTerm.trim()) return sorted;
        return supplierFuse.search(searchTerm.trim()).map((result: any) => result.item);
    }, [searchTerm, suppliers, supplierFuse]);
    
    const allSupplierNames = useMemo(() => suppliers.map(s => s.name.trim().toLowerCase()), [suppliers]);
    
    const closeContextMenu = useCallback(() => {
        setContextMenu({ visible: false, x: 0, y: 0, supplierId: null });
        setDeleteConfirmationVisible(false);
    }, []);

    useEffect(() => {
        if (!contextMenu.visible) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeContextMenu();
            }
        };

        window.addEventListener('click', closeContextMenu);
        window.addEventListener('keydown', handleKeyDown);
        
        return () => {
            window.removeEventListener('click', closeContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [contextMenu.visible, closeContextMenu]);

    const handleSave = useCallback((supplierData: Omit<Supplier, 'id'> & { id?: string | null }) => {
        const finalData = {
            name: supplierData.name,
            address: supplierData.address,
            contactPerson: supplierData.contactPerson,
            phone: supplierData.phone,
        };

        if (supplierData.id) { // Editing
            updateSupplier({ ...finalData, id: supplierData.id });
            addNotification("Supplier updated!", "success");
        } else { // Adding
            addSupplier(finalData);
            addNotification("Supplier added!", "success");
        }
        setIsModalOpen(false);
        closeContextMenu();
    }, [addSupplier, updateSupplier, addNotification, closeContextMenu]);
    
    const handleDelete = useCallback((supplierId: string | null) => {
        if (!supplierId) return;
        const supplier = suppliers.find(s => s.id === supplierId);
        if (supplier) {
            deleteSupplier(supplier.id);
            addNotification(`"${supplier.name}" was deleted.`, 'info');
        }
        closeContextMenu();
    }, [suppliers, deleteSupplier, addNotification, closeContextMenu]);

    const handleEdit = useCallback((supplier: Supplier | null) => {
        if (!supplier) return;
        setEditingSupplier(supplier);
        setIsModalOpen(true);
        closeContextMenu();
    }, [closeContextMenu]);
    
    const handleOpenAddModal = useCallback(() => {
        setEditingSupplier(null);
        setIsModalOpen(true);
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent, supplierId: string) => {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, supplierId });
    }, []);
    
    const contextSupplier = useMemo(() => suppliers.find(s => s.id === contextMenu.supplierId), [contextMenu.supplierId, suppliers]);

    return (
        <div className="h-full flex flex-col p-4 md:p-6 animate-fade-in space-y-6">
            <header className="page-header flex-shrink-0 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Manage Suppliers</h1>
                  <p className="text-slate-400 mt-1">Add, edit, or start a purchase from a vendor.</p>
                </div>
                
                <div className="flex w-full md:w-auto gap-4 flex-col md:flex-row md:items-stretch">
                    <SearchInput
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onClear={() => setSearchTerm('')}
                        placeholder="Search Suppliers..."
                        className="w-full md:w-auto"
                        style={{'--width-of-input': '300px'} as React.CSSProperties}
                    />
                     <Button onClick={() => setIsStockModalOpen(true)} variant="secondary" icon="inventory_2">
                        View Stock
                    </Button>
                    <Button onClick={handleOpenAddModal} variant="primary" icon="add" className="w-full md:w-auto">
                        New Supplier
                    </Button>
                </div>
            </header>
            
            <main className="flex-grow overflow-hidden flex flex-col">
                <div className="store-list-container flex-grow overflow-y-auto custom-scrollbar">
                    {filteredSuppliers.length > 0 ? (
                        <ul className="store-list">
                            {filteredSuppliers.map(supplier => (
                                <SupplierListItem
                                    key={supplier.id}
                                    supplier={supplier}
                                    onStartPurchase={startPurchaseForSupplier}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onContextMenu={handleContextMenu}
                                />
                            ))}
                        </ul>
                    ) : (
                         <div className="flex items-center justify-center h-full text-center text-slate-400 p-8">
                            <div>
                                <Icon name="inventory" className="text-5xl mb-4" />
                                <h3 className="text-xl font-semibold text-slate-300">No Suppliers Found</h3>
                                <p>{searchTerm ? `Your search for "${searchTerm}" didn't match any suppliers.` : 'Click "New Supplier" to add a vendor.'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSupplier ? "Edit Supplier" : "Add New Supplier"}>
                <SupplierForm
                    initialData={editingSupplier || {}}
                    onSave={handleSave}
                    onCancel={() => setIsModalOpen(false)}
                    existingNames={editingSupplier ? allSupplierNames.filter(name => name !== editingSupplier.name.trim().toLowerCase()) : allSupplierNames}
                    submitButtonText={editingSupplier ? "Save Changes" : "Add Supplier"}
                />
            </Modal>
            
            <StockLevelsModal isOpen={isStockModalOpen} onClose={() => setIsStockModalOpen(false)} />

            {/* Context Menu */}
            {contextMenu.visible && (
                 <div
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    className="fixed bg-slate-800/70 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-2xl p-1.5 z-50 w-56 animate-modal-content text-sm"
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <ul className="space-y-1">
                        <li onClick={() => handleEdit(contextSupplier || null)} className="flex items-center gap-3 px-3 py-1.5 text-slate-200 hover:bg-violet-600 hover:text-white rounded-md cursor-pointer transition-colors">
                            <Icon name="edit" className="w-4 text-center" />
                            <span>Edit Supplier...</span>
                        </li>
                         <li onClick={() => viewPurchaseHistoryForSupplier(contextMenu.supplierId!)} className="flex items-center gap-3 px-3 py-1.5 text-slate-200 hover:bg-violet-600 hover:text-white rounded-md cursor-pointer transition-colors">
                            <Icon name="history" className="w-4 text-center" />
                            <span>View History</span>
                        </li>
                        {isDeleteConfirmationVisible ? (
                            <li onClick={() => handleDelete(contextMenu.supplierId)} className="flex items-center gap-3 px-3 py-1.5 text-white bg-red-600 hover:bg-red-500 rounded-md cursor-pointer transition-colors">
                                <Icon name="warning" className="w-4 text-center" />
                                <span>Confirm Delete?</span>
                            </li>
                        ) : (
                            <li onClick={() => setDeleteConfirmationVisible(true)} className="flex items-center gap-3 px-3 py-1.5 text-red-400 hover:bg-red-500 hover:text-white rounded-md cursor-pointer transition-colors">
                                <Icon name="delete" className="w-4 text-center" />
                                <span>Delete Supplier</span>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}