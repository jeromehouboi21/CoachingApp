export function Avatar({ name, size = 'md', className = '' }) {
  const initial = name ? name[0].toUpperCase() : '?'
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-11 h-11 text-base',
    lg: 'w-[72px] h-[72px] text-2xl',
  }
  return (
    <div className={`rounded-full bg-accent text-white flex items-center justify-center font-display font-normal ${sizes[size]} ${className}`}>
      {initial}
    </div>
  )
}
