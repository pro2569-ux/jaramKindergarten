import Link from 'next/link'
import { AnchorHTMLAttributes } from 'react'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './Button'

interface ButtonLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string
  variant?: ButtonVariant
  size?: ButtonSize
}

/**
 * 버튼처럼 보이는 링크. <Link><Button/></Link> 중첩(a > button) 대신 사용한다.
 */
export default function ButtonLink({ href, variant, size, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </Link>
  )
}
