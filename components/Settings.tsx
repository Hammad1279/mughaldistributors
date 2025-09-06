import React, { useMemo, useEffect, useRef } from 'react';
import { Card, Icon, Button, Input } from './ui';
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
        setActiveView, importData, clearAllData, billLayoutSettings, updateBillLayoutSettings,
        exportData
    } = useAppContext();

    const highlights = useMemo(() => {
        if (!finalizedBills || finalizedBills.length === 0) {
            return { topProduct: null, topStore: null };
        }

        const productQuantities = new Map<string, number>();
        finalizedBills.forEach(bill => {
            bill.items.forEach(item => {
                const currentQty = productQuantities.get(item.id) || 0;
                productQuantities.set(item.id, currentQty + item.quantity);
            });
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
                maxRevenue = store.total;
                topStore = store;
            }
        }

        return { topProduct, topStore };
    }, [finalizedBills, medicines, medicalStores]);

    const handleExport = () => {
        try {
            const dataToExport = exportData();
            const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `mughal_os_backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
            addNotification("Data exported successfully!", "success");
        } catch(e) {
             addNotification("Error exporting data.", "error");
             console.error(e);
        }
    };
    
    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File is not readable");
                const data = JSON.parse(text);

                if (window.confirm("This will OVERWRITE your personal data (prices, bills, stores) and MERGE the shared medicine list. This cannot be undone. Are you sure you want to proceed?")) {
                    addNotification("Importing data... Please wait.", "info");
                    
                    importData(data);
                                        
                    addNotification("Data imported successfully! The app will now reload.", "success");
                    setTimeout(() => window.location.reload(), 1500);
                }
            } catch (err) {
                console.error("Import failed", err);
                addNotification("Import failed. The file may be invalid.", "error");
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const triggerImport = () => {
        document.getElementById('import-file-input')?.click();
    };

    const handleClearData = () => {
        if(window.confirm("DANGER: This will delete ALL data for your user account (bills, stores, suppliers, and your personal medicine prices/discounts). The shared medicine inventory for ALL users will NOT be affected. This cannot be undone.")){
             if(window.confirm("FINAL CONFIRMATION: Are you absolutely sure you want to erase your personal data?")){
                addNotification("Deleting user data...", "warning");
                clearAllData(false); // False means do NOT clear shared data
            }
        }
    }


    return (
        <div className="p-4 md:p-6 animate-fade-in space-y-8">
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
                        <div className="space-y-6">
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
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4 text-violet-300">Data Management</h2>
                        <p className="text-slate-400 mb-6">Export all your data to a JSON file for backup, or import data from a backup file. Be careful, importing will overwrite existing data.</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button onClick={handleExport} variant="success" className="w-full" icon="download">Export All Data</Button>
                            <Button onClick={triggerImport} variant="secondary" className="w-full" icon="upload">Import Data</Button>
                            <input type="file" id="import-file-input" className="hidden" accept=".json" onChange={handleImport} />
                        </div>
                    </Card>

                    <Card className="p-6 border-red-500/50">
                        <h2 className="text-xl font-semibold mb-4 text-red-400">Danger Zone</h2>
                        <p className="text-slate-400 mb-6">Clearing all data is an irreversible action. It will reset your account to its initial state. The shared inventory of medicine names for all users will NOT be affected. Please export your data first if you want to keep a backup.</p>
                         <Button onClick={handleClearData} variant="danger" className="w-full" icon="warning">Clear My Data</Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}