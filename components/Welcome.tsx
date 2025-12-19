import React, { useRef } from 'react';
import { useAppContext } from '../App';
import { Card, Icon } from './ui';

interface WelcomeCardProps {
    title: string;
    description: string;
    icon: string;
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    colorClass: string;
    className?: string;
    style?: React.CSSProperties;
}

const WelcomeCard: React.FC<WelcomeCardProps> = ({ title, description, icon, onClick, colorClass, className, style }) => {
    const magneticContentRef = useRef<HTMLDivElement>(null);
    const animationFrameId = useRef<number | null>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const card = e.currentTarget;
        const content = magneticContentRef.current;
        if (!content) return;

        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }

        animationFrameId.current = requestAnimationFrame(() => {
            const rect = card.getBoundingClientRect();
            const cardCenterX = rect.width / 2;
            const cardCenterY = rect.height / 2;
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const deltaX = mouseX - cardCenterX;
            const deltaY = mouseY - cardCenterY;
            const pullFactor = 0.2;
            const translateX = deltaX * pullFactor;
            const translateY = deltaY * pullFactor;
            content.style.transform = `translate(${translateX}px, ${translateY}px)`;
        });
    };

    const handleMouseLeave = () => {
        const content = magneticContentRef.current;
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
        if (content) {
            content.style.transform = 'translate(0px, 0px)';
        }
    };

    return (
        <Card
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`p-8 cursor-pointer group hover:bg-slate-700/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl ${colorClass} ${className}`}
            style={style}
        >
            <div 
                ref={magneticContentRef}
                className="magnetic-content"
            >
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6">
                        <Icon name={icon} className="text-6xl text-slate-300 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
                    <p className="text-slate-400 max-w-xs">{description}</p>
                </div>
            </div>
        </Card>
    );
};

export default function Welcome({ isExiting }: { isExiting?: boolean }) {
    const { navigateToSection } = useAppContext();

    return (
        <div className={`h-full flex flex-col items-center justify-center p-4 md:p-6 animate-fade-in space-y-8 ${isExiting ? 'welcome-is-exiting' : ''}`}>
            <div className="text-center">
                <h1 className="text-5xl font-extrabold text-white tracking-tight">Welcome to Mughal OS</h1>
                <p className="text-xl text-slate-400 mt-2">Select an operation to begin.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
                <WelcomeCard
                    title="Sales"
                    description="Manage customer stores, create new bills, and view past invoices."
                    icon="point_of_sale"
                    onClick={(e) => navigateToSection('sales', e.currentTarget)}
                    colorClass="hover:border-emerald-500/50"
                    className="animate-card-enter"
                    style={{ animationDelay: '100ms' }}
                />
                <WelcomeCard
                    title="Purchase"
                    description="Manage suppliers, enter new stock purchases, and view purchase history."
                    icon="local_shipping"
                    onClick={(e) => navigateToSection('purchase', e.currentTarget)}
                    colorClass="hover:border-violet-500/50"
                    className="animate-card-enter"
                    style={{ animationDelay: '200ms' }}
                />
                <WelcomeCard
                    title="Reports"
                    description="View sales charts, performance metrics, and business overviews."
                    icon="pie_chart"
                    onClick={(e) => navigateToSection('reports', e.currentTarget)}
                    colorClass="hover:border-blue-500/50"
                    className="animate-card-enter"
                    style={{ animationDelay: '300ms' }}
                />
            </div>
        </div>
    );
}