export function Button({ children, variant = 'primary', className = '', onClick, disabled, type = 'button', ...props }) {
  const base = 'inline-flex items-center justify-center transition-all duration-150 font-body font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-accent text-white text-sm px-5 py-[11px] rounded-full hover:bg-accent-2 active:scale-[0.97]',
    secondary: 'bg-transparent border border-[var(--color-border)] text-ink text-sm px-5 py-[10px] rounded-full hover:bg-surface-2',
    ghost: 'bg-transparent text-ink-2 text-sm px-3 py-2 rounded-full hover:bg-surface-2',
    white: 'bg-white text-accent text-sm px-4 py-2 rounded-full hover:bg-accent-light font-medium',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
