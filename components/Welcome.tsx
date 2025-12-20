
import React from 'react';
import { useAppContext } from '../App';
import { Icon } from './ui';
import DarkVeil from './DarkVeil';
import TiltedCard from './TiltedCard';
import ClickSpark from './ClickSpark';
import GradientText from './GradientText';

export default function Welcome({ isExiting }: { isExiting?: boolean }) {
    const { navigateToSection } = useAppContext();

    return (
        <div className={`relative h-full w-full overflow-hidden ${isExiting ? 'welcome-is-exiting' : ''}`}>
            <ClickSpark
                sparkColor="#a78bfa"
                sparkSize={12}
                sparkRadius={25}
                sparkCount={8}
                duration={400}
            >
                <div className="absolute inset-0 z-0">
                    <DarkVeil />
                </div>
                <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 md:p-6 animate-fade-in space-y-8">
                    <div className="text-center cursor-default flex flex-col items-center">
                        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 mb-2">
                            <span className="text-5xl md:text-6xl font-extrabold tracking-tight font-['Outfit'] text-white">
                                Welcome to
                            </span>
                            <GradientText 
                                colors={['#a78bfa', '#c4b5fd', '#f472b6', '#c4b5fd', '#a78bfa']} 
                                animationSpeed={6}
                                className="text-5xl md:text-6xl font-extrabold tracking-tight font-['Outfit']"
                            >
                                Mughal OS
                            </GradientText>
                        </div>
                        <div className="text-xl text-slate-400 mt-2 font-['Outfit']">
                            Select an operation to begin.
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl place-items-center">
                        
                        <TiltedCard
                            containerHeight="300px"
                            containerWidth="300px"
                            imageHeight="300px"
                            imageWidth="300px"
                            rotateAmplitude={12}
                            scaleOnHover={1.05}
                            showMobileWarning={false}
                            showTooltip={false}
                            displayOverlayContent={true}
                            imgClassName="bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-emerald-500/30 shadow-2xl backdrop-blur-md"
                            onClick={(e) => navigateToSection('sales', e.currentTarget)}
                            className="animate-card-enter cursor-pointer"
                            style={{ animationDelay: '100ms' }}
                            overlayContent={
                                <div className="text-center p-6 flex flex-col items-center h-full justify-center">
                                    <Icon name="point_of_sale" className="text-6xl text-emerald-400 mb-4 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                                    <h2 className="text-3xl font-bold text-white mb-2">Sales</h2>
                                    <p className="text-slate-300 text-sm">Manage customer stores, create new bills, and view past invoices.</p>
                                </div>
                            }
                        />

                        <TiltedCard
                            containerHeight="300px"
                            containerWidth="300px"
                            imageHeight="300px"
                            imageWidth="300px"
                            rotateAmplitude={12}
                            scaleOnHover={1.05}
                            showMobileWarning={false}
                            showTooltip={false}
                            displayOverlayContent={true}
                            imgClassName="bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-violet-500/30 shadow-2xl backdrop-blur-md"
                            onClick={(e) => navigateToSection('purchase', e.currentTarget)}
                            className="animate-card-enter cursor-pointer"
                            style={{ animationDelay: '200ms' }}
                            overlayContent={
                                <div className="text-center p-6 flex flex-col items-center h-full justify-center">
                                    <Icon name="local_shipping" className="text-6xl text-violet-400 mb-4 drop-shadow-[0_0_15px_rgba(167,139,250,0.5)]" />
                                    <h2 className="text-3xl font-bold text-white mb-2">Purchase</h2>
                                    <p className="text-slate-300 text-sm">Manage suppliers, enter new stock purchases, and view purchase history.</p>
                                </div>
                            }
                        />

                        <TiltedCard
                            containerHeight="300px"
                            containerWidth="300px"
                            imageHeight="300px"
                            imageWidth="300px"
                            rotateAmplitude={12}
                            scaleOnHover={1.05}
                            showMobileWarning={false}
                            showTooltip={false}
                            displayOverlayContent={true}
                            imgClassName="bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-blue-500/30 shadow-2xl backdrop-blur-md"
                            onClick={(e) => navigateToSection('reports', e.currentTarget)}
                            className="animate-card-enter cursor-pointer"
                            style={{ animationDelay: '300ms' }}
                            overlayContent={
                                <div className="text-center p-6 flex flex-col items-center h-full justify-center">
                                    <Icon name="pie_chart" className="text-6xl text-blue-400 mb-4 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" />
                                    <h2 className="text-3xl font-bold text-white mb-2">Reports</h2>
                                    <p className="text-slate-300 text-sm">View sales charts, performance metrics, and business overviews.</p>
                                </div>
                            }
                        />

                    </div>
                </div>
            </ClickSpark>
        </div>
    );
}
