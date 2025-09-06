

import React, { memo, useState } from 'react';
import { Supplier } from '../types';
import { Button, Icon } from './ui';

interface SupplierListItemProps {
    supplier: Supplier;
    onStartPurchase: (supplierId: string) => void;
    onEdit: (supplier: Supplier) => void;
    onDelete: (supplierId: string) => void;
    onContextMenu: (e: React.MouseEvent, supplierId: string) => void;
}

const SupplierListItem: React.FC<SupplierListItemProps> = ({
    supplier, onStartPurchase, onEdit, onDelete, onContextMenu
}) => {
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleDeleteClick = () => {
        if (confirmDelete) {
            onDelete(supplier.id);
            setConfirmDelete(false);
        } else {
            setConfirmDelete(true);
        }
    };

    return (
        <li 
            className="store-list-item" 
            onMouseLeave={() => setConfirmDelete(false)}
            onContextMenu={(e) => onContextMenu(e, supplier.id)}
        >
            <div className="store-list-item-content">
                <div className="supplier-list-item-icon-wrapper">
                    <Icon name="local_shipping" />
                </div>
                <div className="store-list-item-text">
                    <h3 className="store-name" title={supplier.name}>{supplier.name}</h3>
                    <p className="store-address" title={supplier.address}>{supplier.address}</p>
                </div>
            </div>
            <div className="store-list-item-actions">
                <Button onClick={() => onStartPurchase(supplier.id)} variant="success" className="!px-3 !py-1.5 !text-sm" title="New Purchase" icon="receipt">
                    New Purchase
                </Button>
                <Button onClick={() => onEdit(supplier)} variant="toolbar" className="!w-9 !h-9" title="Edit Supplier">
                     <Icon name="edit" /> <span className="sr-only">Edit</span>
                </Button>
                <Button 
                    onClick={handleDeleteClick} 
                    variant={confirmDelete ? 'danger' : 'toolbar'} 
                    className={`hover:!bg-red-500/20 hover:text-red-400 !w-auto !min-w-[36px] !h-9 !px-2 transition-all duration-200`} 
                    title={confirmDelete ? "Confirm Delete" : "Delete Supplier"}
                >
                    {confirmDelete ? 'Confirm' : <><Icon name="delete" /> <span className="sr-only">Delete</span></>}
                </Button>
            </div>
        </li>
    );
};

export default memo(SupplierListItem);