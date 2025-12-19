import React, { memo } from 'react';
import { Medicine } from '../types';

interface InventoryRowProps {
    med: Medicine;
    onEdit: (med: Medicine) => void;
    onDelete: (medId: string) => void;
}

const InventoryRow: React.FC<InventoryRowProps> = ({ med, onEdit, onDelete }) => {
    return (
        <tr className="hover:bg-slate-700/30 transition-colors">
            <td className="p-4 font-medium text-slate-100">{med.name}</td>
            <td className={`p-4 font-semibold ${med.price ? 'text-emerald-400' : 'text-red-400'}`}>{med.price ? `Rs ${med.price.toFixed(2)}` : 'Not Set'}</td>
            <td className="p-4 text-slate-300">{med.discount != null ? `${med.discount}%` : 'N/A'}</td>
            <td className="p-4 text-slate-300">{med.saleDiscount != null ? `${med.saleDiscount}%` : 'N/A'}</td>
            <td className="p-4 text-slate-400">{med.batchNo || 'N/A'}</td>
            <td className="p-4">
                <div className="flex gap-4">
                    <button onClick={() => onEdit(med)} className="text-violet-400 hover:text-violet-300 font-medium">Edit</button>
                    <button onClick={() => onDelete(med.id)} className="text-red-400 hover:text-red-300 font-medium">Delete</button>
                </div>
            </td>
        </tr>
    );
};

export default memo(InventoryRow);