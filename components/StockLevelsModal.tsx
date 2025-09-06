

import React, { useMemo, useState } from 'react';
import { useAppContext } from '../App';
import { Modal, Icon, SearchInput } from './ui';

interface StockItem {
    id: string;
    name: string;
    stock: number;
}

export const StockLevelsModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { medicines, finalizedPurchases, finalizedBills } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');

    const stockData = useMemo((): StockItem[] => {
        const purchaseQuantities = new Map<string, number>();
        finalizedPurchases.forEach(p => {
            p.items.forEach(item => {
                const currentQty = purchaseQuantities.get(item.medicineId) || 0;
                purchaseQuantities.set(item.medicineId, currentQty + item.quantity);
            });
        });

        const salesQuantities = new Map<string, number>();
        finalizedBills.forEach(b => {
            b.items.forEach(item => {
                const currentQty = salesQuantities.get(item.id) || 0;
                // Stock is tracked in base units ('quantity'). 'piece' is a sub-unit for billing and not included in this simple stock calculation.
                salesQuantities.set(item.id, currentQty + item.quantity);
            });
        });

        return medicines
            .map(med => {
                const purchased = purchaseQuantities.get(med.id) || 0;
                const sold = salesQuantities.get(med.id) || 0;
                const stock = purchased - sold;
                return { id: med.id, name: med.name, stock };
            })
            .filter(item => item.stock > 0)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [medicines, finalizedPurchases, finalizedBills]);

    const filteredStockData = useMemo(() => {
        if (!searchTerm.trim()) return stockData;
        return stockData.filter(item => item.name.toLowerCase().includes(searchTerm.trim().toLowerCase()));
    }, [searchTerm, stockData]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Current Stock Levels">
            <div className="flex flex-col space-y-4" style={{ minHeight: '60vh', maxHeight: '70vh' }}>
                <SearchInput
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClear={() => setSearchTerm('')}
                    placeholder="Search by product name..."
                />
                <div className="flex-grow overflow-y-auto custom-scrollbar border border-slate-700 rounded-lg bg-slate-900/50">
                    {filteredStockData.length > 0 ? (
                        <table className="min-w-full text-sm text-left">
                            <thead className="sticky top-0 bg-slate-800/80 backdrop-blur-md z-10">
                                <tr>
                                    <th className="p-3 font-semibold text-slate-300 w-3/4">Product Name</th>
                                    <th className="p-3 font-semibold text-slate-300 w-1/4 text-center">Quantity in Stock</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {filteredStockData.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-700/30">
                                        <td className="p-3 font-medium text-slate-100">{item.name}</td>
                                        <td className="p-3 text-center font-bold text-emerald-400">{item.stock}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex items-center justify-center h-full text-center text-slate-500 p-8">
                            <div>
                                <Icon name="package_2" className="text-5xl mb-4" />
                                <h3 className="text-xl font-semibold text-slate-300">
                                    {stockData.length === 0 ? 'No Stock Available' : 'No Results Found'}
                                </h3>
                                <p>
                                    {stockData.length === 0 
                                        ? 'All items are currently out of stock.' 
                                        : `Your search for "${searchTerm}" didn't match any items.`}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};