import React, { memo, useRef, useEffect } from 'react';
import { Medicine } from '../types';

interface PurchaseRowData {
    srch: string;
    quantity: number;
    rate: number;
    discount: number;
    batchNo: string;
}

type FocusableField = 'srch' | 'quantity' | 'rate' | 'discount' | 'batchNo';

interface PurchaseRowProps {
    med: Medicine;
    data: PurchaseRowData | undefined;
    netAmount: number;
    onDataChange: (medId: string, field: keyof PurchaseRowData, value: string | number) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, medId: string, field: FocusableField) => void;
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
    
    // Inline editing props
    isEditingName: boolean;
    editingNameValue: string;
    onNameChange: (newValue: string) => void;
    onStartEditName: () => void;
    onSaveName: () => void;
    onCancelEditName: () => void;
    
    // Drag and drop props
    onDragStart: (e: React.DragEvent<HTMLTableRowElement>) => void;
    onDragEnd: (e: React.DragEvent<HTMLTableRowElement>) => void;
    className: string;
    rowId: string;
}

const PurchaseRow: React.FC<PurchaseRowProps> = ({
    med, data, netAmount, onDataChange, onKeyDown, onFocus,
    onDragStart, onDragEnd, className, rowId,
    isEditingName, editingNameValue, onNameChange,
    onStartEditName, onSaveName, onCancelEditName
}) => {
    const nameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
        }
    }, [isEditingName]);

    return (
        <tr 
            className={`purchase-table-row hover:bg-slate-700/30 transition-all duration-150 ${className}`}
            draggable="true"
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            data-id={rowId}
        >
            <td
                className="product-name"
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isEditingName) {
                        onSaveName();
                    } else {
                        onStartEditName();
                    }
                }}
            >
                {isEditingName ? (
                    <input
                        ref={nameInputRef}
                        type="text"
                        value={editingNameValue}
                        onChange={(e) => onNameChange(e.target.value)}
                        onBlur={onCancelEditName}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                onSaveName();
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                onCancelEditName();
                            }
                        }}
                        className="w-full h-full bg-transparent border-0 outline-none p-0 m-0 text-slate-100 font-semibold"
                        onClick={e => e.stopPropagation()}
                    />
                ) : (
                    med.name
                )}
            </td>
            <td><input id={`input-${med.id}-quantity`} type="number" className="grid-input" value={data?.quantity || ''} onChange={e => onDataChange(med.id, 'quantity', Number(e.target.value))} onKeyDown={e => onKeyDown(e, med.id, 'quantity')} onFocus={onFocus} /></td>
            <td><input id={`input-${med.id}-rate`} type="number" className="grid-input" value={data?.rate || ''} onChange={e => onDataChange(med.id, 'rate', Number(e.target.value))} onKeyDown={e => onKeyDown(e, med.id, 'rate')} onFocus={onFocus} /></td>
            <td><input id={`input-${med.id}-discount`} type="number" className="grid-input" value={data?.discount || ''} onChange={e => onDataChange(med.id, 'discount', Number(e.target.value))} onKeyDown={e => onKeyDown(e, med.id, 'discount')} onFocus={onFocus} /></td>
            <td><input id={`input-${med.id}-batchNo`} type="text" className="grid-input" value={data?.batchNo || ''} onChange={e => onDataChange(med.id, 'batchNo', e.target.value)} onKeyDown={e => onKeyDown(e, med.id, 'batchNo')} onFocus={onFocus} /></td>
            <td className="net-amount">{netAmount > 0 ? netAmount.toFixed(2) : ''}</td>
        </tr>
    );
};

export default memo(PurchaseRow);