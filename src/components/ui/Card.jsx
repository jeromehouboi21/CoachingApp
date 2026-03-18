export function Card({ children, className = '', onClick, ...props }) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-[var(--color-border)] rounded-lg p-5 shadow-sm ${onClick ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
