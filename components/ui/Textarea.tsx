import { TextareaHTMLAttributes, forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = useId()
    const textareaId = id ?? generatedId
    const errorId = `${textareaId}-error`

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="mb-2 block text-sm font-medium text-body">
            {label}
            {props.required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full resize-none rounded-control border border-border bg-surface px-4 py-2 text-body transition-colors placeholder:text-disabled focus:border-primary-ink focus:outline-none focus:ring-2 focus:ring-primary-ink/30',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30',
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export default Textarea
