

import React, { useState, useEffect, useRef } from 'react';
import { Medicine } from '../types';
import { Modal, Input, Button } from './ui';

export interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    medicine: Partial<Medicine> | null;
    title?: string;
    
    // The default action. Becomes secondary if onPrimaryAction is present.
    onSave: (med: Medicine) => void;
    saveButtonText?: string;

    // If provided, this becomes the main, primary button.
    onPrimaryAction?: (med: Medicine) => void;
    primaryActionButtonText?: string;

    editMode?: 'full' | 'sale_discount';
}

export const ProductModalInternal: React.FC<ProductModalProps> = ({ 
    isOpen, onClose, medicine, title, 
    onSave, saveButtonText, onPrimaryAction, primaryActionButtonText,
    editMode = 'full'
}) => {
    const [formData, setFormData] = useState<Partial<Medicine>>({});
    
    const nameInputRef = useRef<HTMLInputElement>(null);
    const priceInputRef = useRef<HTMLInputElement>(null);
    const purchaseDiscountInputRef = useRef<HTMLInputElement>(null);
    const saleDiscountInputRef = useRef<HTMLInputElement>(null);
    const batchInputRef = useRef<HTMLInputElement>(null);
    const primaryButtonRef = useRef<HTMLButtonElement>(null);
    const secondaryButtonRef = useRef<HTMLButtonElement>(null);

    const hasPrimaryAction = !!onPrimaryAction;

    useEffect(() => {
        if (isOpen) {
            const initialData = {
                name: '', company: '', price: null, 
                discount: 0, saleDiscount: 0, batchNo: '',
                ...medicine,
            };
            setFormData(initialData);
            if (editMode === 'sale_discount') {
                setTimeout(() => saleDiscountInputRef.current?.focus(), 100);
            } else {
                setTimeout(() => nameInputRef.current?.focus(), 100);
            }
        }
    }, [isOpen, medicine, editMode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numberFields: (keyof Medicine)[] = ['price', 'discount', 'saleDiscount'];
        if (numberFields.includes(name as keyof Medicine)) {
            setFormData(prev => ({ ...prev, [name]: value === '' ? null : parseFloat(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const buildMedicineObject = (): Medicine | null => {
        const trimmedName = formData.name?.trim();
        if (!trimmedName && editMode === 'full') {
            nameInputRef.current?.focus();
            return null;
        }

        const typeGuess = trimmedName?.toLowerCase().match(/(syp|tab|cap|inj|lotion|cream|oint|drops|sac|bar|solution)/);
        
        return {
            id: formData.id || crypto.randomUUID(),
            name: trimmedName || '',
            company: formData.company?.trim() || '',
            price: formData.price === undefined ? null : formData.price,
            discount: formData.discount === undefined ? null : formData.discount,
            saleDiscount: formData.saleDiscount === undefined ? null : formData.saleDiscount,
            batchNo: formData.batchNo || '',
            lastUpdated: new Date().toISOString(),
            tags: trimmedName?.toLowerCase().split(/\s+/).filter(Boolean) || [],
            type: typeGuess ? typeGuess[0].toUpperCase() : "OTHER",
        };
    }

    const handlePrimarySubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        const finalMed = buildMedicineObject();
        if (finalMed && onPrimaryAction) {
            onPrimaryAction(finalMed);
        }
    };
    
    const handleSecondarySubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        const finalMed = buildMedicineObject();
        if (finalMed) {
            onSave(finalMed);
        }
    };

    const handleFormSubmit = hasPrimaryAction ? handlePrimarySubmit : handleSecondarySubmit;
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (editMode === 'sale_discount') {
            if (e.key === 'Enter' && e.currentTarget.tagName !== 'BUTTON') {
                e.preventDefault();
                handleFormSubmit();
            }
            return;
        }

        const focusableElements = [
            nameInputRef.current, 
            priceInputRef.current, 
            purchaseDiscountInputRef.current,
            saleDiscountInputRef.current,
            batchInputRef.current, 
            primaryButtonRef.current
        ];
        if (hasPrimaryAction) {
            focusableElements.push(secondaryButtonRef.current);
        }

        const activeElements = focusableElements.filter(Boolean) as HTMLElement[];
        const currentIndex = activeElements.indexOf(e.target as HTMLElement);
        if (currentIndex === -1) return;

        if (e.key === 'Enter' && e.currentTarget.tagName !== 'BUTTON') {
            e.preventDefault();
            const nextElement = activeElements[currentIndex + 1];
            if (nextElement) {
                nextElement.focus();
            } else {
                handleFormSubmit(); // Submit if enter on last input
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeElements[(currentIndex + 1) % activeElements.length].focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeElements[(currentIndex - 1 + activeElements.length) % activeElements.length].focus();
        } else if (hasPrimaryAction && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
             if (e.target === primaryButtonRef.current) {
                e.preventDefault();
                secondaryButtonRef.current?.focus();
             } else if (e.target === secondaryButtonRef.current) {
                e.preventDefault();
                primaryButtonRef.current?.focus();
             }
        }
    };
    
    const finalTitle = title || (medicine?.id ? 'Edit Medicine' : 'Add New Medicine');
    const isFormValid = editMode === 'full' ? !!formData.name?.trim() : true;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={finalTitle}>
            <form onSubmit={handleFormSubmit} className="space-y-5">
                {editMode === 'full' ? (
                    <Input ref={nameInputRef} label="Medicine Name *" name="name" value={formData.name || ''} onChange={handleChange} required onKeyDown={handleKeyDown} />
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Medicine Name</label>
                        <p className="w-full p-3 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg truncate">{formData.name}</p>
                    </div>
                )}
                
                {editMode === 'full' && (
                    <>
                        <Input ref={priceInputRef} label="Price (MRP)" name="price" type="number" step="0.01" value={formData.price ?? ''} onChange={handleChange} placeholder="e.g. 150.00" onKeyDown={handleKeyDown} />
                        <Input ref={purchaseDiscountInputRef} label="Purchase Discount (%)" name="discount" type="number" step="1" value={formData.discount ?? ''} onChange={handleChange} placeholder="e.g. 10" onKeyDown={handleKeyDown} />
                    </>
                )}

                <Input ref={saleDiscountInputRef} label="Sale Discount (%)" name="saleDiscount" type="number" step="1" value={formData.saleDiscount ?? ''} onChange={handleChange} placeholder="e.g. 5" onKeyDown={handleKeyDown} />
                
                {editMode === 'full' && (
                    <Input ref={batchInputRef} label="Batch Number" name="batchNo" value={formData.batchNo || ''} onChange={handleChange} onKeyDown={handleKeyDown} />
                )}
                
                <div className="flex w-full pt-4 justify-end">
                    {hasPrimaryAction ? (
                        <div className="flex items-center gap-3">
                             <Button ref={primaryButtonRef} type="button" onClick={handlePrimarySubmit} variant="primary" icon="fa-file-lines" onKeyDown={handleKeyDown} disabled={!isFormValid}>
                                {primaryActionButtonText || 'Primary Action'}
                            </Button>
                            <Button ref={secondaryButtonRef} type="button" onClick={handleSecondarySubmit} variant="secondary" icon="fa-floppy-disk" onKeyDown={handleKeyDown} disabled={!isFormValid}>
                                {saveButtonText || 'Save'}
                            </Button>
                        </div>
                    ) : (
                        <Button ref={primaryButtonRef} type="submit" variant="primary" icon="fa-floppy-disk" onKeyDown={handleKeyDown} disabled={!isFormValid}>
                            {saveButtonText || (medicine?.id ? 'Save Changes' : 'Add to Inventory')}
                        </Button>
                    )}
                </div>
            </form>
        </Modal>
    );
};

export const ProductModal = React.memo(ProductModalInternal);