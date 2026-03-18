export function Badge({ children, variant = 'free', className = '' }) {
  const variants = {
    free: 'bg-accent-light text-accent',
    premium: 'bg-premium-light text-premium',
    pro: 'bg-premium-light text-premium',
  }
  return (
    <span className={`inline-flex items-center px-[10px] py-[3px] rounded-full text-[11px] font-medium tracking-[0.04em] uppercase ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
