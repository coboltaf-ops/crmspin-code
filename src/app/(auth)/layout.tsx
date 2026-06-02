'use client'

import { useState, useEffect } from 'react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [returnUrl, setReturnUrl] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const ret = params.get('returnUrl')
    if (ret) {
      sessionStorage.setItem('crm-return-url', ret)
      setReturnUrl(ret)
    } else {
      const savedRet = sessionStorage.getItem('crm-return-url')
      if (savedRet) {
        setReturnUrl(savedRet)
      }
    }
  }, [])

  return <>{children}</>
}
