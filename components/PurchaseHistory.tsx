

import React, { useMemo, useState, useCallback } from 'react';
import { useAppContext } from '../App';
import { FinalizedPurchase, PurchaseItem } from '../types';
import { Card, Button, Icon, Modal } from './ui';

const PurchaseDetailsModal: React.FC<{ purchase: FinalizedPurchase | null; onClose: () => void }> = ({ purchase, onClose }) => {
    if (!purchase) return null;

    return (
        <Modal isOpen={!!purchase} onClose={onClose} title={`Details for Purchase #${purchase.purchaseId}`}>
            <div className="flex flex-col space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <p><strong>Supplier:</strong> {purchase.supplierName}</p>
                    <p><strong>Date:</strong> {new Date(purchase.date).toLocaleDateString()}</p>
                    <p><strong>Total Amount:</strong> Rs {purchase.grandTotal.toFixed(2)}</p>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="sticky top-0 bg-slate-800">
                        <tr>
                            <th className="p-2">Product</th>
                            <th className="p-2 text-center">Qty</th>
                            <th className="p-2 text-center">Rate</th>
                            <th className="p-2 text-center">Disc %</th>
                            <th className="p-2 text-right">Net</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {purchase.items.map((item: PurchaseItem) => (
                            <tr key={item.medicineId}>
                                <td className="p-2 font-medium">{item.medicineName}</td>
                                <td className="p-2 text-center">{item.quantity}</td>
                                <td className="p-2 text-center">{item.rate.toFixed(2)}</td>
                                <td className="p-2 text-center">{item.discount}%</td>
                                <td className="p-2 text-right font-semibold">{item.netAmount.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Modal>
    );
};


export default function PurchaseHistory() {
    const {
        suppliers, finalizedPurchases, medicines,
        currentViewingSupplierId, setActiveView,
    } = useAppContext();

    const [selectedPurchase, setSelectedPurchase] = useState<FinalizedPurchase | null>(null);

    const supplier = useMemo(() => {
        return suppliers.find(s => s.id === currentViewingSupplierId);
    }, [currentViewingSupplierId, suppliers]);

    const purchaseHistory = useMemo(() => {
        if (!supplier) return [];
        return finalizedPurchases
            .filter(p => p.supplierId === supplier.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [supplier, finalizedPurchases]);
    
    const summaryStats = useMemo(() => {
        if (!supplier || purchaseHistory.length === 0) {
            return { totalSpent: 0, topProduct: 'N/A' };
        }
        
        const totalSpent = purchaseHistory.reduce((acc, p) => acc + p.grandTotal, 0);

        const productQuantities = new Map<string, number>();
        purchaseHistory.forEach(p => {
            p.items.forEach(item => {
                const currentQty = productQuantities.get(item.medicineId) || 0;
                productQuantities.set(item.medicineId, currentQty + item.quantity);
            });
        });

        let topProductId: string | null = null;
        let maxQuantity = 0;
        productQuantities.forEach((quantity, id) => {
            if (quantity > maxQuantity) {
                maxQuantity = quantity;
                topProductId = id;
            }
        });

        const topProductInfo = topProductId ? medicines.find(m => m.id === topProductId) : null;

        return {
            totalSpent,
            topProduct: topProductInfo ? topProductInfo.name : 'N/A',
        };
    }, [supplier, purchaseHistory, medicines]);

    const handleViewDetails = useCallback((purchase: FinalizedPurchase) => {
        setSelectedPurchase(purchase);
    }, []);

    if (!supplier) {
        return (
            <div className="text-center animate-fade-in flex flex-col items-center justify-center h-full p-4">
                <Card className="p-8 max-w-lg">
                    <Icon name="error" className="text-5xl text-red-400 mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Supplier Not Found</h2>
                    <p className="text-slate-400 mb-6">Could not load history. Please return to the suppliers list.</p>
                    <Button onClick={() => setActiveView('manage-suppliers')} variant="primary" icon="arrow_back">
                        Go to Suppliers
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 animate-fade-in space-y-8">
            <header className="page-header flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Button onClick={() => setActiveView('manage-suppliers')} variant="secondary" className="!px-3 !py-1.5 !text-sm !mb-3" icon="arrow_back">
                        Back to Suppliers
                    </Button>
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Purchase History</h1>
                    <p className="text-slate-400 mt-1">Showing all past purchases from <strong className="text-emerald-400">{supplier.name}</strong>.</p>
                </div>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-5"><p className="text-sm font-medium text-slate-400">Total Purchases</p><p className="text-3xl font-bold text-violet-400 mt-1">{purchaseHistory.length}</p></Card>
                <Card className="p-5"><p className="text-sm font-medium text-slate-400">Total Amount Spent</p><p className="text-3xl font-bold text-emerald-400 mt-1">Rs {summaryStats.totalSpent.toFixed(2)}</p></Card>
                <Card className="p-5"><p className="text-sm font-medium text-slate-400">Top Product</p><p className="text-xl md:text-2xl font-bold text-amber-400 mt-1 truncate" title={summaryStats.topProduct}>{summaryStats.topProduct}</p></Card>
            </div>

            <div className="space-y-6">
                {purchaseHistory.length > 0 ? (
                    purchaseHistory.map(purchase => (
                        <Card key={purchase.purchaseId} className="p-5">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                <div className="flex-1">
                                    <h2 className="text-lg font-bold text-violet-300">Purchase #{purchase.purchaseId}</h2>
                                    <p className="text-sm text-slate-400 mt-1">{new Date(purchase.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                                <div className="flex flex-col sm:items-end w-full sm:w-auto mt-4 sm:mt-0">
                                    <p className="text-xl font-bold text-slate-100 mb-2 sm:mb-0">Total: Rs {purchase.grandTotal.toFixed(2)}</p>
                                     <Button onClick={() => handleViewDetails(purchase)} variant="secondary" className="px-3 py-1.5 text-xs w-full sm:w-auto" icon="visibility">
                                        View Details
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card className="text-center p-12 text-slate-500 border-2 border-dashed border-slate-700">
                        <Icon name="unpublished" className="text-4xl mb-3" />
                        <h3 className="text-xl font-semibold text-slate-300">No Purchase History</h3>
                        <p>There are no recorded purchases from this supplier yet.</p>
                    </Card>
                )}
            </div>

            <PurchaseDetailsModal purchase={selectedPurchase} onClose={() => setSelectedPurchase(null)} />
        </div>
    );
}