
import React, { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../App';
import { Medicine } from '../types';
import { Card, Button, Icon, SearchInput } from './ui';
import { ProductModal } from './ProductModal';
import InventoryRow from './InventoryRow';

declare var Fuse: any;

export default function Inventory() {
    const { medicines, addMedicine, updateMedicine, deleteMedicine, addNotification } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

    const medicineFuse = useMemo(() => new Fuse(medicines, {
        keys: ['name', 'tags', 'company'],
        threshold: 0.3,
    }), [medicines]);
    
    const filteredMedicines = useMemo(() => {
        const sorted = [...medicines].sort((a, b) => a.name.localeCompare(b.name));
        if (!searchTerm.trim()) return sorted;
        return medicineFuse.search(searchTerm.trim()).map((result: any) => result.item as Medicine);
    }, [searchTerm, medicines, medicineFuse]);

    const { total, priced, unpriced } = useMemo(() => {
        const total = medicines.length;
        const priced = medicines.filter(m => m.price != null && m.price > 0).length;
        return { total, priced, unpriced: total - priced };
    }, [medicines]);

    const handleOpenModal = useCallback((med: Medicine | null = null) => {
        setEditingMedicine(med);
        setModalOpen(true);
    }, []);

    const handleSaveMedicine = useCallback(async (med: Medicine) => {
        const exists = medicines.some(m => m.id !== med.id && m.name.trim().toLowerCase() === med.name.trim().toLowerCase());
        if (exists) {
            addNotification(`Medicine "${med.name}" already exists.`, 'warning');
            return;
        }

        if (editingMedicine) { // Editing
            await updateMedicine(med);
        } else { // Adding
            const { id, ...medData } = med;
            await addMedicine(medData);
        }

        addNotification(`Medicine "${med.name}" ${editingMedicine ? 'updated' : 'added'}.`, 'success');
        setModalOpen(false);
    }, [editingMedicine, addNotification, medicines, addMedicine, updateMedicine]);

    const handleDeleteMedicine = useCallback(async (medId: string) => {
        const med = medicines.find(m => m.id === medId);
        if (window.confirm(`Are you sure you want to delete ${med?.name}?`)) {
            await deleteMedicine(medId);
            addNotification(`Medicine deleted.`, 'info');
        }
    }, [medicines, addNotification, deleteMedicine]);

    return (
        <div className="p-4 md:p-6 animate-fade-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                 <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">Inventory</h1>
                    <p className="text-slate-400 mt-1">Manage your medicine stock</p>
                </div>
                <div className="flex items-center md:items-stretch gap-4 w-full md:w-auto">
                    <SearchInput
                        placeholder="Search inventory..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onClear={() => setSearchTerm('')}
                        className="flex-grow md:flex-grow-0"
                         style={{'--width-of-input': '300px'} as React.CSSProperties}
                    />
                    <Button onClick={() => handleOpenModal()} variant="primary" icon="add" className="flex-shrink-0">Add New</Button>
                </div>
            </header>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <Card className="p-5"><p className="text-sm font-medium text-slate-400">Total Medicines</p><p className="text-3xl font-bold text-violet-400 mt-1">{total}</p></Card>
                <Card className="p-5"><p className="text-sm font-medium text-slate-400">Priced Medicines</p><p className="text-3xl font-bold text-emerald-400 mt-1">{priced}</p></Card>
                <Card className="p-5"><p className="text-sm font-medium text-slate-400">Unpriced Medicines</p><p className="text-3xl font-bold text-red-400 mt-1">{unpriced}</p></Card>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-slate-900/50">
                            <tr>
                                <th className="p-4 font-semibold text-slate-300 w-2/5">Medicine Name</th>
                                <th className="p-4 font-semibold text-slate-300">Price (MRP)</th>
                                <th className="p-4 font-semibold text-slate-300">Purchase Disc. %</th>
                                <th className="p-4 font-semibold text-slate-300">Sale Disc. %</th>
                                <th className="p-4 font-semibold text-slate-300">Batch No.</th>
                                <th className="p-4 font-semibold text-slate-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredMedicines.length > 0 ? filteredMedicines.map(med => (
                                <InventoryRow 
                                    key={med.id}
                                    med={med}
                                    onEdit={handleOpenModal}
                                    onDelete={handleDeleteMedicine}
                                />
                            )) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-400">
                                        <Icon name="search_off" className="text-4xl mb-3"/>
                                        <h3 className="text-xl font-semibold text-slate-300">No Medicines Found</h3>
                                        <p>Your search for "{searchTerm}" didn't match any items.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <ProductModal 
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                medicine={editingMedicine}
                onSave={handleSaveMedicine}
                saveButtonText={editingMedicine ? 'Save Changes' : 'Add to Inventory'}
            />
        </div>
    );
}
