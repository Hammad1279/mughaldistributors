import React, { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../App';
import { Medicine } from '../types';
import { SearchInput, Button, Icon } from './ui';
import { ProductModal } from './ProductModal';

export default function DiscountSheet() {
    const { medicines, updateMedicine, addNotification } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

    const sortedAndFilteredMedicines = useMemo(() => {
        const filtered = searchTerm.trim()
            ? medicines.filter(med => 
                med.name.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
                med.company.toLowerCase().includes(searchTerm.trim().toLowerCase())
              )
            : medicines;
        
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }, [medicines, searchTerm]);

    const handleOpenModal = useCallback((med: Medicine | null = null) => {
        setEditingMedicine(med);
        setIsModalOpen(true);
    }, []);

    const handleSaveMedicine = useCallback(async (med: Medicine) => {
        await updateMedicine(med);
        addNotification(`Updated sale discount for "${med.name}".`, 'success');
        setIsModalOpen(false);
    }, [updateMedicine, addNotification]);

    return (
        <div className="p-4 md:p-6 animate-fade-in flex flex-col h-[calc(100vh-4rem)]">
            <header className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Sale Discounts Sheet</h1>
                    <p className="text-slate-400 mt-1">A live view of the default sale discount for each product.</p>
                </div>
                <SearchInput
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClear={() => setSearchTerm('')}
                    placeholder="Search products..."
                    className="w-full md:w-auto"
                    style={{ '--width-of-input': '300px' } as React.CSSProperties}
                />
            </header>
            <main className="flex-grow bg-slate-800/50 p-2 rounded-lg border border-slate-700 overflow-y-auto custom-scrollbar">
                {sortedAndFilteredMedicines.length > 0 ? (
                     <ul className="bg-slate-900/50 rounded-md divide-y divide-slate-800">
                        {sortedAndFilteredMedicines.map(med => (
                            <li key={med.id} className="flex justify-between items-center px-4 py-2 hover:bg-slate-800 transition-colors">
                                <p className="font-medium text-slate-200">{med.name}</p>
                                <div className="flex items-center gap-4">
                                  <p className="text-sm font-bold text-emerald-400 w-20 text-right">
                                      {med.saleDiscount !== null ? `${med.saleDiscount}%` : 'N/A'}
                                  </p>
                                  <Button onClick={() => handleOpenModal(med)} variant="toolbar" className="!w-9 !h-9" title="Edit Entry"><Icon name="fa-pencil" /></Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex items-center justify-center h-full text-center text-slate-500 p-8">
                        <div>
                            <Icon name="fa-magnifying-glass-minus" className="text-5xl mb-4" />
                            <h3 className="text-xl font-semibold text-slate-300">No Products Found</h3>
                            <p>{searchTerm ? `Your search for "${searchTerm}" didn't return any results.` : 'Your inventory is empty.'}</p>
                        </div>
                    </div>
                )}
            </main>
            {isModalOpen && (
              <ProductModal
                  isOpen={isModalOpen}
                  onClose={() => setIsModalOpen(false)}
                  medicine={editingMedicine}
                  onSave={handleSaveMedicine}
                  title={`Edit Sale Discount`}
                  saveButtonText="Save Changes"
                  editMode="sale_discount"
              />
            )}
        </div>
    );
}