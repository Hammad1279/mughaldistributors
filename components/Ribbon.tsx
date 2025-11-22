
import React, { useState, useRef, useEffect } from 'react';
import { CellStyle } from '../types';
import { Icon } from './ui';

interface RibbonProps {
    selectedStyle: CellStyle;
    onStyleChange: (styleChange: Partial<CellStyle>) => void;
    onInsertChart: () => void;
    onRowAction: (action: 'add_above' | 'add_below' | 'delete') => void;
    onColAction: (action: 'add_left' | 'add_right' | 'delete') => void;
    onFormatPainter: () => void;
    formatPainterActive: boolean;
    onClear: (type: 'all' | 'formats' | 'contents') => void;
}

const FONT_FAMILIES = [
    'Arial', 'Calibri', 'Times New Roman', 'Courier New', 'Verdana', 
    'Georgia', 'Garamond', 'Comic Sans MS', 'Impact'
];
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

const THEME_COLORS = [
    ['#ffffff', '#000000', '#eeece1', '#1f497d', '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646'],
    ['#f2f2f2', '#7f7f7f', '#ddd9c3', '#c6d9f0', '#dbe5f1', '#f2dcdb', '#ebf1dd', '#e5e0ec', '#dbeef3', '#fdeada'],
    ['#d8d8d8', '#595959', '#c4bc96', '#8db3e2', '#b8cce4', '#e5b9b7', '#d7e3bc', '#ccc1d9', '#b7dde8', '#fbd5b5'],
    ['#bfbfbf', '#3f3f3f', '#938953', '#548dd4', '#95b3d7', '#d99694', '#c3d69b', '#b2a2c7', '#92cddc', '#fac08f'],
    ['#a5a5a5', '#262626', '#494429', '#17365d', '#366092', '#953734', '#76923c', '#5f497a', '#31859b', '#e36c09'],
    ['#7f7f7f', '#0c0c0c', '#1d1b10', '#0f243e', '#244061', '#632423', '#4f6128', '#3f3151', '#205867', '#974806']
];

const STANDARD_COLORS = ['#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0'];


const RibbonDropdown: React.FC<{
    children: React.ReactNode;
    content: React.ReactNode;
    title?: string;
    className?: string;
    disabled?: boolean;
    onClose?: () => void;
}> = ({ children, content, title, className, disabled=false, onClose }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                if (onClose) onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleToggle = () => {
        const shouldOpen = !isOpen;
        setIsOpen(shouldOpen);
        if (!shouldOpen && onClose) {
            onClose();
        }
    }
    
    return (
        <div ref={containerRef} className={`ribbon-dropdown-container ${className || ''}`}>
            <div onClick={handleToggle} title={title}>
                {children}
            </div>
            {isOpen && !disabled && <div className="ribbon-dropdown-content" onClick={() => {setIsOpen(false); if (onClose) onClose();}}>{content}</div>}
        </div>
    );
};


const ColorPalette: React.FC<{ onSelect: (color: string) => void; onNoFill: () => void }> = ({ onSelect, onNoFill }) => (
    <div className="color-palette-dropdown">
        <h4>Theme Colors</h4>
        <div className="color-palette-grid">
            {THEME_COLORS.flat().map((color, i) => (
                <div key={i} className="color-palette-item" style={{ backgroundColor: color }} onClick={() => onSelect(color)}></div>
            ))}
        </div>
        <h4>Standard Colors</h4>
        <div className="color-palette-grid" style={{ gridTemplateColumns: 'repeat(10, 1fr)'}}>
            {STANDARD_COLORS.map((color, i) => (
                <div key={i} className="color-palette-item" style={{ backgroundColor: color }} onClick={() => onSelect(color)}></div>
            ))}
        </div>
        <div className="dropdown-separator"></div>
        <button className="color-palette-button ribbon-button" onClick={onNoFill}>No Fill</button>
    </div>
);


const ColorPicker: React.FC<{
    icon: React.ReactElement<{ name: string }>;
    color: string | undefined;
    onChange: (color: string) => void;
    onNoColor: () => void;
    title?: string;
}> = ({ icon, color, onChange, onNoColor, title }) => {
    const isFillIcon = icon.props.name.includes('fill');
    const defaultColor = isFillIcon ? '#FFFFFF' : '#000000';
    const finalColor = color === 'transparent' ? defaultColor : (color || defaultColor);
    
    const content = <ColorPalette onSelect={onChange} onNoFill={onNoColor} />;

    return (
        <RibbonDropdown content={content} title={title} className="ribbon-color-picker">
            <button className="color-picker-main ribbon-button">
                {icon}
                <div className="color-swatch-display" style={{ backgroundColor: finalColor }}></div>
            </button>
            <button className="color-picker-arrow ribbon-button">
                <Icon name="fa-caret-down" className="!text-xs" />
            </button>
        </RibbonDropdown>
    );
};

