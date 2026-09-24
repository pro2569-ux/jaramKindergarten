import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonStyleOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

/**
 * 버튼 모양 클래스. <button>(Button) 과 <a>(ButtonLink) 가 같은 모양을 공유한다.
 * - primary: 노란 배경 + on-primary(진한 회색) 글자 (흰 글자는 대비 1.3:1 로 미달)
 * - 포커스 링은 primary-ink
 */
export function buttonClasses({ variant = 'primary', size = 'md', className }: ButtonStyleOptions = {}) {
  return cn(
    'inline-flex items-center justify-center rounded-control font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    {
      'bg-primary text-on-primary hover:bg-primary-dark': variant === 'primary',
      'bg-secondary text-on-primary hover:bg-secondary-dark': variant === 'secondary',
      'border border-border bg-surface text-body hover:bg-gray-50': variant === 'outline',
      'text-body hover:bg-gray-100': variant === 'ghost',
      'h-9 px-3 text-sm': size === 'sm',
      'h-11 px-5 text-base': size === 'md',
      'h-14 px-8 text-lg': size === 'lg',
    },
    className
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button ref={ref} className={buttonClasses({ variant, size, className })} {...props}>
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
