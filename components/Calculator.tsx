import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface CalculatorProps {
    isOpen: boolean;
    onClose: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ isOpen, onClose }) => {
    const [display, setDisplay] = useState('0');
    const [currentValue, setCurrentValue] = useState<number | null>(null);
    const [operator, setOperator] = useState<string | null>(null);
    const [waitingForOperand, setWaitingForOperand] = useState(true);

    const calculatorRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: window.innerWidth / 2 - 105, y: window.innerHeight / 2 - 165 });
    const [size, setSize] = useState({ width: 210, height: 330 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });

    const displayRef = useRef<HTMLDivElement>(null);
    
    const scaleFactor = useMemo(() => size.width / 240.0, [size.width]);

    const dynamicStyles = useMemo(() => {
        return {
            '--calc-padding': `${10 * scaleFactor}px`,
            '--calc-border-radius': `${24 * scaleFactor}px`,
            '--calc-display-padding': `0 ${15 * scaleFactor}px`,
            '--calc-display-font-size': `${60 * scaleFactor}px`,
            '--calc-gap': `${10 * scaleFactor}px`,
            '--calc-btn-font-size': `${26 * scaleFactor}px`,
            '--calc-btn-light-gray-font-size': `${22 * scaleFactor}px`,
            '--calc-zero-btn-padding': `${22 * scaleFactor}px`,
            '--calc-close-btn-size': `${18 * scaleFactor}px`,
            '--calc-close-btn-font-size': `${12 * scaleFactor}px`,
        };
    }, [scaleFactor]);

    // Reset everything
    const clearAll = useCallback(() => {
        setDisplay('0');
        setCurrentValue(null);
        setOperator(null);
        setWaitingForOperand(true);
    }, []);

    const handleClearClick = () => {
        clearAll();
    };

    const handleBackspace = () => {
        if (waitingForOperand) return;
        setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    };
    
    const performCalculation = (left: number, right: number, op: string): number => {
        switch (op) {
            case '+': return left + right;
            case '-': return left - right;
            case '×':
            case '*': return left * right;
            case '÷':
            case '/': 
                if (right === 0) return Infinity; // Handle division by zero
                return left / right;
            default: return right;
        }
    };

    const inputPercent = () => {
        const displayValue = parseFloat(display);
        if (currentValue !== null && operator && !waitingForOperand) {
            const percentOfBase = currentValue * (displayValue / 100);
            const result = performCalculation(currentValue, percentOfBase, operator);
            setDisplay(String(result));
            setCurrentValue(result);
            setOperator(null);
            setWaitingForOperand(true);
        } else {
            setDisplay(String(displayValue / 100));
            setWaitingForOperand(true);
        }
    };

    const inputDigit = (digit: string) => {
        if (waitingForOperand) {
            setDisplay(digit);
            setWaitingForOperand(false);
        } else {
            if (display.length >= 15) return;
            setDisplay(display === '0' ? digit : display + digit);
        }
    };

    const inputDecimal = () => {
        if (waitingForOperand) {
            setDisplay('0.');
            setWaitingForOperand(false);
            return;
        }
        if (!display.includes('.')) {
            setDisplay(display + '.');
        }
    };
    
    const handleOperator = (nextOperator: string) => {
        const inputValue = parseFloat(display);
    
        if (currentValue === null) {
            setCurrentValue(inputValue);
        } else if (operator && !waitingForOperand) {
            const result = performCalculation(currentValue, inputValue, operator);
            setCurrentValue(result);
            setDisplay(String(result));
        }
    
        setWaitingForOperand(true);
        if (nextOperator === '=' || nextOperator === 'Enter') {
            setOperator(null);
        } else {
            setOperator(nextOperator);
        }
    };
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            // Prevent calculator from capturing keyboard input when user is typing in another field.
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
                return;
            }

            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                inputDigit(e.key);
            } else if (e.key === '.') {
                e.preventDefault();
                inputDecimal();
            } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
                e.preventDefault();
                handleOperator(e.key === '*' ? '×' : e.key === '/' ? '÷' : e.key);
            } else if (e.key === 'Enter' || e.key === '=') {
                e.preventDefault();
                handleOperator('=');
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                handleBackspace();
            } else if (e.key.toLowerCase() === 'c' || e.key === 'Delete') {
                e.preventDefault();
                handleClearClick();
            } else if (e.key === '%') {
                e.preventDefault();
                inputPercent();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, operator, display, currentValue, waitingForOperand, onClose, clearAll]);
    
    // Dynamic font size adjustment
    useEffect(() => {
        if (displayRef.current) {
            const textElement = displayRef.current.querySelector('.calc-display-text') as HTMLElement;
            if (!textElement) return;

            textElement.style.transform = 'scale(1)';
            const containerPadding = 2 * (15 * scaleFactor);
            const containerWidth = displayRef.current.clientWidth - containerPadding;
            const textWidth = textElement.scrollWidth;
            
            let scale = 1;
            if (textWidth > containerWidth && containerWidth > 0) {
                scale = containerWidth / textWidth;
            }
            textElement.style.transform = `scale(${scale})`;
        }
    }, [display, size, scaleFactor]);


    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button, .calc-resize-handle')) return;
        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
        e.preventDefault();
    };
    
    const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = size.width;
        const startHeight = size.height;

        const doDrag = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            const newHeight = startHeight + (moveEvent.clientY - startY);
            setSize({
                width: Math.max(150, newWidth),
                height: Math.max(250, newHeight),
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
            if (!isDragging) return;
            setPosition({
                x: e.clientX - dragStartPos.current.x,
                y: e.clientY - dragStartPos.current.y,
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
    }, [isDragging]);
    
    if (!isOpen) return null;
    
    const formattedDisplay = display === 'Infinity' ? 'Error' : parseFloat(display).toLocaleString('en', { maximumFractionDigits: 8 });

    return (
        <div 
            ref={calculatorRef}
            className="fixed z-[120] animate-modal-content ios-calculator-container"
            style={{ 
                left: position.x, 
                top: position.y, 
                width: size.width, 
                height: size.height,
                ...dynamicStyles
            } as React.CSSProperties}
            onMouseDown={handleMouseDown}
        >
            <div className="ios-calculator" style={{ width: '100%', height: '100%' }}>
                 <button className="calc-close-btn" onClick={onClose} aria-label="Close calculator">×</button>
                <div ref={displayRef} className="calc-display">
                    <div className="calc-display-text">{formattedDisplay}</div>
                </div>
                <div className="buttons">
                    <button onClick={handleClearClick} className="calc-btn btn-light-gray">AC</button>
                    <button onClick={handleBackspace} className="calc-btn btn-light-gray">⌫</button>
                    <button onClick={inputPercent} className="calc-btn btn-light-gray">%</button>
                    <button onClick={() => handleOperator('÷')} className={`calc-btn btn-orange ${operator === '÷' ? 'active-op' : ''}`}>÷</button>

                    <button onClick={() => inputDigit('7')} className="calc-btn btn-dark-gray">7</button>
                    <button onClick={() => inputDigit('8')} className="calc-btn btn-dark-gray">8</button>
                    <button onClick={() => inputDigit('9')} className="calc-btn btn-dark-gray">9</button>
                    <button onClick={() => handleOperator('×')} className={`calc-btn btn-orange ${operator === '×' ? 'active-op' : ''}`}>×</button>

                    <button onClick={() => inputDigit('4')} className="calc-btn btn-dark-gray">4</button>
                    <button onClick={() => inputDigit('5')} className="calc-btn btn-dark-gray">5</button>
                    <button onClick={() => inputDigit('6')} className="calc-btn btn-dark-gray">6</button>
                    <button onClick={() => handleOperator('-')} className={`calc-btn btn-orange ${operator === '-' ? 'active-op' : ''}`}>-</button>

                    <button onClick={() => inputDigit('1')} className="calc-btn btn-dark-gray">1</button>
                    <button onClick={() => inputDigit('2')} className="calc-btn btn-dark-gray">2</button>
                    <button onClick={() => inputDigit('3')} className="calc-btn btn-dark-gray">3</button>
                    <button onClick={() => handleOperator('+')} className={`calc-btn btn-orange ${operator === '+' ? 'active-op' : ''}`}>+</button>

                    <button onClick={() => inputDigit('0')} className="calc-btn btn-dark-gray btn-span-2">0</button>
                    <button onClick={inputDecimal} className="calc-btn btn-dark-gray">.</button>
                    <button onClick={() => handleOperator('=')} className="calc-btn btn-orange">=</button>
                </div>
                <div className="calc-resize-handle" onMouseDown={handleResizeMouseDown}></div>
            </div>
        </div>
    );
};

export default Calculator;