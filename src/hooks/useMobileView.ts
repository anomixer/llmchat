import { useEffect, useState } from 'react'

export function useMobileView(breakpointPx = 768) {
    const [isMobileView, setIsMobileView] = useState(false)

    useEffect(() => {
        const checkMobileView = () => {
            setIsMobileView(window.innerWidth < breakpointPx)
        }

        checkMobileView()
        window.addEventListener('resize', checkMobileView)
        return () => window.removeEventListener('resize', checkMobileView)
    }, [breakpointPx])

    return isMobileView
}