export const Ribbon: React.FC<RibbonProps> = ({ 
    selectedStyle, 
    onStyleChange, 
    onInsertChart: _onInsertChart,
    onRowAction,
    onColAction,
    onFormatPainter,
    formatPainterActive,
    onClear
}) => {
    const [fontSizeInput, setFontSizeInput] = useState<string | number>(selectedStyle.fontSize || 11);

    useEffect(() => {
        setFontSizeInput(selectedStyle.fontSize || 11);
    }, [selectedStyle.fontSize]);
    
    const handleFontSizeChange = (val: string) => {
        setFontSizeInput(val);
        const num = parseInt(val);
        if (!isNaN(num) && num > 0) {
            onStyleChange({ fontSize: num });
        }
    };

    const toggleStyle = (key: keyof CellStyle, activeValue: any, inactiveValue: any) => {
        onStyleChange({ [key]: selectedStyle[key] === activeValue ? inactiveValue : activeValue });
    };

    return (
        <div className="spreadsheet-ribbon">
            <div className="ribbon-group">
                <div className="ribbon-group-content">
                    <button className="ribbon-button ribbon-button-large" title="Paste" disabled>
                        <Icon name="fa-paste" className="icon"/>
                        <span className="label">Paste</span>
                    </button>
                    <div className="ribbon-column">
                        <button className="ribbon-button flex justify-start w-full" title="Cut (Not Implemented)"><Icon name="fa-cut" className="icon mr-2"/>Cut</button>
                        <button className="ribbon-button flex justify-start w-full" title="Copy (Not Implemented)"><Icon name="fa-copy" className="icon mr-2"/>Copy</button>
                        <button className={`ribbon-button flex justify-start w-full ${formatPainterActive ? 'format-painter-active' : ''}`} onClick={onFormatPainter} title="Format Painter"><Icon name="fa-paintbrush" className="icon mr-2"/><span className="label text-left leading-tight">Format<br/>Painter</span></button>
                    </div>
                </div>
                <div className="ribbon-group-label">Clipboard</div>
            </div>

            <div className="ribbon-group">
                <div className="ribbon-group-content flex-col items-start gap-1">
                    <div className="font-picker-row">
                        <RibbonDropdown
                            content={
                                <ul className="font-list-dropdown custom-scrollbar">
                                    <h4>Theme Fonts</h4>
                                    <li onClick={() => onStyleChange({fontFamily: 'Calibri'})} style={{fontFamily: 'Calibri'}}>Calibri</li>
                                    <div className="dropdown-separator"></div>
                                    <h4>All Fonts</h4>
                                    {FONT_FAMILIES.map(font => <li key={font} onClick={() => onStyleChange({fontFamily: font})} style={{fontFamily: font}}>{font}</li>)}
                                </ul>
                            }
                        >
                             <div className="font-picker-container">
                                <input type="text" readOnly value={selectedStyle.fontFamily || 'Calibri'}/>
                                <button className="dropdown-trigger"><Icon name="fa-caret-down" className="!text-xs" /></button>
                            </div>
                        </RibbonDropdown>
                        
                        <RibbonDropdown
                            content={
                                <ul>
                                    {FONT_SIZES.map(size => <li key={size} className={selectedStyle.fontSize === size ? 'active' : ''} onClick={() => onStyleChange({ fontSize: size })}>{size}</li>)}
                                </ul>
                            }
                             onClose={() => setFontSizeInput(selectedStyle.fontSize || 11)}
                        >
                            <div className="font-size-container">
                                <input 
                                    type="number" 
                                    value={fontSizeInput} 
                                    onChange={e => setFontSizeInput(e.target.value)}
                                    onBlur={e => handleFontSizeChange(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleFontSizeChange((e.target as HTMLInputElement).value)}
                                />
                                <button className="dropdown-trigger"><Icon name="fa-caret-down" className="!text-xs" /></button>
                            </div>
                        </RibbonDropdown>

                        <div className="flex items-center ml-1">
                            <button className="ribbon-button" title="Increase Font Size (Not Implemented)"><Icon name="fa-arrow-up-a-z" className="icon !text-lg" /></button>
                            <button className="ribbon-button" title="Decrease Font Size (Not Implemented)"><Icon name="fa-arrow-down-z-a" className="icon !text-lg" /></button>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <button className={`ribbon-button ${selectedStyle.fontWeight === 'bold' ? 'active' : ''}`} onClick={() => toggleStyle('fontWeight', 'bold', 'normal')} title="Bold (Ctrl+B)"><Icon name="fa-bold" className="icon"/></button>
                        <button className={`ribbon-button ${selectedStyle.fontStyle === 'italic' ? 'active' : ''}`} onClick={() => toggleStyle('fontStyle', 'italic', 'normal')} title="Italic (Ctrl+I)"><Icon name="fa-italic" className="icon"/></button>
                        
                        <RibbonDropdown
                           content={
                                <ul>
                                    <li onClick={() => onStyleChange({textDecoration: 'underline'})}> <Icon name="fa-underline" className="icon !text-base mr-2"/> Underline</li>
                                    <li onClick={() => onStyleChange({textDecoration: 'underline double'})}> <Icon name="fa-underline" className="icon !text-base mr-2"/> Double Underline</li>
                                </ul>
                           }
                        >
                           <button className={`ribbon-button ${selectedStyle.textDecoration?.includes('underline') ? 'active' : ''}`} onClick={() => toggleStyle('textDecoration', 'underline', 'none')} title="Underline (Ctrl+U)"><Icon name="fa-underline" className="icon"/></button>
                        </RibbonDropdown>

                        <button className="ribbon-button" title="Borders (Not Implemented)" disabled><Icon name="fa-border-all" className="icon"/></button>
                        <ColorPicker icon={<Icon name="fa-fill-drip" className="icon"/>} color={selectedStyle.backgroundColor} onChange={color => onStyleChange({ backgroundColor: color })} onNoColor={() => onStyleChange({backgroundColor: 'transparent'})} title="Fill Color" />
                        <ColorPicker icon={<Icon name="fa-font" className="icon"/>} color={selectedStyle.color} onChange={color => onStyleChange({ color: color })} onNoColor={() => onStyleChange({color: '#000000'})} title="Font Color" />
                    </div>
                </div>
                <div className="ribbon-group-label">Font</div>
            </div>
            
            <div className="ribbon-group">
                <div className="ribbon-group-content">
                   <div className="ribbon-column justify-start pt-1">
                       <div className="alignment-grid">
                            <button className={`ribbon-button ${selectedStyle.verticalAlign === 'top' ? 'active' : ''}`} onClick={() => onStyleChange({ verticalAlign: 'top' })} title="Top Align"><Icon name="fa-align-left" className="icon rotate-90 origin-center" /></button>
                            <button className={`ribbon-button ${selectedStyle.verticalAlign === 'middle' ? 'active' : ''}`} onClick={() => onStyleChange({ verticalAlign: 'middle' })} title="Middle Align"><Icon name="fa-align-center" className="icon rotate-90 origin-center" /></button>
                            <button className={`ribbon-button ${selectedStyle.verticalAlign === 'bottom' ? 'active' : ''}`} onClick={() => onStyleChange({ verticalAlign: 'bottom' })} title="Bottom Align"><Icon name="fa-align-right" className="icon rotate-90 origin-center" /></button>
                            <button className={`ribbon-button ${selectedStyle.textAlign === 'left' ? 'active' : ''}`} onClick={() => onStyleChange({ textAlign: 'left' })} title="Align Left"><Icon name="fa-align-left" className="icon"/></button>
                            <button className={`ribbon-button ${selectedStyle.textAlign === 'center' ? 'active' : ''}`} onClick={() => onStyleChange({ textAlign: 'center' })} title="Center"><Icon name="fa-align-center" className="icon"/></button>
                            <button className={`ribbon-button ${selectedStyle.textAlign === 'right' ? 'active' : ''}`} onClick={() => onStyleChange({ textAlign: 'right' })} title="Align Right"><Icon name="fa-align-right" className="icon"/></button>
                       </div>
                   </div>
                    <div className="ribbon-column justify-start pt-1 ml-2">
                         <button className="ribbon-button" title="Merge & Center (Not Implemented)"><Icon name="fa-table-cells" className="icon mr-1"/><span className="label text-left leading-tight">Merge<br/>&amp; Center</span></button>
                         <button className={`ribbon-button ${selectedStyle.whiteSpace === 'normal' ? 'active' : ''}`} onClick={() => toggleStyle('whiteSpace', 'normal', 'nowrap')} title="Wrap Text"><Icon name="fa-align-justify" className="icon mr-1"/>Wrap Text</button>
                    </div>
                </div>
                 <div className="ribbon-group-label">Alignment</div>
            </div>

            <div className="ribbon-group">
                 <div className="ribbon-group-content flex-col items-start">
                    <RibbonDropdown disabled content={<ul><li>General</li></ul>} title="Number Format (Not Implemented)">
                        <button className="ribbon-button w-full justify-start px-2">General <Icon name="fa-caret-down" className="ml-auto !text-xs" /></button>
                    </RibbonDropdown>
                    <div className="flex items-center mt-1">
                         <button className="ribbon-button" title="Accounting Format (Not Implemented)"><Icon name="fa-dollar-sign" className="icon" /></button>
                         <button className="ribbon-button" title="Percent Style (Not Implemented)"><Icon name="fa-percent" className="icon"/></button>
                         <button className="ribbon-button" title="Comma Style (Not Implemented)"><i className="fa-solid fa-comma"></i></button>
                         <button className="ribbon-button" title="Increase Decimal (Not Implemented)"><Icon name="fa-arrow-left-long" className="icon"/><span>.00</span></button>
                         <button className="ribbon-button" title="Decrease Decimal (Not Implemented)"><span>.00</span><Icon name="fa-arrow-right-long" className="icon"/></button>
                    </div>
                 </div>
                <div className="ribbon-group-label">Number</div>
            </div>

            <div className="ribbon-group">
                 <div className="ribbon-group-content">
                    <button className="ribbon-button-large" title="Conditional Formatting (Not Implemented)"><Icon name="fa-table-list" className="icon"/><span className="label text-center">Conditional<br/>Formatting</span></button>
                    <button className="ribbon-button-large" title="Format as Table (Not Implemented)"><Icon name="fa-table-cells-large" className="icon"/><span className="label text-center">Format as<br/>Table</span></button>
                    <button className="ribbon-button-large" title="Cell Styles (Not Implemented)"><Icon name="fa-swatchbook" className="icon"/><span className="label text-center">Cell<br/>Styles</span></button>
                 </div>
                <div className="ribbon-group-label">Styles</div>
            </div>

            <div className="ribbon-group">
                <div className="ribbon-group-content">
                     <RibbonDropdown content={
                        <ul>
                            <li onClick={() => onRowAction('add_below')}>Insert Sheet Rows</li>
                            <li onClick={() => onColAction('add_right')}>Insert Sheet Columns</li>
                        </ul>} title="Insert">
                        <button className="ribbon-button-large"><Icon name="fa-table-rows" className="icon"/><span className="label">Insert</span></button>
                    </RibbonDropdown>
                    <RibbonDropdown content={
                        <ul>
                            <li onClick={() => onRowAction('delete')}>Delete Sheet Rows</li>
                            <li onClick={() => onColAction('delete')}>Delete Sheet Columns</li>
                        </ul>} title="Delete">
                        <button className="ribbon-button-large"><Icon name="fa-table-columns" className="icon"/><span className="label">Delete</span></button>
                    </RibbonDropdown>
                    <button className="ribbon-button-large" title="Format (Not Implemented)"><Icon name="fa-ruler-combined" className="icon"/><span className="label">Format</span></button>
                </div>
                <div className="ribbon-group-label">Cells</div>
            </div>

            <div className="ribbon-group">
                <div className="ribbon-group-content">
                     <div className="ribbon-column justify-start pt-1">
                         <RibbonDropdown disabled content={<ul><li>Sum</li></ul>} title="AutoSum (Not Implemented)" >
                            <button className="ribbon-button w-full justify-start"><Icon name="fa-calculator" className="icon mr-1"/> AutoSum <Icon name="fa-caret-down" className="fa-xs ml-1"/> </button>
                         </RibbonDropdown>
                         <RibbonDropdown disabled content={<ul><li>Down</li></ul>} title="Fill (Not Implemented)">
                            <button className="ribbon-button w-full justify-start"><Icon name="fa-fill" className="icon mr-1"/> Fill <Icon name="fa-caret-down" className="fa-xs ml-1"/></button>
                         </RibbonDropdown>
                        <RibbonDropdown content={
                            <ul>
                                <li onClick={() => onClear('all')}>Clear All</li>
                                <li onClick={() => onClear('formats')}>Clear Formats</li>
                                <li onClick={() => onClear('contents')}>Clear Contents</li>
                            </ul>
                        } title="Clear">
                           <button className="ribbon-button w-full justify-start"><Icon name="fa-eraser" className="icon mr-1"/> Clear <Icon name="fa-caret-down" className="fa-xs ml-1"/></button>
                        </RibbonDropdown>
                     </div>
                     <div className="ribbon-column justify-start pt-1">
                        <RibbonDropdown disabled content={<ul><li>Sort A to Z</li></ul>} title="Sort & Filter (Not Implemented)">
                            <button className="ribbon-button flex-col"><Icon name="fa-filter" className="icon text-2xl"/><span className="label text-center leading-tight">Sort<br/>&amp; Filter</span></button>
                        </RibbonDropdown>
                        <RibbonDropdown disabled content={<ul><li>Find</li></ul>} title="Find & Select (Not Implemented)">
                           <button className="ribbon-button flex-col"><Icon name="fa-magnifying-glass" className="icon text-2xl"/><span className="label text-center leading-tight">Find &<br/>Select</span></button>
                        </RibbonDropdown>
                     </div>
                </div>
                <div className="ribbon-group-label">Editing</div>
            </div>
        </div>
    );
};
