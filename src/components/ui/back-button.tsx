"use client"

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ButtonProps } from '@/components/ui/button'

interface BackButtonProps extends ButtonProps {
  children: React.ReactNode
}

export function BackButton({ children, ...props }: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    router.back()
  }

  return (
    <Button {...props} onClick={handleBack}>
      {children}
    </Button>
  )
}

