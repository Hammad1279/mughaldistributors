import React, { useMemo, useState } from 'react';
import { useAppContext } from '../App';
import { FinalizedBill } from '../types';
import { Card, Button, Icon, SearchInput } from './ui';
import { BillTemplate } from './BillTemplate';

declare var Fuse: any;

export default function YourBills() {
    const { 
        finalizedBills, deleteFinalizedBill, addNotification, 
        setCart, setCurrentBillingStoreID, setEditingBillNo, setActiveView,
        billFilterStoreID, clearBillFilter, medicalStores, billLayoutSettings
    } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    const activeFilterStore = useMemo(() => {
        return medicalStores.find(s => s.id === billFilterStoreID);
    }, [billFilterStoreID, medicalStores]);

    const filteredBills = useMemo(() => {
        const preFiltered = billFilterStoreID 
            ? finalizedBills.filter(b => b.storeId === billFilterStoreID) 
            : finalizedBills;
            
        const sorted = [...preFiltered].sort((a, b) => b.billNo - a.billNo);

        if (!searchTerm.trim()) return sorted;
        
        const fuse = new Fuse(sorted, { keys: ['storeName', 'billNo'], threshold: 0.3, ignoreLocation: true });
        return fuse.search(searchTerm.trim().replace('#', '')).map((result: any) => result.item);
    }, [searchTerm, finalizedBills, billFilterStoreID]);

    const handleDownload = (bill: FinalizedBill) => {
        const billHTML = BillTemplate(bill, billLayoutSettings);
        const newWindow = window.open('', '_blank');
        if (newWindow) {
            newWindow.document.write(billHTML);
            newWindow.document.close();
            addNotification(`Preview for Bill #${bill.billNo} opened. You can print or save from there.`, 'info');
        } else {
            addNotification('Could not open preview. Please check your pop-up blocker.', 'warning');
        }
    };

    const handleEdit = (bill: FinalizedBill) => {
        setCart(bill.items);
        setCurrentBillingStoreID(bill.storeId);
        setEditingBillNo(bill.billNo);
        setActiveView('create-bill');
        addNotification(`Now editing Bill #${bill.billNo}.`, 'info');
    };

    const handleConfirmDelete = (billNo: number) => {
        deleteFinalizedBill(billNo);
        setConfirmDeleteId(null);
    };

    return (
        <div className="p-4 md:p-6 animate-fade-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">Your Bills Archive</h1>
                    <p className="text-slate-400 mt-1">Search and manage past invoices.</p>
                </div>
                <SearchInput
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClear={() => setSearchTerm('')}
                    placeholder="Search by store or bill #"
                    className="w-full md:w-auto"
                    style={{'--width-of-input': '300px'} as React.CSSProperties}
                />
            </header>

            {activeFilterStore && (
                <div className="bg-slate-800 p-3 rounded-lg mb-6 flex justify-between items-center border border-slate-700 animate-fade-in">
                    <p className="font-semibold text-slate-300">
                        Showing bills for: <span className="text-violet-400">{activeFilterStore.name}</span>
                    </p>
                    <Button onClick={clearBillFilter} variant="secondary" className="!px-3 !py-1 !text-xs" icon="close">
                        Clear Filter
                    </Button>
                </div>
            )}
            
            <div className="space-y-6">
                {filteredBills.length > 0 ? (
                    filteredBills.map(bill => (
                        <Card key={bill.billNo} className="p-5" onMouseLeave={() => setConfirmDeleteId(null)}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                                <div>
                                    <h2 className="text-lg font-bold text-violet-300">Bill #{bill.billNo}</h2>
                                    <p className="text-sm font-medium text-slate-300">{bill.storeName}</p>
                                    <p className="text-xs text-slate-500">{bill.storeAddress}</p>
                                </div>
                                <p className="text-sm text-slate-400 mt-2 sm:mt-0">{new Date(bill.date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-t border-slate-700 pt-3 mt-3 gap-4">
                                <p className="text-xl font-bold text-slate-100">Total: Rs {bill.grandTotal.toFixed(2)}</p>
                                <div className="flex space-x-2">
                                    <Button onClick={() => handleDownload(bill)} variant="success" className="px-3 py-1.5 text-xs" icon="download">Download</Button>
                                    <Button onClick={() => handleEdit(bill)} variant="warning" className="px-3 py-1.5 text-xs" icon="edit">Edit</Button>
                                    {confirmDeleteId === bill.billNo ? (
                                        <Button
                                            onClick={() => handleConfirmDelete(bill.billNo)}
                                            variant="danger"
                                            className="px-3 py-1.5 text-xs"
                                            icon="warning"
                                            autoFocus
                                        >
                                            Confirm
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => setConfirmDeleteId(bill.billNo)}
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
                                <Icon name="search_off" className="text-4xl mb-3"/>
                                <h3 className="text-xl font-semibold text-slate-300">No Bills Found</h3>
                                <p>Your search for "{searchTerm}" didn't return any results.</p>
                            </>
                        ) : (
                             <>
                                <Icon name="payments" className="text-4xl mb-3" />
                                <h3 className="text-xl font-semibold text-slate-300">No Bills Finalized</h3>
                                <p>{activeFilterStore ? `No bills found for ${activeFilterStore.name}.` : "No bills have been finalized yet."}</p>
                            </>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
}