import React, { useState, useEffect, useRef } from 'react';
import { ChartConfig } from '../types';
import { Modal, Button, Input } from './ui';

interface ChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: Omit<ChartConfig, 'id' | 'position' | 'size'>) => void;
}

export const ChartModal: React.FC<ChartModalProps> = ({ isOpen, onClose, onSave }) => {
    const [type, setType] = useState<'bar' | 'line' | 'pie'>('bar');
    const [dataRange, setDataRange] = useState('');
    const [labelRange, setLabelRange] = useState('');
    const dataRangeInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setDataRange('');
            setLabelRange('');
            setTimeout(() => dataRangeInputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSave = () => {
        if (dataRange.trim() && labelRange.trim()) {
            onSave({ type, dataRange, labelRange });
        }
    };

    const isFormValid = dataRange.trim() !== '' && labelRange.trim() !== '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Chart">
            <div className="space-y-4">
                <div>
                    <label htmlFor="chart-type" className="block text-sm font-medium text-slate-400 mb-1.5">Chart Type</label>
                    <select
                        id="chart-type"
                        value={type}
                        onChange={(e) => setType(e.target.value as any)}
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition text-slate-200"
                    >
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Chart</option>
                        <option value="pie">Pie Chart</option>
                    </select>
                </div>
                <Input
                    ref={dataRangeInputRef}
                    label="Data Range"
                    placeholder="e.g., B2:B11"
                    value={dataRange}
                    onChange={(e) => setDataRange(e.target.value.toUpperCase())}
                />
                <Input
                    label="Label Range"
                    placeholder="e.g., A2:A11"
                    value={labelRange}
                    onChange={(e) => setLabelRange(e.target.value.toUpperCase())}
                />
                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave} disabled={!isFormValid}>Create Chart</Button>
                </div>
            </div>
        </Modal>
    );
};
