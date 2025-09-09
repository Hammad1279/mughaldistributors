
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Card, Icon, Button, Input, Modal } from './ui';
import { useAppContext } from '../App';
import { Medicine, MedicalStore, FinalizedBill, Supplier, FinalizedPurchase } from '../types';
import { ToggleSwitch } from './ui';

declare var Chart: any;

// --- Sales Chart Component (from former Dashboard) ---
const SalesChart = () => {
    const { finalizedBills } = useAppContext();
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    const chartData = useMemo(() => {
        const labels: string[] = [];
        const data: number[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            data.push(0);
        }

        finalizedBills.forEach(bill => {
            const billDate = new Date(bill.date);
            billDate.setHours(0, 0, 0, 0);
            
            const diffTime = today.getTime() - billDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays < 30) {
                const index = 29 - diffDays;
                data[index] += bill.grandTotal;
            }
        });

        return { labels, data };
    }, [finalizedBills]);

    useEffect(() => {
        if (!chartRef.current) return;

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;
        
        if(chartInstance.current) {
            chartInstance.current.destroy();
        }

        const gradient = ctx.createLinearGradient(0, 0, 0, chartRef.current.offsetHeight);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.6)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Revenue',
                    data: chartData.data,
                    backgroundColor: gradient,
                    borderColor: '#a78bfa', // violet-300
                    borderWidth: 2,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#a78bfa',
                    pointHoverBackgroundColor: '#a78bfa',
                    pointHoverBorderColor: '#fff',
                    tension: 0.4,
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b', // slate-800
                        titleFont: { family: 'Inter', weight: 'bold', size: 14 },
                        bodyFont: { family: 'Inter', size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: (context: any) => `Rs ${context.raw.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(51, 65, 85, 0.5)' }, // slate-700
                        ticks: { color: '#94a3b8', font: { family: 'Inter' } }, // slate-400
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(51, 65, 85, 0.5)' }, // slate-700
                        ticks: { 
                            color: '#94a3b8', // slate-400
                            font: { family: 'Inter' },
                            callback: (value: any) => `Rs ${value / 1000}k`
                        },
                    }
                }
            }
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };

    }, [chartData]);
    
    return (
        <Card className="p-6" style={{ animation: 'chartFadeIn 0.8s ease-out forwards' }}>
            <h3 className="text-xl font-bold text-violet-300 mb-1">Last 30 Days Revenue</h3>
            <p className="text-slate-400 text-sm mb-4">Performance overview of your recent sales.</p>
            <div className="relative h-72">
                <canvas ref={chartRef}></canvas>
            </div>
        </Card>
    );
};


export default function Settings() {
    const { 
        addNotification, medicines, finalizedBills, medicalStores,
        setActiveView, clearAllData, billLayoutSettings, updateBillLayoutSettings,
        downloadBackup, initiateImport
    } = useAppContext();
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const highlights = useMemo(() => {
        if (!finalizedBills || finalizedBills.length === 0) {
            return { topProduct: null, topStore: null };
        }

        const productQuantities = new Map<string, number>();
        finalizedBills.forEach(bill => {
            if (Array.isArray(bill.items)) {
                bill.items.forEach(item => {
                    const currentQty = productQuantities.get(item.id) || 0;
                    productQuantities.set(item.id, currentQty + item.quantity);
                });
            }
        });

        let topProductId: string | null = null;
        let maxQuantity = 0;
        for (const [id, quantity] of productQuantities.entries()) {
            if (quantity > maxQuantity) {
                maxQuantity = quantity;
                topProductId = id;
            }
        }
        const topProductInfo = topProductId ? medicines.find(m => m.id === topProductId) : null;
        const topProduct = topProductInfo ? { name: topProductInfo.name, quantity: maxQuantity } : null;

        const storeRevenues = new Map<string, { name: string, total: number }>();
        finalizedBills.forEach(bill => {
            const current = storeRevenues.get(bill.storeId) || { name: bill.storeName, total: 0 };
            current.total += bill.grandTotal;
            storeRevenues.set(bill.storeId, current);
        });
        
        let topStore: { name: string; total: number } | null = null;
        let maxRevenue = 0;
        for (const store of storeRevenues.values()) {
            if (store.total > maxRevenue) {
                // FIX: The original code had a type error (maxRevenue = store) and a logic bug (topStore was not assigned).
                maxRevenue = store.total;
                topStore = store;
            }
        }

        return { topProduct, topStore };
    }, [finalizedBills, medicines]);

    const handleClearData = () => {
        if(window.confirm("DANGER: This will delete ALL data for your user account (bills, stores, suppliers, and your personal medicine prices/discounts). The shared medicine inventory for ALL users will NOT be affected. This cannot be undone.")){
             if(window.confirm("FINAL CONFIRMATION: Are you absolutely sure you want to erase your personal data?")){
                addNotification("Deleting user data...", "warning");
                clearAllData(false); // False means do NOT clear shared data
            }
        }
    }
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            initiateImport(e.target.files[0]);
        }
        e.target.value = ''; // Reset input so the same file can be selected again
    };

    return (
        <div 
            className="p-4 md:p-6 animate-fade-in space-y-8 relative"
        >
            <input type="file" ref={fileInputRef} accept=".json" style={{ display: 'none' }} onChange={handleFileSelect} />
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Overview & Settings</h1>
                <p className="text-slate-400 mt-1">Review your business performance and manage application data.</p>
            </div>
            
            <div className="space-y-6">
                <SalesChart />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Card 
                        className="p-6 cursor-pointer hover:bg-slate-700/50 hover:border-amber-600/50 transition-all duration-300"
                        onClick={() => setActiveView('inventory')}
                    >
                        <div className="flex items-start gap-4">
                            <Icon name="trophy" className="text-3xl text-amber-400 mt-1" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-400">Top Selling Product</p>
                                {highlights.topProduct ? (
                                    <>
                                        <p className="text-2xl font-bold mt-1 text-amber-300 truncate" title={highlights.topProduct.name}>{highlights.topProduct.name}</p>
                                        <p className="text-sm text-slate-300 mt-1">{highlights.topProduct.quantity} units sold</p>
                                    </>
                                ) : (
                                    <p className="text-lg text-slate-500 mt-2">No sales data yet.</p>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card 
                        className="p-6 cursor-pointer hover:bg-slate-700/50 hover:border-emerald-600/50 transition-all duration-300"
                        onClick={() => setActiveView('manage-stores')}
                    >
                        <div className="flex items-start gap-4">
                            <Icon name="star" className="text-3xl text-emerald-400 mt-1" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-400">Most Valuable Customer</p>
                                {highlights.topStore ? (
                                    <>
                                        <p className="text-2xl font-bold mt-1 text-emerald-300 truncate" title={highlights.topStore.name}>{highlights.topStore.name}</p>
                                        <p className="text-sm text-slate-300 mt-1">Rs {highlights.topStore.total.toFixed(2)} in sales</p>
                                    </>
                                ) : (
                                    <p className="text-lg text-slate-500 mt-2">No sales data yet.</p>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="pt-8 border-t border-slate-700/50">
                 <div className="max-w-2xl mx-auto space-y-8">
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4 text-violet-300">Bill Layout Customization</h2>
                        <p className="text-slate-400 mb-6">Control which elements are visible on your printed and downloaded bills.</p>
                        <div className="space-y-4">
                            <Input label="Distributor Name" value={billLayoutSettings.distributorName} onChange={e => updateBillLayoutSettings({ distributorName: e.target.value })} />
                            <Input label="Distributor Title" value={billLayoutSettings.distributorTitle} onChange={e => updateBillLayoutSettings({ distributorTitle: e.target.value })} />
                            <Input label="Address Line 1" value={billLayoutSettings.distributorAddressLine1} onChange={e => updateBillLayoutSettings({ distributorAddressLine1: e.target.value })} />
                            <Input label="Address Line 2" value={billLayoutSettings.distributorAddressLine2} onChange={e => updateBillLayoutSettings({ distributorAddressLine2: e.target.value })} />
                            <Input label="Phone Number" value={billLayoutSettings.phoneNumber} onChange={e => updateBillLayoutSettings({ phoneNumber: e.target.value })} />
                            <Input label="Footer Text (Optional)" value={billLayoutSettings.footerText || ''} onChange={e => updateBillLayoutSettings({ footerText: e.target.value })} />
                            <div className='pt-4 mt-4 border-t border-slate-700 space-y-4'>
                                <ToggleSwitch
                                    label="Show Phone Number on Bill"
                                    checked={billLayoutSettings.showPhoneNumber}
                                    onChange={(checked) => updateBillLayoutSettings({ showPhoneNumber: checked })}
                                />
                                <ToggleSwitch
                                    label="Show Bill Date on Bill"
                                    checked={billLayoutSettings.showBillDate}
                                    onChange={(checked) => updateBillLayoutSettings({ showBillDate: checked })}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4 text-violet-300">Data Management</h2>
                        <p className="text-slate-400 mb-6">Use these tools to backup your data to a local file or restore it from a backup.</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full" icon="upload">Import Data</Button>
                            <Button onClick={downloadBackup} variant="success" className="w-full" icon="download">Export Data</Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
