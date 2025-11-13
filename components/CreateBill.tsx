

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../App';
import { Medicine, CartItem, FinalizedBill } from '../types';
import { Card, Button, Icon } from './ui';
import { BillTemplate } from './BillTemplate';
import BillRow from './BillRow';

declare var html2pdf: any;
declare var Fuse: any;

export interface BillItemData {
    quantity: number;
    discountValue: number | null;
    rate: number;
    batchNo: string;
    salesTaxAmount: number | null;
}

export type FocusableField = 'quantity' | 'rate' | 'discountValue' | 'salesTaxAmount' | 'batchNo';

interface ActiveSearch {
    term: string;
    results: (Medicine | { id: 'add_new'; name: string })[];
    top: number;
    left: number;
}

const ProductSearchDropdown: React.FC<{
    search: ActiveSearch;
    onSelect: (item: Medicine | { id: 'add_new'; name: string }) => void;
    activeIndex: number;
}> = ({ search, onSelect, activeIndex }) => {
    const activeItemRef = useRef<HTMLLIElement>(null);

    useEffect(() => {
        activeItemRef.current?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    return (
        <div
            className="fixed z-20 bg-slate-700 border border-slate-600 rounded-lg shadow-2xl overflow-hidden animate-fade-in custom-scrollbar"
            style={{ top: search.top, left: search.left, width: '350px', maxHeight: '300px', overflowY: 'auto' }}
        >
            <ul className="p-1">
                {search.results.map((item, index) => (
                    <li
                        key={item.id}
                        ref={index === activeIndex ? activeItemRef : null}
                        onClick={() => onSelect(item)}
                        className={`px-3 py-1.5 rounded-md cursor-pointer text-sm font-medium transition-colors ${
                            index === activeIndex ? 'bg-violet-600 text-white' : 'text-slate-200 hover:bg-slate-600/50'
                        } ${item.id === 'add_new' ? 'border-t border-slate-600 mt-1 pt-2' : ''}`}
                    >
                        {item.id === 'add_new' ? (
                            <span className="flex items-center gap-2">
                                <Icon name="add_circle" />
                                <span>Add "<strong className="truncate">{item.name}</strong>"</span>
                            </span>
                        ) : (
                            <div className="flex justify-between items-center">
                                <span>{item.name}</span>
                                {'price' in item && item.price && <span className="text-xs text-slate-400">Rs {item.price}</span>}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default function CreateBill() {
    const {
        medicines, addMedicine, medicalStores, currentBillingStoreID,
        cart, setCart, resetBillingSession, finalizeBill, addNotification,
        finalizedBills, editingBillNo, setEditingBillNo, setActiveView, activeView,
        setFocusedMed, setHoveredMed, billLayoutSettings, salesSettings
    } = useAppContext();

    const [itemData, setItemData] = useState<Record<string, BillItemData>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSearch, setActiveSearch] = useState<ActiveSearch | null>(null);
    const [activeSearchIndex, setActiveSearchIndex] = useState(0);
    const [emptyRowCount, setEmptyRowCount] = useState(0);
    
    const searchInputRef = useRef<HTMLInputElement>(null);
    const gridContainerRef = useRef<HTMLDivElement>(null);

    const [isCancelling, setIsCancelling] = useState(false);
    
    // Drag and drop state
    const dragItem = useRef<string | null>(null);
    const [dragOverInfo, setDragOverInfo] = useState<{ id: string | null; position: 'top' | 'bottom' | null }>({ id: null, position: null });

    const medicineFuse = useMemo(() => new Fuse(medicines, { keys: ['name', 'tags'], threshold: 0.3 }), [medicines]);

    const activeStore = useMemo(() => medicalStores.find(s => s.id === currentBillingStoreID), [medicalStores, currentBillingStoreID]);
    const isBillingActive = useMemo(() => !!activeStore, [activeStore]);
    
    const isEditing = !!editingBillNo;

    const initialBillNo = useMemo(() => {
        if (isEditing) return editingBillNo;
        const maxBillNo = finalizedBills.reduce((max, bill) => Math.max(max, bill.billNo), 0);
        return maxBillNo + 1;
    }, [isEditing, editingBillNo, finalizedBills]);

    const [billNo, setBillNo] = useState(initialBillNo);

    useEffect(() => {
        setBillNo(initialBillNo);
    }, [initialBillNo]);

    const calculateItemTotals = useCallback((med: Medicine, data: BillItemData | undefined) => {
        if (!data || !data.quantity || !data.rate) {
            return { calculatedDiscountAmount: 0, netAmount: 0 };
        }
        const grossAmount = data.quantity * data.rate;
        const discountPercentage = data.discountValue ?? med.saleDiscount ?? 0;
        const calculatedDiscountAmount = grossAmount * (discountPercentage / 100);
        const taxAmount = data.salesTaxAmount || 0;
        const netAmount = grossAmount - calculatedDiscountAmount + taxAmount;
        return { calculatedDiscountAmount, netAmount };
    }, []);

    const cartWithCalculations = useMemo<CartItem[]>(() => {
        return cart.map(med => {
            const data = itemData[med.id];
            const { calculatedDiscountAmount, netAmount } = calculateItemTotals(med, data);
            return {
                ...med,
                quantity: data?.quantity || 0,
                discountValue: data?.discountValue ?? med.saleDiscount,
                purchaseDiscount: med.discount,
                mrp: data?.rate ?? med.price ?? 0,
                calculatedDiscountAmount,
                netAmount,
                salesTaxAmount: data?.salesTaxAmount ?? null,
                batchNo: data?.batchNo || med.batchNo,
            };
        });
    }, [cart, itemData, calculateItemTotals]);

    const grandTotal = useMemo(() => cartWithCalculations.reduce((acc, item) => acc + item.netAmount, 0), [cartWithCalculations]);


    // Clear focused/hovered item state on component unmount
    useEffect(() => {
        return () => {
            setFocusedMed(null);
            setHoveredMed(null);
        };
    }, [setFocusedMed, setHoveredMed]);

    // Initialize itemData when cart changes
    useEffect(() => {
        setItemData(currentData => {
            const newData: Record<string, BillItemData> = {};
            cart.forEach(med => {
                newData[med.id] = currentData[med.id] || {
                    quantity: (med as CartItem).quantity || 1,
                    rate: (med as CartItem).mrp || med.price || 0,
                    discountValue: (med as CartItem).discountValue ?? med.saleDiscount,
                    batchNo: med.batchNo,
                    salesTaxAmount: (med as CartItem).salesTaxAmount ?? null,
                };
            });
            return newData;
        });
    }, [cart]);
    
    // Close dropdown on outside click or Escape key
    useEffect(() => {
        const close = () => setActiveSearch(null);
        if (activeSearch) {
            window.addEventListener('click', close);
            const handleKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && close();
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                window.removeEventListener('click', close);
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [activeSearch]);

    // Focus search input on Ctrl key press
    useEffect(() => {
        if (activeView !== 'create-bill') return;
        let ctrlPressedWithoutCombo = false;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Control' && !e.repeat) ctrlPressedWithoutCombo = true;
            else if (e.key !== 'Control') ctrlPressedWithoutCombo = false;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Control') {
                if (ctrlPressedWithoutCombo && !activeSearch && searchInputRef.current) {
                    e.preventDefault();
                    searchInputRef.current.focus();
                    searchInputRef.current.select();
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

     // Calculate empty rows for the grid
    useEffect(() => {
        const container = gridContainerRef.current;
        if (!container) return;
        const calculateEmptyRows = () => {
            if (!gridContainerRef.current) return;
            const containerHeight = gridContainerRef.current.clientHeight;
            const rowHeight = 36; // This is the height from the CSS
            const totalPossibleRows = Math.floor(containerHeight / rowHeight);
            const dataRowsCount = cart.length + 1; // +1 for the search row
            setEmptyRowCount(Math.max(0, totalPossibleRows - dataRowsCount));
        };
        const resizeObserver = new ResizeObserver(calculateEmptyRows);
        resizeObserver.observe(container);
        calculateEmptyRows();
        return () => resizeObserver.disconnect();
    }, [cart.length]);


    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (term.trim()) {
            const results = medicineFuse.search(term.trim()).map(r => r.item).slice(0, 7);
            const searchResults: (Medicine | { id: 'add_new'; name: string })[] = [...results];
            if (!results.some(r => r.name.toLowerCase() === term.trim().toLowerCase())) {
                 searchResults.push({ id: 'add_new', name: term.trim() });
            }
           
            const inputRect = e.target.getBoundingClientRect();
            const mainContent = (e.target as HTMLElement).closest('.animate-main-in');
            const mainRect = mainContent ? mainContent.getBoundingClientRect() : { top: 0, left: 0 };
    
            setActiveSearch({
                term,
                results: searchResults,
                top: inputRect.bottom + 4 - mainRect.top,
                left: inputRect.left - mainRect.left
            });
            setActiveSearchIndex(0);
        } else {
            setActiveSearch(null);
        }
    };
    
    const handleSelectSearchResult = async (item: Medicine | { id: 'add_new'; name: string }) => {
        setActiveSearch(null);
        setSearchTerm('');

        const processItem = (med: Medicine) => {
            if (!cart.some(cartItem => cartItem.id === med.id)) {
                const newCartItem: CartItem = {
                    ...med,
                    quantity: 1,
                    discountValue: med.saleDiscount,
                    purchaseDiscount: med.discount,
                    mrp: med.price || 0,
                    calculatedDiscountAmount: 0,
                    netAmount: 0,
                    salesTaxAmount: null,
                };
                setCart(prevCart => [...prevCart, newCartItem]);
                setTimeout(() => document.getElementById(`input-${med.id}-quantity`)?.focus(), 50);
            } else {
                 addNotification(`"${med.name}" is already in the bill.`, 'info');
            }
        };

        if ('price' in item) { // Existing medicine
            processItem(item);
        } else { // This is the { id: 'add_new', name: string } case
            const newName = item.name.trim();
            if(!newName) return;

            const existingMed = medicines.find(m => m.name.trim().toLowerCase() === newName.toLowerCase());
            if (existingMed) {
                addNotification(`"${newName}" already exists. Using existing item.`, 'info');
                processItem(existingMed);
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
                if (newId) {
                    const newlyAddedMed: Medicine = {
                        ...newMedData,
                        id: newId,
                        lastUpdated: new Date().toISOString()
                    };
                    addNotification(`Added "${newlyAddedMed.name}" to inventory.`, 'success');
                    processItem(newlyAddedMed);
                }
            }
        }
    };

    const handleDataChange = (medId: string, field: keyof BillItemData, value: string | number) => {
        // If quantity is set to 0 or an empty string, remove the item from the bill
        if (field === 'quantity' && Number(value) <= 0) {
            const itemToRemove = cart.find(item => item.id === medId);
            setCart(prevCart => prevCart.filter(item => item.id !== medId));
            if (itemToRemove) {
                addNotification(`"${itemToRemove.name}" removed from bill.`, 'info');
            }
        } else {
            setItemData(prev => ({
                ...prev,
                [medId]: {
                    ...prev[medId],
                    [field]: value
                }
            }));
        }
    };

    const handleInputBlur = useCallback(() => {
        setTimeout(() => {
            if (gridContainerRef.current && !gridContainerRef.current.contains(document.activeElement)) {
                setFocusedMed(null);
            }
        }, 0);
    }, [setFocusedMed]);

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, medId: string, field: FocusableField) => {
        if (activeSearch) { // Navigation within search dropdown
             if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSearchIndex(prev => (prev + 1) % activeSearch.results.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSearchIndex(prev => (prev - 1 + activeSearch.results.length) % activeSearch.results.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selectedItem = activeSearch.results[activeSearchIndex];
                if (selectedItem) handleSelectSearchResult(selectedItem);
            }
            return;
        }

        const isSearchRow = medId === 'search-row';

        if (isSearchRow) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const term = (e.target as HTMLInputElement).value.trim();
                if (term) {
                    handleSelectSearchResult({ id: 'add_new', name: term });
                }
            } else if (e.key === 'ArrowDown' && cart.length > 0) {
                e.preventDefault();
                document.getElementById(`input-${cart[0].id}-quantity`)?.focus();
            }
            return;
        }

        const currentMedIndex = cart.findIndex(med => med.id === medId);
        if (currentMedIndex === -1) return;

        const focusCell = (medIndex: number, fieldToFocus: FocusableField) => {
            const medToFocus = cart[medIndex];
            if (medToFocus) document.getElementById(`input-${medToFocus.id}-${fieldToFocus}`)?.focus();
        };

        const fieldsOrder: FocusableField[] = ['quantity', 'rate', 'discountValue'];
        if(salesSettings.showSalesTaxColumn) fieldsOrder.push('salesTaxAmount');
        if(salesSettings.showBatchNo) fieldsOrder.push('batchNo');

        const currentFieldIndex = fieldsOrder.indexOf(field);

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentMedIndex > 0) focusCell(currentMedIndex - 1, field);
            else searchInputRef.current?.focus();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentMedIndex < cart.length - 1) {
                focusCell(currentMedIndex + 1, field);
            } else {
                 searchInputRef.current?.focus();
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
    };

    const handleFinalizeBill = async (andPrint = false) => {
        if (!activeStore) { addNotification("Cannot finalize: No store is selected.", "error"); return; }
        if (cart.length === 0) { addNotification("Cannot finalize: The bill is empty.", "error"); return; }

        const billDataForFirestore = {
            storeId: activeStore.id,
            storeName: activeStore.name,
            storeAddress: activeStore.address,
            items: cartWithCalculations.filter(item => item.quantity > 0 && item.mrp > 0),
            subtotal: cartWithCalculations.reduce((acc, item) => acc + (item.mrp * item.quantity), 0),
            grandTotal,
        };
        
        if (billDataForFirestore.items.length === 0) { addNotification("Bill has no valid items.", "error"); return; }

        const billNumberToUse = Number(billNo);
        if (isNaN(billNumberToUse) || billNumberToUse <= 0) {
            addNotification("Invalid Bill Number. It must be a positive number.", "error");
            return;
        }
        
        if (!isEditing) {
            const isDuplicate = finalizedBills.some(b => b.billNo === billNumberToUse);
            if (isDuplicate) {
                addNotification(`Bill #${billNumberToUse} already exists. Please use a different number.`, 'error');
                return;
            }
        }
        
        const finalBillNo = await finalizeBill(billDataForFirestore, isEditing, isEditing ? editingBillNo! : billNumberToUse);
        
        if(finalBillNo) {
            addNotification(`Bill #${finalBillNo} ${editingBillNo ? 'updated' : 'finalized'}!`, "success");

            if (andPrint) {
                const fullBillForPrint: FinalizedBill = {
                    ...billDataForFirestore,
                    billNo: finalBillNo,
                    date: new Date().toISOString()
                };
                const billHTML = BillTemplate(fullBillForPrint, billLayoutSettings);
                const element = document.createElement('div');
                element.innerHTML = billHTML;
                html2pdf().from(element).set({
                    margin: 0.2,
                    filename: `Bill_${fullBillForPrint.billNo}_${fullBillForPrint.storeName.replace(/\s/g, '_')}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                }).save().then(() => {
                    resetBillingSession();
                    setActiveView('manage-stores');
                });
            } else {
                resetBillingSession();
                setActiveView('manage-stores');
            }
        }
    };
    
    const handleConfirmCancel = () => {
        resetBillingSession();
        addNotification("Bill cancelled.", "info");
        if(editingBillNo) {
            setEditingBillNo(null);
            setActiveView('your-bills');
        } else {
            setActiveView('manage-stores');
        }
    };
    
    const handleContextMenu = (e: React.MouseEvent, medicineId: string) => {
        e.preventDefault();
        if (window.confirm(`Remove ${cart.find(m => m.id === medicineId)?.name} from the bill?`)) {
            setCart(prev => prev.filter(m => m.id !== medicineId));
        }
    };
    
    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, id: string) => {
        dragItem.current = id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        setTimeout(() => (e.target as HTMLElement).classList.add('dragging'), 0);
    };

    const handleTableDragOver = (e: React.DragEvent<HTMLTableSectionElement>) => {
        e.preventDefault();
        const targetRow = (e.target as HTMLElement).closest('tr.bill-table-row');
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
        const newPosition = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';

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
        if (!sourceId || !targetId || sourceId === targetId) {
            setDragOverInfo({ id: null, position: null });
            return;
        }
        
        setCart(currentCart => {
            const sourceIndex = currentCart.findIndex(item => item.id === sourceId);
            if(sourceIndex === -1) return currentCart;
            
            const [movedItem] = currentCart.splice(sourceIndex, 1);
            let targetIndex = currentCart.findIndex(item => item.id === targetId);

            if (dragOverInfo.position === 'bottom') {
                targetIndex++;
            }
            currentCart.splice(targetIndex, 0, movedItem);
            return [...currentCart];
        });
        
        setDragOverInfo({ id: null, position: null });
    };

    const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
        (e.target as HTMLElement).classList.remove('dragging');
        dragItem.current = null;
        setDragOverInfo({ id: null, position: null });
    };

    return (
        <div className="h-full" onClick={(e) => e.stopPropagation()}>
            <div className="classic-billing-interface fade-in-content">
                <header className="classic-toolbar">
                    <input 
                      type="text" 
                      className="classic-toolbar-input" 
                      style={{ width: '80px', textAlign:'center' }} 
                      value={`#${billNo}`} 
                      title="Bill Number"
                      readOnly={isEditing}
                      onChange={e => {
                          if (!isEditing) {
                              const val = e.target.value.replace(/\D/g, '');
                              setBillNo(Number(val));
                          }
                      }}
                    />
                     <div className="font-semibold text-lg text-slate-300 ml-4 flex items-center gap-4">
                        {isBillingActive && activeStore ? (
                            <>Billing for: <span className="text-emerald-400">{activeStore.name}</span></>
                        ) : (
                            <>
                              <span className="text-amber-400">No Store Selected</span>
                              <Button onClick={() => setActiveView('manage-stores')} variant="secondary" className="!px-3 !py-1 !text-xs">
                                  Select a Store
                              </Button>
                            </>
                        )}
                    </div>

                    <div className="flex-grow"></div>
                    <button className="classic-toolbar-button" onClick={() => handleFinalizeBill()} disabled={!isBillingActive || cart.length === 0}>Save</button>
                    <button className="classic-toolbar-button !bg-emerald-600 hover:!bg-emerald-500 text-white" onClick={() => handleFinalizeBill(true)} disabled={!isBillingActive || cart.length === 0}>Save & Print</button>
                    {isCancelling ? (
                        <button className="classic-toolbar-button !bg-red-600 hover:!bg-red-500 text-white" onClick={handleConfirmCancel} onMouseLeave={() => setIsCancelling(false)} autoFocus>
                            Confirm
                        </button>
                    ) : (
                        <button className="classic-toolbar-button" onClick={() => setIsCancelling(true)}>Cancel</button>
                    )}
                </header>
                
                <div ref={gridContainerRef} className="classic-grid-container custom-scrollbar">
                    { isBillingActive ? (
                        <table className="classic-grid">
                            <thead>
                                <tr>
                                    <th style={{ width: '45%' }}>Product</th>
                                    <th style={{ width: '10%' }}>Quantity</th>
                                    <th style={{ width: '12%' }}>Rate</th>
                                    <th style={{ width: '10%' }}>Disc %</th>
                                    {salesSettings.showSalesTaxColumn && <th style={{ width: '10%' }}>Tax</th>}
                                    {salesSettings.showBatchNo && <th style={{ width: '13%' }}>Batch No.</th>}
                                    <th style={{ width: '10%' }}>Net Amount</th>
                                </tr>
                            </thead>
                            <tbody
                                 onDragOver={handleTableDragOver}
                                 onDrop={handleTableDrop}
                                 onDragLeave={handleTableDragLeave}
                            >
                                <tr className='bg-slate-700/50'>
                                     <td colSpan={4 + (salesSettings.showSalesTaxColumn ? 1 : 0) + (salesSettings.showBatchNo ? 1 : 0) + 1} className='p-0'>
                                         <input 
                                             id='input-search-row-srch'
                                             ref={searchInputRef}
                                             type="text" 
                                             className="grid-input !text-left !font-semibold !pl-4 !text-base !text-violet-300 placeholder:!text-slate-400" 
                                             placeholder='Search or Add a new product... (Press Ctrl key to focus)'
                                             autoComplete="off"
                                             value={searchTerm}
                                             onChange={handleSearchChange}
                                             onKeyDown={e => handleInputKeyDown(e, 'search-row', 'quantity')} // Dummy field
                                             disabled={!isBillingActive}
                                         />
                                     </td>
                                 </tr>
                                {cart.map((med) => {
                                    const data = itemData[med.id];
                                    const totals = calculateItemTotals(med, data);
                                    
                                    let rowClassName = 'bill-table-row';
                                    if(dragOverInfo.id === med.id) {
                                        rowClassName += dragOverInfo.position === 'top' ? ' drag-over-top' : ' drag-over-bottom';
                                    }

                                    return (
                                        <BillRow
                                            key={med.id}
                                            rowId={med.id}
                                            med={med}
                                            data={data}
                                            netAmount={totals.netAmount}
                                            discountDisplayValue={data?.discountValue ?? med.saleDiscount ?? ''}
                                            onDataChange={handleDataChange}
                                            onKeyDown={handleInputKeyDown}
                                            onFocus={(e) => e.target.select()}
                                            onContextMenu={handleContextMenu}
                                            onDragStart={handleDragStart}
                                            onDragEnd={handleDragEnd}
                                            className={rowClassName}
                                            onMouseEnter={() => setHoveredMed(med)}
                                            onMouseLeave={() => setHoveredMed(null)}
                                            onInputFocus={() => setFocusedMed(med)}
                                            onInputBlur={handleInputBlur}
                                            showSalesTaxColumn={salesSettings.showSalesTaxColumn}
                                            showBatchNo={salesSettings.showBatchNo}
                                            allowRowReordering={true}
                                        />
                                    );
                                })}
                                {Array.from({ length: emptyRowCount }).map((_, index) => (
                                    <tr key={`empty-${index}`}><td colSpan={7}></td></tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-10 text-slate-400 h-full">
                            <Icon name="no_store" className="text-6xl mb-4 text-slate-500"/>
                            <h3 className="text-2xl font-semibold text-slate-300">Select a Store to Begin</h3>
                            <p className="mt-2 max-w-sm">Please choose a store from the 'Stores' section or click the 'Select a Store' button above.</p>
                        </div>
                    )}
                </div>

                <footer className="classic-footer">
                    <input type="text" className="classic-footer-input" style={{ width: 'auto', textAlign: 'left' }} readOnly value={`${cart.length} items`} title="Item Count"/>
                    <div className="flex-grow"></div>
                    <span className='text-slate-400 font-semibold mr-2'>GRAND TOTAL:</span>
                    <input type="text" className="classic-footer-input" style={{ width: '150px', fontWeight: 'bold' }} readOnly value={grandTotal.toFixed(2)} title="Grand Total"/>
                </footer>
            </div>
            
            {activeSearch && (
                <ProductSearchDropdown 
                    search={activeSearch}
                    onSelect={handleSelectSearchResult}
                    activeIndex={activeSearchIndex}
                />
            )}
        </div>
    );
}