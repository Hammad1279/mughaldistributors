

import React, { memo } from 'react';
import { MedicalStore } from '../types';
import { Button, Icon } from './ui';

interface StoreListItemProps {
    store: MedicalStore;
    storeToDeleteConfirm: string | null;
    onStartBilling: (storeId: string) => void;
    onEdit: (store: MedicalStore) => void;
    onDeleteClick: (store: MedicalStore) => void;
    onConfirmDelete: (storeId: string) => void;
    onMouseLeave: () => void;
    onContextMenu: (e: React.MouseEvent, storeId: string) => void;
}

const StoreListItem: React.FC<StoreListItemProps> = ({
    store, storeToDeleteConfirm, onStartBilling, onEdit,
    onDeleteClick, onConfirmDelete, onMouseLeave, onContextMenu
}) => {
    return (
        <li 
            className="store-list-item" 
            tabIndex={-1}
            onMouseLeave={onMouseLeave}
            onContextMenu={(e) => onContextMenu(e, store.id)}
        >
            <div className="store-list-item-content">
                <div className="store-list-item-icon-wrapper">
                    <Icon name="storefront" />
                </div>
                <div className="store-list-item-text">
                    <h3 className="store-name" title={store.name}>{store.name}</h3>
                    <p className="store-address" title={store.address}>{store.address}</p>
                </div>
            </div>
            <div className="store-list-item-actions">
                <Button onClick={() => onStartBilling(store.id)} variant="success" className="!px-3 !py-1.5 !text-sm" title="Create Bill" icon="receipt_long">
                    Create Bill
                </Button>
                <Button onClick={() => onEdit(store)} variant="toolbar" className="!w-9 !h-9" title="Edit Store">
                     <Icon name="edit" /> <span className="sr-only">Edit</span>
                </Button>
                {storeToDeleteConfirm === store.id ? (
                    <Button 
                        onClick={() => onConfirmDelete(store.id)} 
                        variant="danger"
                        className="!px-3 !py-1.5 !text-sm !w-auto"
                        autoFocus
                    >
                        Confirm
                    </Button>
                ) : (
                    <Button onClick={() => onDeleteClick(store)} variant="toolbar" className="hover:!bg-red-500/20 hover:text-red-400 !w-9 !h-9" title="Delete Store">
                        <Icon name="delete" /> <span className="sr-only">Delete</span>
                    </Button>
                )}
            </div>
        </li>
    );
};

export default memo(StoreListItem);