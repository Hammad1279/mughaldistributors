

import React, { memo } from 'react';
import { Medicine } from '../types';
import { BillItemData, FocusableField } from './CreateBill';

interface BillRowProps {
    rowId: string;
    med: Medicine;
    data: BillItemData | undefined;
    netAmount: number;
    discountDisplayValue: string | number;
    onDataChange: (medId: string, field: keyof BillItemData, value: string | number) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, medId: string, field: FocusableField) => void;
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
    onContextMenu: (e: React.MouseEvent, medicineId: string) => void;
    onDragStart: (e: React.DragEvent<HTMLTableRowElement>, id: string) => void;
    onDragEnd: (e: React.DragEvent<HTMLTableRowElement>) => void;
    className: string;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onInputFocus: () => void;
    onInputBlur: () => void;
    showSalesTaxColumn: boolean;
    showBatchNo: boolean;
    allowRowReordering: boolean;
}

const BillRow: React.FC<BillRowProps> = ({
    rowId, med, data, netAmount, discountDisplayValue,
    onDataChange, onKeyDown, onFocus, onContextMenu,
    onDragStart, onDragEnd, className,
    onMouseEnter, onMouseLeave, onInputFocus, onInputBlur,
    showSalesTaxColumn, showBatchNo, allowRowReordering
}) => {
    
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        onFocus(e);
        onInputFocus();
    };
    
    return (
        <tr 
            className={`transition-all duration-150 ${className}`}
            draggable={allowRowReordering}
            onDragStart={(e) => onDragStart(e, rowId)}
            onDragEnd={onDragEnd}
            data-id={rowId}
            onContextMenu={(e) => onContextMenu(e, med.id)} 
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <td className={`product-name ${allowRowReordering ? 'cursor-grab' : ''}`}>{med.name}</td>
            <td data-label="Quantity"><input id={`input-${med.id}-quantity`} type="number" className="grid-input" value={data?.quantity || ''} onChange={e => onDataChange(med.id, 'quantity', Number(e.target.value))} onKeyDown={e => onKeyDown(e, med.id, 'quantity')} onFocus={handleFocus} onBlur={onInputBlur} /></td>
            <td data-label="Rate"><input id={`input-${med.id}-rate`} type="number" className="grid-input" value={data?.rate ?? (med.price || '')} onChange={e => onDataChange(med.id, 'rate', Number(e.target.value))} onKeyDown={e => onKeyDown(e, med.id, 'rate')} onFocus={handleFocus} onBlur={onInputBlur} /></td>
            <td data-label="Disc %"><input id={`input-${med.id}-discountValue`} type="number" className="grid-input" value={discountDisplayValue} onChange={e => onDataChange(med.id, 'discountValue', e.target.value)} onKeyDown={e => onKeyDown(e, med.id, 'discountValue')} onFocus={handleFocus} onBlur={onInputBlur} /></td>
            {showSalesTaxColumn && <td data-label="Tax"><input id={`input-${med.id}-salesTaxAmount`} type="number" className="grid-input" value={data?.salesTaxAmount ?? ''} onChange={e => onDataChange(med.id, 'salesTaxAmount', Number(e.target.value))} onKeyDown={e => onKeyDown(e, med.id, 'salesTaxAmount')} onFocus={handleFocus} onBlur={onInputBlur} /></td>}
            {showBatchNo && <td data-label="Batch No."><input id={`input-${med.id}-batchNo`} type="text" className="grid-input" value={data?.batchNo || ''} onChange={e => onDataChange(med.id, 'batchNo', e.target.value)} onKeyDown={e => onKeyDown(e, med.id, 'batchNo')} onFocus={handleFocus} onBlur={onInputBlur} /></td>}
            <td className="net-amount">{netAmount > 0 ? netAmount.toFixed(2) : ''}</td>
        </tr>
    );
};

export default memo(BillRow);