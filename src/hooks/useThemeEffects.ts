import { useEffect } from 'react'

export function usePrefersColorSchemeSync(args: {
    setIsDarkMode: (v: boolean) => void
}) {
    const { setIsDarkMode } = args

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        const handleThemeChange = (e: MediaQueryListEvent) => {
            const savedTheme = localStorage.getItem('theme')
            if (savedTheme === null) {
                setIsDarkMode(e.matches)
                document.documentElement.classList.toggle('dark', e.matches)
            }
        }

        const savedTheme = localStorage.getItem('theme')
        if (savedTheme === null) {
            setIsDarkMode(mediaQuery.matches)
            document.documentElement.classList.toggle('dark', mediaQuery.matches)
        } else {
            const isDark = JSON.parse(savedTheme)
            document.documentElement.classList.toggle('dark', isDark)
        }

        mediaQuery.addEventListener('change', handleThemeChange)
        return () => {
            mediaQuery.removeEventListener('change', handleThemeChange)
        }
    }, [setIsDarkMode])
}

export function useApplyThemeClasses(args: { isDarkMode: boolean }) {
    const { isDarkMode } = args

    useEffect(() => {
        document.body.classList.toggle('dark-theme', isDarkMode)
        document.documentElement.classList.toggle('dark', isDarkMode)
    }, [isDarkMode])
}
