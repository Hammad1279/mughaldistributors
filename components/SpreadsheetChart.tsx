import React, { useRef, useEffect, useMemo, useState } from 'react';
import { ChartConfig, GridData } from '../types';
import { parseRange, getValuesFromRange } from '../utils/spreadsheet';
import { Icon } from './ui';

declare var Chart: any;

interface SpreadsheetChartProps {
    chartConfig: ChartConfig;
    gridData: GridData;
    onUpdate: (updatedConfig: ChartConfig) => void;
    onDelete: (chartId: string) => void;
}

export const SpreadsheetChart: React.FC<SpreadsheetChartProps> = ({ chartConfig, gridData, onUpdate, onDelete }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const chartData = useMemo(() => {
        const dataRange = parseRange(chartConfig.dataRange);
        const labelRange = parseRange(chartConfig.labelRange);

        if (!dataRange || !labelRange) return { labels: [], data: [] };

        const labels = getValuesFromRange(gridData, labelRange);
        const data = getValuesFromRange(gridData, dataRange).map(v => parseFloat(String(v)) || 0);

        return { labels, data };
    }, [gridData, chartConfig.dataRange, chartConfig.labelRange]);

    useEffect(() => {
        if (!chartRef.current) return;
        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }
        
        const chartColors = [
          'rgba(139, 92, 246, 0.7)', 'rgba(236, 72, 153, 0.7)', 'rgba(16, 185, 129, 0.7)', 
          'rgba(245, 158, 11, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(239, 68, 68, 0.7)'
        ];

        chartInstance.current = new Chart(ctx, {
            type: chartConfig.type,
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Dataset',
                    data: chartData.data,
                    backgroundColor: chartConfig.type === 'pie' ? chartColors : 'rgba(139, 92, 246, 0.6)',
                    borderColor: '#a78bfa',
                    borderWidth: chartConfig.type === 'line' ? 2 : 1,
                    tension: 0.1,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: chartConfig.type === 'pie' ? 'top' : 'none',
                    },
                    title: {
                        display: true,
                        text: `${chartConfig.labelRange} vs ${chartConfig.dataRange}`
                    }
                }
            }
        });

        return () => chartInstance.current?.destroy();

    }, [chartData, chartConfig.type, chartConfig.labelRange, chartConfig.dataRange]);
    
    // Dragging Logic
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('.chart-resize-handle, .chart-delete-button')) {
            return;
        }
        e.preventDefault();
        setIsDragging(true);
        setDragStart({
            x: e.clientX - chartConfig.position.left,
            y: e.clientY - chartConfig.position.top,
        });
    };

    // Resizing Logic
    const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = chartConfig.size.width;
        const startHeight = chartConfig.size.height;
    
        const doDrag = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            const newHeight = startHeight + (moveEvent.clientY - startY);
            onUpdate({
                ...chartConfig,
                size: {
                    width: Math.max(200, newWidth),
                    height: Math.max(150, newHeight),
                },
            });
        };
    
        const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
        };
    
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !wrapperRef.current) return;
            const parentRect = wrapperRef.current.parentElement?.getBoundingClientRect();
            if(!parentRect) return;

            onUpdate({
                ...chartConfig,
                position: {
                    top: e.clientY - dragStart.y,
                    left: e.clientX - dragStart.x,
                }
            });
        };

        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart, chartConfig, onUpdate]);

    return (
        <div
            ref={wrapperRef}
            className="spreadsheet-chart-wrapper"
            style={{
                top: chartConfig.position.top,
                left: chartConfig.position.left,
                width: chartConfig.size.width,
                height: chartConfig.size.height,
            }}
            onMouseDown={handleMouseDown}
        >
            <div className="chart-header">
                <button className="chart-delete-button" onClick={() => onDelete(chartConfig.id)} title="Delete Chart">
                    <Icon name="fa-xmark" />
                </button>
            </div>
            <div className="chart-canvas-container" style={{height: 'calc(100% - 29px)'}}>
                <canvas ref={chartRef}></canvas>
            </div>
            <div 
                className="chart-resize-handle se"
                onMouseDown={handleResizeMouseDown}
            ></div>
        </div>
    );
};