import { useEffect } from 'react'

export function useOutsideClickClosePanels(args: {
    showConversations: boolean
    showSettings: boolean
    setShowConversations: (v: boolean) => void
    setShowSettings: (v: boolean) => void
}) {
    const { showConversations, showSettings, setShowConversations, setShowSettings } = args

    useEffect(() => {
        const handleClickOutside = (event: Event) => {
            const menu = document.getElementById('export-menu')
            const exportButton = document.querySelector('[data-button="export"]')
            if (menu && exportButton && !menu.contains(event.target as Node) && !exportButton.contains(event.target as Node)) {
                menu.classList.add('hidden')
            }

            const conversationsPanel = document.querySelector('[data-panel="conversations"]')
            const conversationsButton = document.querySelector('[data-button="conversations"]')
            if (
                showConversations &&
                conversationsPanel &&
                !conversationsPanel.contains(event.target as Node) &&
                (!conversationsButton || !conversationsButton.contains(event.target as Node))
            ) {
                setShowConversations(false)
            }

            const settingsPanel = document.querySelector('[data-panel="settings"]')
            const settingsButton = document.querySelector('[data-button="settings"]')
            const modelButton = document.querySelector('[data-button="model"]')
            if (
                showSettings &&
                settingsPanel &&
                !settingsPanel.contains(event.target as Node) &&
                (!settingsButton || !settingsButton.contains(event.target as Node)) &&
                (!modelButton || !modelButton.contains(event.target as Node))
            ) {
                setShowSettings(false)
            }

            const modelMenu = document.getElementById('model-menu')
            if (modelMenu && modelButton && !modelMenu.contains(event.target as Node) && !modelButton.contains(event.target as Node)) {
                modelMenu.classList.add('hidden')
            }

            const mobileMenu = document.querySelector('[data-mobile-menu]')
            const mobileMenuButton = document.querySelector('[data-mobile-menu-button]')
            if (mobileMenu && mobileMenuButton && !mobileMenu.contains(event.target as Node) && !mobileMenuButton.contains(event.target as Node)) {
                window.dispatchEvent(new CustomEvent('closeMobileMenu'))
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('touchstart', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
        }
    }, [setShowConversations, setShowSettings, showConversations, showSettings])
}
