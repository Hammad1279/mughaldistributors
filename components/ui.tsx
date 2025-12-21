import React from 'react';

// --- ICONS ---
// Using Google's Material Symbols and Font Awesome, loaded via CDN in index.html
export const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => {
  if (name.startsWith('fa-')) {
    // For Font Awesome icons, e.g., "fa-solid fa-pencil"
    return <i className={`fa-solid ${name} ${className}`}></i>;
  }
  // For Google Material Symbols
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
};


// --- CARD ---
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
}
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = '', onClick, style, onMouseLeave, onMouseMove }, ref) => (
  <div 
    ref={ref}
    className={`bg-slate-800/50 border border-slate-700/50 rounded-2xl shadow-lg transition-all duration-300 ${className}`}
    onClick={onClick}
    style={style}
    onMouseLeave={onMouseLeave}
    onMouseMove={onMouseMove}
  >
    {children}
  </div>
));

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'toolbar';
  className?: string;
  icon?: string;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', className = '', icon, ...props }, ref) => {
    const baseClasses = 'px-5 py-2.5 rounded-md font-semibold flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = {
      primary: 'bg-violet-600 hover:bg-violet-500 text-white shadow-sm focus-visible:ring-violet-500',
      secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium focus-visible:ring-slate-500',
      danger: 'bg-red-600 hover:bg-red-500 text-white shadow-sm focus-visible:ring-red-500',
      success: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm focus-visible:ring-emerald-500',
      warning: 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm focus-visible:ring-amber-500',
      toolbar: 'bg-slate-700 hover:bg-slate-600 text-slate-200 focus-visible:ring-slate-500 !py-1.5 !px-3 !text-sm !shadow-sm',
    };

    return (
      <button ref={ref} className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
        {icon && <Icon name={icon} className={children != null ? "mr-2" : ""} />}
        {children != null && <span>{children}</span>}
      </button>
    );
  }
);

// --- INPUT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    variant?: 'default' | 'grid';
}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, id, variant = 'default', className, ...props }, ref) => {
    
    const baseClasses = "w-full text-slate-200 transition";
    
    const variantClasses = {
        default: 'p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
        grid: 'p-1 bg-transparent border-0 border-b-2 border-transparent text-center focus:outline-none focus:border-violet-500 focus:bg-slate-700/50 rounded-none'
    };

    const Tag = label ? 'div' : React.Fragment;
    const tagProps = label ? {} : { as: React.Fragment };

    return (
        <Tag {...tagProps}>
            {label && <label htmlFor={id} className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>}
            <input
                id={id}
                ref={ref}
                className={`${baseClasses} ${variantClasses[variant]} ${className}`}
                {...props}
            />
        </Tag>
    );
});

// --- SEARCH INPUT ---
interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
    placeholder: string;
    className?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
    ({ value, onChange, onClear, placeholder, className = '', ...props }, ref) => {
    return (
        <form 
            className={`search-form ${className}`} 
            onSubmit={(e) => e.preventDefault()}
        >
            <button type="button" aria-label="Search icon">
                <svg width="17" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="search">
                    <path d="M7.667 12.667A5.333 5.333 0 107.667 2a5.333 5.333 0 000 10.667zM14.334 14l-2.9-2.9" stroke="currentColor" strokeWidth="1.333" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
            </button>
            <input
                ref={ref}
                className="input"
                placeholder={placeholder}
                type="text"
                value={value}
                onChange={onChange}
                autoComplete="off"
                {...props}
            />
            <button className="reset" type="button" aria-label="Clear search" onClick={onClear}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </form>
    );
});


// --- TEXTAREA ---
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, id, className, ...props }, ref) => (
    <div>
        {label && <label htmlFor={id} className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>}
        <textarea
            id={id}
            ref={ref}
            rows={3}
            className={`w-full p-3 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition custom-scrollbar ${className}`}
            {...props}
        />
    </div>
));


// --- MODAL ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  const [isRendered, setIsRendered] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
    }
  }, [isOpen]);

  // Listen for Escape key to trigger close
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleAnimationEnd = () => {
    // When the exit animation finishes, remove the component from the DOM
    if (!isOpen) {
      setIsRendered(false);
    }
  };

  if (!isRendered) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOpen ? 'animate-modal-bg' : 'animate-modal-bg-out'}`}
      onClick={onClose}
      onAnimationEnd={handleAnimationEnd}
    >
      <div
        className={`bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg m-4 ${isOpen ? 'animate-modal-content' : 'animate-modal-content-out'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-100">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl transition-colors">
              <Icon name="close" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

// --- TOGGLE SWITCH ---
interface ToggleSwitchProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
}
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange, className }) => (
    <label className={`flex items-center justify-between cursor-pointer ${className}`}>
        <span className="font-medium text-slate-300">{label}</span>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
            <div className={`block w-14 h-8 rounded-full transition ${checked ? 'bg-violet-600' : 'bg-slate-700'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${checked ? 'translate-x-6' : ''}`}></div>
        </div>
    </label>
);