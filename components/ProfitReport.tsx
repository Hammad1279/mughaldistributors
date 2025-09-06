import React, { useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../App';
import { Card, Icon } from './ui';

declare var Chart: any;

const ProfitChart: React.FC<{ data: { labels: string[], data: number[] } }> = ({ data: chartData }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    useEffect(() => {
        if (!chartRef.current) return;
        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;
        
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const gradient = ctx.createLinearGradient(0, 0, 0, chartRef.current.offsetHeight);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.6)'); // Emerald
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Profit',
                    data: chartData.data,
                    backgroundColor: gradient,
                    borderColor: '#34d399', // emerald-400
                    borderWidth: 2,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#34d399',
                    pointHoverBackgroundColor: '#34d399',
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
                        backgroundColor: '#1e293b',
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
                        grid: { color: 'rgba(51, 65, 85, 0.5)' },
                        ticks: { color: '#94a3b8', font: { family: 'Inter' } },
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(51, 65, 85, 0.5)' },
                        ticks: {
                            color: '#94a3b8',
                            font: { family: 'Inter' },
                            callback: (value: any) => `Rs ${typeof value === 'number' ? (value / 1000).toFixed(1) : 0}k`
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
            <h3 className="text-xl font-bold text-emerald-300 mb-1">Daily Profit (Last 30 Days)</h3>
            <p className="text-slate-400 text-sm mb-4">Track your daily profit trends.</p>
            <div className="relative h-72">
                <canvas ref={chartRef}></canvas>
            </div>
        </Card>
    );
};

const RankedList: React.FC<{ title: string; icon: string; data: { name: string; value: number }[]; unit: string }> = ({ title, icon, data, unit }) => (
    <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
            <Icon name={icon} className="text-2xl text-violet-400" />
            <h3 className="text-xl font-bold text-violet-300">{title}</h3>
        </div>
        <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2">
            {data.length > 0 ? (
                <ul className="space-y-3">
                    {data.map((item, index) => (
                        <li key={index} className="flex justify-between items-center text-sm">
                            <span className="font-medium text-slate-200 truncate pr-4">{index + 1}. {item.name}</span>
                            <span className="font-bold text-emerald-400 whitespace-nowrap">{unit} {item.value.toFixed(2)}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-slate-500 text-center py-8">No data available.</p>
            )}
        </div>
    </Card>
);

export default function ProfitReport() {
    const { finalizedBills } = useAppContext();

    const profitData = useMemo(() => {
        let totalProfit = 0;
        let totalSales = 0;
        const productProfit = new Map<string, { name: string, profit: number }>();
        const storeProfit = new Map<string, { name: string, profit: number }>();

        // For chart
        const dailyProfits = new Map<string, number>();

        finalizedBills.forEach(bill => {
            totalSales += bill.grandTotal;
            const billDateStr = new Date(bill.date).toISOString().split('T')[0];

            let billProfit = 0;

            bill.items.forEach(item => {
                const purchaseDiscount = item.purchaseDiscount ?? 0;
                const saleDiscount = item.discountValue ?? 0;
                const profitMargin = purchaseDiscount - saleDiscount;
                const itemProfit = (item.mrp * item.quantity * profitMargin) / 100;
                
                billProfit += itemProfit;

                // Aggregate by product
                const currentProduct = productProfit.get(item.id) || { name: item.name, profit: 0 };
                currentProduct.profit += itemProfit;
                productProfit.set(item.id, currentProduct);
            });
            
            totalProfit += billProfit;
            
            // Aggregate by store
            const currentStore = storeProfit.get(bill.storeId) || { name: bill.storeName, profit: 0 };
            currentStore.profit += billProfit;
            storeProfit.set(bill.storeId, currentStore);

            // Aggregate by day for chart
            const currentDaily = dailyProfits.get(billDateStr) || 0;
            dailyProfits.set(billDateStr, currentDaily + billProfit);
        });

        const topProducts = Array.from(productProfit.values())
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 10)
            .map(p => ({ name: p.name, value: p.profit }));

        const topStores = Array.from(storeProfit.values())
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 10)
            .map(s => ({ name: s.name, value: s.profit }));

        // Chart data calculation
        const chartLabels: string[] = [];
        const chartDataPoints: number[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            chartLabels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            chartDataPoints.push(dailyProfits.get(dateStr) || 0);
        }

        return {
            totalProfit,
            totalSales,
            profitMargin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
            topProducts,
            topStores,
            chartData: { labels: chartLabels, data: chartDataPoints }
        };
    }, [finalizedBills]);

    return (
        <div className="p-4 md:p-6 animate-fade-in space-y-8">
            <header>
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Profit Report</h1>
                <p className="text-slate-400 mt-1">An overview of your business profitability.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-5">
                    <p className="text-sm font-medium text-slate-400">Total Profit</p>
                    <p className="text-3xl font-bold text-emerald-400 mt-1">Rs {profitData.totalProfit.toFixed(2)}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm font-medium text-slate-400">Total Sales</p>
                    <p className="text-3xl font-bold text-violet-400 mt-1">Rs {profitData.totalSales.toFixed(2)}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm font-medium text-slate-400">Overall Profit Margin</p>
                    <p className="text-3xl font-bold text-amber-400 mt-1">{profitData.profitMargin.toFixed(2)}%</p>
                </Card>
            </div>

            <ProfitChart data={profitData.chartData} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RankedList title="Most Profitable Products" icon="inventory_2" data={profitData.topProducts} unit="Rs" />
                <RankedList title="Most Profitable Customers" icon="storefront" data={profitData.topStores} unit="Rs" />
            </div>
        </div>
    );
}
