
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../App';
import { Medicine, CartItem, FinalizedBill } from '../types';
import { Button, Icon, BottomSheet, SearchInput } from './ui';
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

// --- Mobile Specific Components ---
const MobileBillItemCard: React.FC<{
    item: CartItem;
    data: BillItemData | undefined;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    totals: { netAmount: number };
}> = ({ item, data, onEdit, onDelete, totals }) => {
    // Robust fallback for undefined data to prevent crashes
    const quantity = data?.quantity ?? item.quantity ?? 1;
    const rate = data?.rate ?? item.mrp ?? 0;
    const discount = data?.discountValue ?? 0;

    return (
        <div 
            className="bg-slate-800/80 backdrop-blur-sm p-4 rounded-2xl mb-3 border border-slate-700/50 shadow-sm active:scale-[0.98] transition-transform relative overflow-hidden group" 
            onClick={() => onEdit(item.id)}
        >
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-slate-100 text-lg truncate pr-8 leading-tight">{item.name}</h3>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} 
                        className="absolute top-0 right-0 p-2 -mr-2 -mt-2 text-slate-500 hover:text-red-400 active:text-red-500 transition-colors"
                    >
                        <Icon name="cancel" className="text-xl" />
                    </button>
                </div>
                <div className="flex justify-between items-end">
                    <div className="flex gap-5">
                        <div className="flex flex-col">
                             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Qty</span>
                             <span className="text-white font-semibold text-base font-mono">{quantity}</span>
                        </div>
                        <div className="flex flex-col">
                             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Rate</span>
                             <span className="text-white font-semibold text-base font-mono">{rate}</span>
                        </div>
                         {(discount > 0) && (
                             <div className="flex flex-col">
                                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Disc</span>
                                 <span className="text-amber-400 font-semibold text-base font-mono">{discount}%</span>
                            </div>
                         )}
                    </div>
                    <div className="text-right">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Amount</span>
                        <span className="text-xl font-bold text-emerald-400 font-mono">
                            <span className="text-sm align-top mr-0.5">Rs</span>
                            {totals.netAmount.toFixed(0)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

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
        setFocusedMed, setHoveredMed, billLayoutSettings, salesSettings, isMobile
    } = useAppContext();

    const [itemData, setItemData] = useState<Record<string, BillItemData>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSearch, setActiveSearch] = useState<ActiveSearch | null>(null);
    const [activeSearchIndex, setActiveSearchIndex] = useState(0);
    const [emptyRowCount, setEmptyRowCount] = useState(0);
    
    // Mobile Specific State
    const [isProductSheetOpen, setIsProductSheetOpen] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    
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
        // Robust check for undefined data
        if (!data) {
            return { calculatedDiscountAmount: 0, netAmount: 0 };
        }
        const qty = data.quantity || 0;
        const rate = data.rate || 0;

        const grossAmount = qty * rate;
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
            const results = medicineFuse.search(term.trim()).map((r:any) => r.item).slice(0, 20); // Increased limit for mobile
            const searchResults: (Medicine | { id: 'add_new'; name: string })[] = [...results];
            if (!results.some((r:any) => r.name.toLowerCase() === term.trim().toLowerCase())) {
                 searchResults.push({ id: 'add_new', name: term.trim() });
            }
           
            if (isMobile) {
                 // For mobile, we just set results to render in the sheet
                 setActiveSearch({ term, results: searchResults, top: 0, left: 0 });
            } else {
                const inputRect = e.target.getBoundingClientRect();
                const mainContent = (e.target as HTMLElement).closest('.animate-main-in');
                const mainRect = mainContent ? mainContent.getBoundingClientRect() : { top: 0, left: 0 };
        
                setActiveSearch({
                    term,
                    results: searchResults,
                    top: inputRect.bottom + 4 - mainRect.top,
                    left: inputRect.left - mainRect.left
                });
            }
            setActiveSearchIndex(0);
        } else {
            setActiveSearch(null);
        }
    };
    
    const handleSelectSearchResult = async (item: Medicine | { id: 'add_new'; name: string }) => {
        setActiveSearch(null);
        setSearchTerm('');
        if (isMobile) setIsProductSheetOpen(false);

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
                if (!isMobile) {
                    setTimeout(() => document.getElementById(`input-${med.id}-quantity`)?.focus(), 50);
                }
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
            if (isMobile && editingItemId === medId) setEditingItemId(null);
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
        if (activeSearch && !isMobile) { // Navigation within search dropdown
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


    // --- MOBILE VIEW RENDER ---
    if (isMobile) {
        const editingItem = editingItemId ? cart.find(i => i.id === editingItemId) : null;
        const editingItemData = editingItemId ? itemData[editingItemId] : null;

        return (
            <div className="h-full flex flex-col bg-slate-900 text-slate-200 relative">
                {/* Mobile Header - Glassmorphism */}
                <div className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 p-4 shadow-lg flex justify-between items-center transition-all duration-300">
                     <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Bill #{billNo}</div>
                        {activeStore ? (
                            <div className="text-lg font-bold text-white leading-tight flex items-center gap-1">
                                {activeStore.name}
                                <Icon name="verified" className="text-blue-400 text-sm" />
                            </div>
                        ) : (
                            <button onClick={() => setActiveView('manage-stores')} className="text-amber-400 font-semibold flex items-center gap-1 animate-pulse">
                                Select Store <Icon name="chevron_right" />
                            </button>
                        )}
                     </div>
                     <div className="text-right bg-slate-800/50 px-3 py-1.5 rounded-lg border border-white/5">
                         <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</div>
                         <div className="text-lg font-bold text-emerald-400">
                             <span className="text-xs align-top mr-0.5">Rs</span>{grandTotal.toFixed(0)}
                         </div>
                     </div>
                </div>

                {/* Mobile Item List */}
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar pb-24 space-y-3">
                    {cart.length > 0 ? (
                        cart.map(item => (
                            <MobileBillItemCard 
                                key={item.id}
                                item={item}
                                data={itemData[item.id]}
                                onEdit={(id) => setEditingItemId(id)}
                                onDelete={(id) => {
                                     setCart(prev => prev.filter(i => i.id !== id));
                                     addNotification("Item removed", "info");
                                }}
                                totals={calculateItemTotals(item, itemData[item.id])}
                            />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 px-8 text-center">
                            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6 shadow-inner">
                                <Icon name="shopping_cart" className="text-4xl opacity-30" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-300 mb-2">Your bill is empty</h3>
                            <p className="text-sm">Tap "Add Item" below to start building your order.</p>
                        </div>
                    )}
                </div>
                
                {/* Mobile Bottom Actions - Floating Bar Style */}
                <div className="fixed bottom-20 left-0 right-0 px-4 z-10">
                     <div className="flex gap-3 bg-slate-800/90 backdrop-blur-xl p-2 rounded-2xl shadow-2xl border border-white/10">
                         <button 
                            onClick={() => setIsProductSheetOpen(true)}
                            className="flex-1 bg-slate-700/50 hover:bg-slate-700 active:scale-95 transition-all text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                         >
                             <Icon name="add" className="text-xl" /> Add Item
                         </button>
                         <button 
                            onClick={() => handleFinalizeBill(false)}
                            disabled={!isBillingActive || cart.length === 0}
                            className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-95 transition-all text-white font-bold py-3 rounded-xl shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                         >
                             Finish <Icon name="check" className="text-xl" />
                         </button>
                     </div>
                </div>

                {/* Add Product Sheet */}
                <BottomSheet isOpen={isProductSheetOpen} onClose={() => setIsProductSheetOpen(false)} title="Add Product">
                    <div className="p-2 space-y-4 min-h-[50vh]">
                        <SearchInput
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onClear={() => { setSearchTerm(''); setActiveSearch(null); }}
                            placeholder="Search medicine..."
                            className="w-full"
                            autoFocus
                        />
                        <div className="max-h-[50vh] overflow-y-auto pb-10">
                            {activeSearch ? (
                                <ul className="space-y-2">
                                    {activeSearch.results.map((item: any) => (
                                        <li 
                                            key={item.id} 
                                            onClick={() => handleSelectSearchResult(item)}
                                            className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 flex justify-between items-center active:bg-violet-600 active:border-violet-500 active:text-white transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
                                                    {item.name.charAt(0)}
                                                </div>
                                                <span className="font-semibold text-base">{item.name}</span>
                                            </div>
                                            {item.price && <span className="text-xs font-mono opacity-70 bg-black/20 px-2 py-1 rounded">Rs {item.price}</span>}
                                            {item.id === 'add_new' && <Icon name="add" />}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center py-10 text-slate-500">
                                    <p>Start typing to search...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </BottomSheet>

                {/* Edit Item Sheet */}
                <BottomSheet isOpen={!!editingItemId} onClose={() => setEditingItemId(null)} title={editingItem?.name || 'Edit Item'}>
                    {editingItem && editingItemData && (
                        <div className="space-y-6 p-4 pb-10">
                            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-bold">Quantity</label>
                                        <div className="flex items-center gap-2 bg-slate-900/50 rounded-full p-1 border border-slate-700">
                                            <button 
                                                onClick={() => handleDataChange(editingItem.id, 'quantity', editingItemData.quantity - 1)}
                                                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xl font-bold active:scale-90 transition-transform"
                                            >
                                                -
                                            </button>
                                            <input 
                                                type="number" 
                                                className="bg-transparent text-center text-xl font-bold w-full focus:outline-none text-white font-mono" 
                                                value={editingItemData.quantity}
                                                inputMode="decimal"
                                                onChange={(e) => handleDataChange(editingItem.id, 'quantity', parseFloat(e.target.value))}
                                            />
                                            <button 
                                                onClick={() => handleDataChange(editingItem.id, 'quantity', editingItemData.quantity + 1)}
                                                className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center text-xl font-bold active:scale-90 transition-transform shadow-lg shadow-violet-900/30"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-bold">Price (Rs)</label>
                                        <input 
                                            type="number" 
                                            inputMode="decimal"
                                            className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-xl text-xl font-bold text-center focus:ring-2 focus:ring-violet-500 outline-none font-mono" 
                                            value={editingItemData.rate}
                                            onChange={(e) => handleDataChange(editingItem.id, 'rate', parseFloat(e.target.value))}
                                        />
                                    </div>
                                </div>
                                
                                 <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-bold">Discount %</label>
                                        <input 
                                            type="number" 
                                            inputMode="decimal"
                                            className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-xl text-xl font-bold text-center focus:ring-2 focus:ring-violet-500 outline-none font-mono text-amber-400" 
                                            value={editingItemData.discountValue || ''}
                                            placeholder="0"
                                            onChange={(e) => handleDataChange(editingItem.id, 'discountValue', parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="flex items-end justify-end">
                                         <div className="text-right bg-slate-900/80 p-3 rounded-xl border border-slate-700 w-full">
                                            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Total</div>
                                            <div className="text-2xl font-bold text-emerald-400 font-mono leading-none">
                                                <span className="text-sm align-top mr-1 text-emerald-600">Rs</span>
                                                {calculateItemTotals(editingItem, editingItemData).netAmount.toFixed(0)}
                                            </div>
                                         </div>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setEditingItemId(null)} 
                                className="w-full bg-white text-slate-900 hover:bg-slate-200 active:scale-[0.98] transition-all py-4 rounded-xl font-bold text-lg shadow-lg"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </BottomSheet>
            </div>
        );
    }

    // --- DESKTOP VIEW (Classic) ---
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
            
            {activeSearch && !isMobile && (
                <ProductSearchDropdown 
                    search={activeSearch}
                    onSelect={handleSelectSearchResult}
                    activeIndex={activeSearchIndex}
                />
            )}
        </div>
    );
}
