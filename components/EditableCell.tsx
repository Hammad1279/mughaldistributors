
import React, { useState, useEffect, useRef } from 'react';
import { CellData } from '../types';

interface EditableCellProps {
    cellData: CellData;
    isSelected: boolean;
    isEditing: boolean;
    onUpdate: (formula: string) => void;
    onSelect: () => void;
    onStartEditing: () => void;
}

export const EditableCell: React.FC<EditableCellProps> = ({
    cellData,
    isSelected,
    isEditing,
    onUpdate,
    onSelect,
    onStartEditing,
}) => {
    const [inputValue, setInputValue] = useState(cellData.formula);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setInputValue(cellData.formula);
    }, [cellData.formula]);
    
    useEffect(() => {
        if (isEditing) {
            setInputValue(cellData.formula);
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing, cellData.formula]);

    const handleBlur = () => {
        onUpdate(inputValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onUpdate(inputValue);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setInputValue(cellData.formula);
            onUpdate(cellData.formula);
        }
    };
    
    const handleDoubleClick = () => {
        onStartEditing();
    };
    
    const cellStyle = {
        fontWeight: cellData.style?.fontWeight || 'normal',
        fontStyle: cellData.style?.fontStyle || 'normal',
        textDecoration: cellData.style?.textDecoration || 'none',
        textAlign: cellData.style?.textAlign || (typeof cellData.value === 'number' ? 'right' : 'left'),
        verticalAlign: cellData.style?.verticalAlign || 'middle',
        backgroundColor: cellData.style?.backgroundColor,
        color: cellData.style?.color,
        fontFamily: cellData.style?.fontFamily || 'Calibri',
        fontSize: cellData.style?.fontSize ? `${cellData.style.fontSize}pt` : '11pt',
        whiteSpace: cellData.style?.whiteSpace || 'nowrap',
        textIndent: cellData.style?.textIndent,
    };
    
    const displayValue = cellData.error ? cellData.error : cellData.value;

    return (
        <td
            className={`grid-cell ${isSelected ? 'selected' : ''}`}
            onClick={onSelect}
            onDoubleClick={handleDoubleClick}
            style={cellStyle as React.CSSProperties}
        >
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="grid-cell-content"
                    style={{
                        textAlign: cellStyle.textAlign,
                        fontFamily: cellStyle.fontFamily,
                        fontSize: cellStyle.fontSize,
                    } as any}
                />
            ) : (
                <div 
                    className={`grid-cell-display ${cellData.error ? 'is-error' : ''}`} 
                    title={cellData.error ?? undefined}
                    style={{
                       justifyContent: cellStyle.textAlign === 'right' ? 'flex-end' : cellStyle.textAlign === 'center' ? 'center' : 'flex-start'
                    } as any}
                >
                    {displayValue}
                </div>
            )}
        </td>
    );
};