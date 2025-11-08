
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../App';
import { Medicine, FinalizedPurchase, PurchaseItem as FinalizedPurchaseItem, PurchaseRowData } from '../types';
import { Card, Button, Icon } from './ui';
import PurchaseRow from './PurchaseRow';
import { ProductModal } from './ProductModal';

declare var Fuse: any;

interface ActiveSearch {
    rowId: string;
    term: string;
    results: (Medicine | { id: 'add_new'; name: string })[];
    top: number;
    left: number;
}

const PurchaseSearchDropdown: React.FC<{
    search: ActiveSearch;
    onSelect: (item: Medicine | { id: 'add_new'; name: string }, rowId: string) => void;
    activeIndex: number;
}> = ({ search, onSelect, activeIndex }) => {
    const activeItemRef = useRef<HTMLLIElement>(null);

    useEffect(() => {
        activeItemRef.current?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);
    
    return (
        <div 
            className="fixed z-20 bg-slate-700 border border-slate-600 rounded-lg shadow-2xl overflow-hidden animate-fade-in"
            style={{ top: search.top, left: search.left, width: '300px', maxHeight: '300px', overflowY: 'auto' }}
        >
            <ul className="p-1">
                {search.results.map((item, index) => (
                    <li
                        key={item.id}
                        ref={index === activeIndex ? activeItemRef : null}
                        onClick={() => onSelect(item, search.rowId)}
                        className={`px-3 py-1.5 rounded-md cursor-pointer text-sm font-medium transition-colors ${
                            index === activeIndex ? 'bg-violet-600 text-white' : 'text-slate-200 hover:bg-slate-600/50'
                        } ${item.id === 'add_new' ? 'border-t border-slate-600 mt-1 pt-2' : ''}`}
                    >
                        {item.id === 'add_new' ? (
                            <span className="flex items-center gap-2">
                                <Icon name="fa-circle-plus" />
                                <span>Add "<strong className="truncate">{item.name}</strong>"</span>
                            </span>
                        ) : (
                            item.name
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};


export default function Purchase() {
    const {
        medicines, addMedicine, updateMedicine, suppliers, currentPurchaseSupplierID, addNotification,
        resetPurchaseSession, setActiveView, finalizedPurchases, postPurchase, activeView,
        purchaseCart, setPurchaseCart, purchaseCartOrder, setPurchaseCartOrder,
        editingPurchaseId
    } = useAppContext();

    const [activeSearch, setActiveSearch] = useState<ActiveSearch | null>(null);
    const [activeSearchIndex, setActiveSearchIndex] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const isEditing = !!editingPurchaseId;
    
    // State for inline editing
    const [editingMedicineId, setEditingMedicineId] = useState<string | null>(null);
    const [editingMedicineName, setEditingMedicineName] = useState('');

    // State for drag and drop reordering
    const dragItem = useRef<string | null>(null);
    const [dragOverInfo, setDragOverInfo] = useState<{ id: string | null; position: 'top' | 'bottom' | null }>({ id: null, position: null });

    const [bulkQuantity, setBulkQuantity] = useState('');


    const gridContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [emptyRowCount, setEmptyRowCount] = useState(0);
    const medicineFuse = useRef(new Fuse(medicines, { keys: ['name', 'tags'], threshold: 0.3 }));

    useEffect(() => {
        medicineFuse.current.setCollection(medicines);
    }, [medicines]);

    // Sync ordered IDs with purchase data
    useEffect(() => {
        const currentIdsInOrder = new Set(purchaseCartOrder);
        const allIdsInData = new Set(Object.keys(purchaseCart));

        const newIds = Object.keys(purchaseCart).filter(id => !currentIdsInOrder.has(id));
        const filteredOrder = purchaseCartOrder.filter(id => allIdsInData.has(id));

        if (newIds.length > 0 || filteredOrder.length !== purchaseCartOrder.length) {
            setPurchaseCartOrder([...filteredOrder, ...newIds]);
        }
    }, [purchaseCart, purchaseCartOrder, setPurchaseCartOrder]);

    const activeSupplier = useMemo(() => suppliers.find(s => s.id === currentPurchaseSupplierID), [suppliers, currentPurchaseSupplierID]);
    
    const purchaseId = useMemo(() => {
        if (editingPurchaseId) return editingPurchaseId;
        const maxId = finalizedPurchases.reduce((max, p) => Math.max(max, p.purchaseId), 0);
        return maxId + 1;
    }, [finalizedPurchases, editingPurchaseId]);

    // --- Close dropdown on outside click/escape
    useEffect(() => {
        const close = () => setActiveSearch(null);
        if (activeSearch) {
            window.addEventListener('click', close);
            window.addEventListener('keydown', e => e.key === 'Escape' && close());
        }
        return () => {
            window.removeEventListener('click', close);
            window.removeEventListener('keydown', e => e.key === 'Escape' && close());
        }
    }, [activeSearch]);

    useEffect(() => {
        if (activeView !== 'purchase-entry') return;

        let ctrlPressedWithoutCombo = false;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Control' && !e.repeat) {
                ctrlPressedWithoutCombo = true;
            } else if (e.key !== 'Control') {
                ctrlPressedWithoutCombo = false;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Control') {
                if (ctrlPressedWithoutCombo) {
                    e.preventDefault();
                    if (!activeSearch && searchInputRef.current) {
                        searchInputRef.current.focus();
                        searchInputRef.current.select();
                    }
                }
                ctrlPressedWithoutCombo = false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [activeView, activeSearch]);


     useEffect(() => {
        const container = gridContainerRef.current;
        if (!container) return;
        const calculateEmptyRows = () => {
            if (!gridContainerRef.current) return;
            const containerHeight = gridContainerRef.current.clientHeight;
            const rowHeight = 36;
            const totalPossibleRows = Math.floor(containerHeight / rowHeight);
            const dataRowsCount = purchaseCartOrder.length + 1; // +1 for the search row
            setEmptyRowCount(Math.max(0, totalPossibleRows - dataRowsCount));
        };
        const resizeObserver = new ResizeObserver(calculateEmptyRows);
        resizeObserver.observe(container);
        calculateEmptyRows();
        return () => resizeObserver.disconnect();
    }, [purchaseCartOrder.length]);

    const calculateNetAmount = useCallback((data: PurchaseRowData): number => {
        const baseAmount = (data.quantity || 0) * (data.rate || 0);
        const discountAmount = baseAmount * ((data.discount || 0) / 100);
        return baseAmount - discountAmount;
    }, []);

    const handleDataChange = useCallback((medId: string, field: keyof PurchaseRowData, value: string | number, targetElement?: HTMLElement) => {
        setPurchaseCart(prev => {
            const currentData = prev[medId] || { srch: '', quantity: 0, rate: 0, discount: 0, batchNo: '' };
            const newData = { ...currentData, [field]: value };
            
            const isEffectivelyEmpty = !newData.quantity && !newData.rate && !newData.batchNo && !newData.srch && !newData.discount;
            if (isEffectivelyEmpty) {
                const { [medId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [medId]: newData };
        });

        if (field === 'srch' && typeof value === 'string') {
            const newSearchTerm = value.trim();
            if (newSearchTerm && targetElement) {
                const results = medicineFuse.current.search(newSearchTerm).map((r: any) => r.item).slice(0, 5);
                const searchResults: (Medicine | { id: 'add_new', name: string })[] = [...results];
                if (!results.some(r => r.name.toLowerCase() === newSearchTerm.toLowerCase())) {
                    searchResults.push({ id: 'add_new', name: newSearchTerm });
                }
                
                const inputRect = targetElement.getBoundingClientRect();
                const mainContent = targetElement.closest('.animate-main-in');
                const mainRect = mainContent ? mainContent.getBoundingClientRect() : { top: 0, left: 0 };
                
                setActiveSearch({
                    rowId: medId,
                    term: newSearchTerm,
                    results: searchResults,
                    top: inputRect.bottom + 4 - mainRect.top,
                    left: inputRect.left - mainRect.left,
                });
                setActiveSearchIndex(0);
            } else {
                setActiveSearch(null);
            }
        }
    }, [setPurchaseCart]);
    
    const handleSelectSearchResult = useCallback(async (item: Medicine | { id: 'add_new'; name: string }, rowId: string) => {
        setActiveSearch(null);
        setSearchTerm(''); 

        if ('price' in item) {
            setPurchaseCart(prev => ({...prev, [item.id]: {quantity: 1, rate: item.price || 0, discount: 0, batchNo: '', srch: ''}}));
            setTimeout(() => document.getElementById(`input-${item.id}-quantity`)?.focus(), 50);
        }
        else {
            const newName = item.name.trim();
            if(!newName) return; 
            const existingMed = medicines.find(m => m.name.trim().toLowerCase() === newName.toLowerCase());

            if (existingMed) {
                addNotification(`"${newName}" already exists. Using existing item.`, 'info');
                setPurchaseCart(prev => ({...prev, [existingMed.id]: {quantity: 1, rate: existingMed.price || 0, discount: 0, batchNo: '', srch: ''}}));
                setTimeout(() => document.getElementById(`input-${existingMed.id}-quantity`)?.focus(), 50);
            } else {
                const typeGuess = newName.toLowerCase().match(/(syp|tab|cap|inj|lotion|cream|oint|drops|sac|bar|solution)/);
                const newMedData = {
                    name: newName,
                    company: '',
                    price: null,
                    discount: null,
                    saleDiscount: null,
                    batchNo: '',
                    tags: newName.toLowerCase().split(/\s+/).filter(Boolean),
                    type: typeGuess ? typeGuess[0].toUpperCase() : "OTHER",
                };
                const newId = await addMedicine(newMedData);
                if(newId) {
                  addNotification(`Added "${newName}" to inventory.`, 'success');
                  setPurchaseCart(prev => ({...prev, [newId]: {quantity: 1, rate: 0, discount: 0, batchNo: '', srch: ''}}));
                  setTimeout(() => document.getElementById(`input-${newId}-quantity`)?.focus(), 50);
                }
            }
        }
    }, [medicines, addNotification, addMedicine, setPurchaseCart]);

    const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
    }, []);
    
    type FocusableField = 'srch' | 'quantity' | 'rate' | 'discount' | 'batchNo';

    const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, medId: string, field: FocusableField) => {
        if (activeSearch) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSearchIndex(prev => (prev + 1) % activeSearch.results.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSearchIndex(prev => (prev - 1 + activeSearch.results.length) % activeSearch.results.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selectedItem = activeSearch.results[activeSearchIndex];
                if (selectedItem) {
                    handleSelectSearchResult(selectedItem, 'search-row');
                }
            }
            return;
        }
        
        const isSearchRow = medId === 'search-row';

        if (isSearchRow) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const term = (e.target as HTMLInputElement).value.trim();
                if (term) {
                    handleSelectSearchResult({ id: 'add_new', name: term }, 'search-row');
                }
            } else if (e.key === 'ArrowDown' && purchaseCartOrder.length > 0) {
                e.preventDefault();
                document.getElementById(`input-${purchaseCartOrder[0]}-quantity`)?.focus();
            }
            return;
        }
    
        const currentMedIndex = purchaseCartOrder.indexOf(medId);
        if (currentMedIndex === -1) return;
    
        const focusCell = (medIndex: number, fieldNameToFocus: FocusableField) => {
            const focusMedId = purchaseCartOrder[medIndex];
            if (focusMedId) {
                const elementId = `input-${focusMedId}-${fieldNameToFocus}`;
                document.getElementById(elementId)?.focus();
            }
        };
    
        const fieldsOrder: FocusableField[] = ['quantity', 'rate', 'discount', 'batchNo'];
        const currentFieldIndex = fieldsOrder.indexOf(field);
    
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentMedIndex > 0) {
                focusCell(currentMedIndex - 1, field);
            } else {
                searchInputRef.current?.focus();
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentMedIndex < purchaseCartOrder.length - 1) {
                focusCell(currentMedIndex + 1, field);
            }
        } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
             e.preventDefault();
             if (currentFieldIndex < fieldsOrder.length - 1) {
                focusCell(currentMedIndex, fieldsOrder[currentFieldIndex + 1]);
            } else {
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (currentFieldIndex > 0) {
                focusCell(currentMedIndex, fieldsOrder[currentFieldIndex - 1]);
            }
        }
    }, [activeSearch, purchaseCartOrder, activeSearchIndex, handleSelectSearchResult]);

    const { grandTotal, itemCount } = useMemo(() => {
        let total = 0;
        let count = 0;
        for (const medId in purchaseCart) {
            const data = purchaseCart[medId];
            if (data && data.quantity > 0) {
                total += calculateNetAmount(data);
                count++;
            }
        }
        return { grandTotal: total, itemCount: count };
    }, [purchaseCart, calculateNetAmount]);

    const handlePostPurchase = useCallback(async () => {
        if (!activeSupplier) { addNotification("No supplier selected.", "error"); return; }

        const itemsForPurchase: FinalizedPurchaseItem[] = Object.entries(purchaseCart)
            .map(([medId, data]) => ({ medId, data }))
            .filter(({ data }) => data.quantity > 0 && data.rate > 0)
            .map(({medId, data}) => {
                const med = medicines.find(m => m.id === medId)!;
                return {
                    medicineId: med.id,
                    medicineName: med.name,
                    quantity: data.quantity,
                    rate: data.rate,
                    discount: data.discount || 0,
                    batchNo: data.batchNo,
                    netAmount: calculateNetAmount(data),
                };
            });
        
        if (itemsForPurchase.length === 0) { addNotification("Purchase is empty.", "error"); return; }
        
        const newPurchaseData = {
            supplierId: activeSupplier.id,
            supplierName: activeSupplier.name,
            items: itemsForPurchase,
            grandTotal,
        };
        
        await postPurchase(newPurchaseData, editingPurchaseId);
        
        resetPurchaseSession();
        setActiveView('manage-suppliers');

    }, [activeSupplier, purchaseCart, medicines, grandTotal, addNotification, resetPurchaseSession, setActiveView, calculateNetAmount, postPurchase, editingPurchaseId]);

    const handleConfirmCancel = useCallback(() => {
        resetPurchaseSession();
        setActiveView('manage-suppliers');
    }, [resetPurchaseSession, setActiveView]);

    const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, id: string) => {
        dragItem.current = id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        setTimeout(() => {
            (e.target as HTMLElement).classList.add('dragging');
        }, 0);
    };
    
    const handleTableDragOver = (e: React.DragEvent<HTMLTableSectionElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    
        const targetRow = (e.target as HTMLElement).closest('tr.purchase-table-row');
        if (!targetRow || !dragItem.current) {
             if (dragOverInfo.id) setDragOverInfo({ id: null, position: null });
             return;
        }
    
        const targetId = (targetRow as HTMLElement).dataset.id;
        if (!targetId || targetId === dragItem.current) {
            if (dragOverInfo.id) setDragOverInfo({ id: null, position: null });
            return;
        }
    
        const rect = targetRow.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const newPosition = e.clientY < midpoint ? 'top' : 'bottom';
    
        if (dragOverInfo.id !== targetId || dragOverInfo.position !== newPosition) {
            setDragOverInfo({ id: targetId, position: newPosition });
        }
    };
    
    const handleTableDragLeave = (e: React.DragEvent<HTMLTableSectionElement>) => {
        const toElement = e.relatedTarget as Element;
        if (!e.currentTarget.contains(toElement)) {
            setDragOverInfo({ id: null, position: null });
        }
    };

    const handleTableDrop = (e: React.DragEvent<HTMLTableSectionElement>) => {
        e.preventDefault();
        const sourceId = dragItem.current;
        const targetId = dragOverInfo.id;

        setDragOverInfo({ id: null, position: null });
        
        if (!sourceId || !targetId || sourceId === targetId) {
            return;
        }

        let currentOrderedIds = [...purchaseCartOrder];
        const sourceIndex = currentOrderedIds.indexOf(sourceId);
        if (sourceIndex === -1) return;

        const [removedItem] = currentOrderedIds.splice(sourceIndex, 1);
        const newTargetIndex = currentOrderedIds.indexOf(targetId);

        if (newTargetIndex === -1) {
            currentOrderedIds.splice(sourceIndex, 0, removedItem);
            setPurchaseCartOrder(currentOrderedIds);
            return;
        }

        if (dragOverInfo.position === 'bottom') {
            currentOrderedIds.splice(newTargetIndex + 1, 0, removedItem);
        } else {
            currentOrderedIds.splice(newTargetIndex, 0, removedItem);
        }

        setPurchaseCartOrder(currentOrderedIds);
    };

    const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
        (e.target as HTMLElement).classList.remove('dragging');
        dragItem.current = null;
        setDragOverInfo({ id: null, position: null });
    };

    // --- Inline Editing Handlers ---
    const handleStartEditName = useCallback((med: Medicine) => {
        if (editingMedicineId && editingMedicineId !== med.id) {
            setEditingMedicineId(null);
        }
        setEditingMedicineId(med.id);
        setEditingMedicineName(med.name);
    }, [editingMedicineId]);

    const handleSaveName = useCallback(async () => {
        if (!editingMedicineId) return;
        
        const medToUpdate = medicines.find(m => m.id === editingMedicineId);
        const newName = editingMedicineName.trim();

        if (medToUpdate && newName && medToUpdate.name !== newName) {
            const isDuplicate = medicines.some(m => m.id !== editingMedicineId && m.name.toLowerCase() === newName.toLowerCase());
            if (isDuplicate) {
                addNotification(`Medicine name "${newName}" already exists.`, 'warning');
                return;
            }
            await updateMedicine({ ...medToUpdate, name: newName });
            addNotification(`Renamed to "${newName}".`, 'success');
        }

        setEditingMedicineId(null);
        setEditingMedicineName('');
    }, [editingMedicineId, editingMedicineName, medicines, updateMedicine, addNotification]);

    const handleCancelEditName = useCallback(() => {
        setEditingMedicineId(null);
        setEditingMedicineName('');
    }, []);

    const handleSetBulkQuantity = useCallback(() => {
        const qty = parseInt(bulkQuantity, 10);
        if (isNaN(qty) || qty < 0) {
            addNotification('Please enter a valid quantity.', 'warning');
            return;
        }

        setPurchaseCart(prevCart => {
            const newCart = { ...prevCart };
            purchaseCartOrder.forEach(medId => {
                if (newCart[medId]) {
                    newCart[medId] = { ...newCart[medId], quantity: qty };
                }
            });
            return newCart;
        });

        addNotification(`Quantity set to ${qty} for all ${purchaseCartOrder.length} items.`, 'info');
        setBulkQuantity('');
    }, [bulkQuantity, purchaseCartOrder, setPurchaseCart, addNotification]);

    if (!currentPurchaseSupplierID || !activeSupplier) {
        return (
            <div className="text-center animate-fade-in flex flex-col items-center justify-center h-full p-4">
                <Card className="p-8 max-w-lg">
                    <Icon name="fa-circle-info" className="text-5xl text-violet-400 mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">No Supplier Selected</h2>
                    <p className="text-slate-400 mb-6">Please select a supplier from 'Manage Suppliers' to begin a purchase entry.</p>
                    <Button onClick={() => setActiveView('manage-suppliers')} variant="primary" icon="fa-arrow-left">
                        Go to Suppliers
                    </Button>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="h-full">
            <div 
                className="classic-billing-interface fade-in-content" 
                onClick={(e) => { e.stopPropagation() }}
            >
                <header className="classic-toolbar">
                    <input type="text" className="classic-toolbar-input" style={{ width: '80px', textAlign:'center' }} readOnly value={`#${purchaseId}`} title="Purchase ID"/>
                    <div className="font-semibold text-lg text-slate-300 ml-4">
                        {isEditing ? (
                            <>Editing Purchase: <span className="text-amber-400">#{editingPurchaseId}</span></>
                        ) : (
                            <>Purchasing from: <span className="text-emerald-400">{activeSupplier.name}</span></>
                        )}
                    </div>

                    {purchaseCartOrder.length > 0 && (
                        <div className="flex items-center gap-2 ml-4">
                            <label htmlFor="bulk-qty" className="text-sm font-medium text-slate-400">Bulk Qty:</label>
                            <input
                                id="bulk-qty"
                                type="number"
                                className="classic-toolbar-input"
                                style={{ width: '80px', textAlign: 'center' }}
                                value={bulkQuantity}
                                onChange={(e) => setBulkQuantity(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSetBulkQuantity();
                                    }
                                }}
                                placeholder="Qty"
                            />
                            <button
                                className="classic-toolbar-button"
                                onClick={handleSetBulkQuantity}
                                disabled={!bulkQuantity.trim()}
                            >
                                Set All
                            </button>
                        </div>
                    )}
                    
                    <div className="flex-grow"></div>
                    <button className="classic-toolbar-button" onClick={handlePostPurchase}>{isEditing ? 'Update Purchase' : 'Post Purchase'}</button>
                    {isCancelling ? (
                        <button
                            className="classic-toolbar-button !bg-red-600 hover:!bg-red-500 text-white"
                            onClick={handleConfirmCancel}
                            onMouseLeave={() => setIsCancelling(false)}
                            autoFocus
                        >
                            Confirm
                        </button>
                    ) : (
                        <button
                            className="classic-toolbar-button"
                            onClick={() => setIsCancelling(true)}
                        >
                            Cancel
                        </button>
                    )}
                </header>

                <div ref={gridContainerRef} className="classic-grid-container custom-scrollbar">
                    <table className="classic-grid">
                        <thead>
                            <tr>
                                <th style={{ width: '45%' }}>Product</th>
                                <th style={{ width: '10%' }}>Quantity</th>
                                <th style={{ width: '12%' }}>Rate</th>
                                <th style={{ width: '10%' }}>Discount %</th>
                                <th style={{ width: '13%' }}>Batch No.</th>
                                <th style={{ width: '10%' }}>Net Amount</th>
                            </tr>
                        </thead>
                        <tbody
                             onDragOver={handleTableDragOver}
                             onDrop={handleTableDrop}
                             onDragLeave={handleTableDragLeave}
                        >
                             <tr className='bg-slate-700/50'>
                                 <td colSpan={6} className='p-0'>
                                     <input 
                                         id='input-search-row-srch'
                                         ref={searchInputRef}
                                         type="text" 
                                         className="grid-input !text-left !font-semibold !pl-4 !text-base !text-violet-300 placeholder:!text-slate-400" 
                                         placeholder='Search or Add a new product... (Press Ctrl key to focus)'
                                         autoComplete="off"
                                         value={searchTerm}
                                         onChange={e => {
                                             setSearchTerm(e.target.value);
                                             handleDataChange('search-row', 'srch', e.target.value, e.target)
                                         }}
                                         onKeyDown={e => handleInputKeyDown(e, 'search-row', 'srch')}
                                     />
                                 </td>
                             </tr>

                            {purchaseCartOrder.map(medId => {
                                const med = medicines.find(m => m.id === medId);
                                if (!med) return null;

                                const data = purchaseCart[medId];
                                const netAmount = data ? calculateNetAmount(data) : 0;
                                
                                let rowClassName = '';
                                if (dragOverInfo.id === medId) {
                                    rowClassName = dragOverInfo.position === 'top' ? 'drag-over-top' : 'drag-over-bottom';
                                }

                                return (
                                    <PurchaseRow
                                        key={med.id}
                                        rowId={med.id}
                                        med={med}
                                        data={data}
                                        netAmount={netAmount}
                                        onDataChange={handleDataChange}
                                        onKeyDown={handleInputKeyDown}
                                        onFocus={handleFocus}
                                        onDragStart={(e) => handleDragStart(e, med.id)}
                                        onDragEnd={handleDragEnd}
                                        className={rowClassName}
                                        isEditingName={editingMedicineId === med.id}
                                        editingNameValue={editingMedicineName}
                                        onNameChange={setEditingMedicineName}
                                        onStartEditName={() => handleStartEditName(med)}
                                        onSaveName={handleSaveName}
                                        onCancelEditName={handleCancelEditName}
                                    />
                                );
                            })}
                            {Array.from({ length: emptyRowCount }).map((_, index) => (
                                <tr key={`empty-${index}`}><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <footer className="classic-footer">
                    <input type="text" className="classic-footer-input" style={{ width: 'auto', textAlign: 'left' }} readOnly value={`${itemCount} items`} title="Item Count"/>
                    <div className="flex-grow"></div>
                    <span className='text-slate-400 font-semibold mr-2'>GRAND TOTAL:</span>
                    <input type="text" className="classic-footer-input" style={{ width: '150px', fontWeight: 'bold' }} readOnly value={grandTotal.toFixed(2)} title="Grand Total" />
                </footer>
            </div>
            
            {activeSearch && (
                <PurchaseSearchDropdown 
                    search={activeSearch}
                    onSelect={handleSelectSearchResult}
                    activeIndex={activeSearchIndex}
                />
            )}
        </div>
    );
}
