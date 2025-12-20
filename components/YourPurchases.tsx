
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../App';
import { FinalizedPurchase, PurchaseItem } from '../types';
import { Card, Button, Icon, Modal, SearchInput } from './ui';

declare var Fuse: any;

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
                        {purchase.items.map((item: PurchaseItem, index) => (
                            <tr key={`${item.medicineId}-${index}`}>
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

export default function YourPurchases() {
    const { 
        finalizedPurchases, deleteFinalizedPurchase, startEditingPurchase,
    } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPurchaseDetails, setSelectedPurchaseDetails] = useState<FinalizedPurchase | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    const filteredPurchases = useMemo(() => {
        const sorted = [...finalizedPurchases].sort((a, b) => b.purchaseId - a.purchaseId);
        if (!searchTerm.trim()) return sorted;
        
        const fuse = new Fuse(sorted, { keys: ['supplierName', 'purchaseId'], threshold: 0.3, ignoreLocation: true });
        return fuse.search(searchTerm.trim().replace('#', '')).map((result: any) => result.item as FinalizedPurchase);
    }, [searchTerm, finalizedPurchases]);

    const handleConfirmDelete = (purchaseId: number) => {
        deleteFinalizedPurchase(purchaseId);
        setConfirmDeleteId(null);
    };

    return (
        <div className="p-4 md:p-6 animate-fade-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">Your Purchases</h1>
                    <p className="text-slate-400 mt-1">Search and manage your purchase history.</p>
                </div>
                <SearchInput
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClear={() => setSearchTerm('')}
                    placeholder="Search by supplier or purchase #"
                    className="w-full md:w-auto"
                    style={{'--width-of-input': '300px'} as React.CSSProperties}
                />
            </header>

            <div className="space-y-6">
                {filteredPurchases.length > 0 ? (
                    filteredPurchases.map(purchase => (
                        <Card key={purchase.purchaseId} className="p-5" onMouseLeave={() => setConfirmDeleteId(null)}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                                <div>
                                    <h2 className="text-lg font-bold text-violet-300">Purchase #{purchase.purchaseId}</h2>
                                    <p className="text-sm font-medium text-slate-300">{purchase.supplierName}</p>
                                </div>
                                <p className="text-sm text-slate-400 mt-2 sm:mt-0">{new Date(purchase.date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-t border-slate-700 pt-3 mt-3 gap-4">
                                <p className="text-xl font-bold text-slate-100">Total: Rs {purchase.grandTotal.toFixed(2)}</p>
                                <div className="flex space-x-2">
                                    <Button onClick={() => setSelectedPurchaseDetails(purchase)} variant="secondary" className="px-3 py-1.5 text-xs" icon="visibility">View Details</Button>
                                    <Button onClick={() => startEditingPurchase(purchase)} variant="warning" className="px-3 py-1.5 text-xs" icon="edit">Edit</Button>
                                    {confirmDeleteId === purchase.purchaseId ? (
                                        <Button 
                                            onClick={() => handleConfirmDelete(purchase.purchaseId)}
                                            variant="danger" 
                                            className="px-3 py-1.5 text-xs" 
                                            icon="warning"
                                            autoFocus
                                        >
                                            Confirm
                                        </Button>
                                    ) : (
                                        <Button 
                                            onClick={() => setConfirmDeleteId(purchase.purchaseId)}
                                            variant="danger" 
                                            className="px-3 py-1.5 text-xs" 
                                            icon="delete"
                                        >
                                            Delete
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card className="text-center p-12 text-slate-400 border-2 border-dashed border-slate-700">
                        {searchTerm ? (
                            <>
                                <Icon name="search_off" className="text-4xl mb-3" />
                                <h3 className="text-xl font-semibold text-slate-300">No Purchases Found</h3>
                                <p>Your search for "{searchTerm}" didn't return any results.</p>
                            </>
                        ) : (
                             <>
                                <Icon name="receipt" className="text-4xl mb-3" />
                                <h3 className="text-xl font-semibold text-slate-300">No Purchases Recorded</h3>
                                <p>You haven't posted any purchases yet.</p>
                            </>
                        )}
                    </Card>
                )}
            </div>
            <PurchaseDetailsModal purchase={selectedPurchaseDetails} onClose={() => setSelectedPurchaseDetails(null)} />
        </div>
    );
}
