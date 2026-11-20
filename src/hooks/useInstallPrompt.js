// Paket P: Installations-Angebot je Gerät (Android/Desktop-Prompt, iOS-Anleitung, In-App-Browser-Umweg).
import { useCallback, useEffect, useState } from 'react'
import { subscribeInstall, getDeferredPrompt, clearDeferredPrompt } from '../lib/installPrompt'
import { createLogger } from '../lib/logger'

const logger = createLogger('pwa')
const LAUNCH_KEY = 'fs_pwa_launch_logged_v1'

export function getInstallContext() {
  const ua = navigator.userAgent || ''
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches === true
    || window.navigator.standalone === true                                   // iOS
  const ios = /iphone|ipad|ipod/i.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)     // iPadOS
  const inApp = /LinkedInApp|Instagram|FBAN|FBAV/i.test(ua)                   // In-App-Browser können nicht installieren
  return { standalone, ios, inApp }
}

// mode: 'installed' | 'open_in_browser' | 'prompt' | 'ios_manual' | 'unsupported'
export function useInstallPrompt() {
  const [ctx] = useState(getInstallContext)
  const [, force] = useState(0)
  useEffect(() => subscribeInstall(() => force((n) => n + 1)), [])

  const deferred = getDeferredPrompt()
  const mode = ctx.standalone ? 'installed'
    : ctx.inApp ? 'open_in_browser'
    : deferred ? 'prompt'
    : ctx.ios ? 'ios_manual'
    : 'unsupported'

  const install = useCallback(async () => {
    const d = getDeferredPrompt()
    if (!d) return 'unavailable'
    try {
      d.prompt()
      const { outcome } = await d.userChoice                                    // 'accepted' | 'dismissed'
      clearDeferredPrompt()
      logger.info('pwa_install_choice', { outcome: outcome === 'accepted' ? 'accepted' : 'dismissed' })
      return outcome
    } catch (e) {
      logger.warn('pwa_install_prompt_failed', { errorType: e?.name ?? 'Error' })
      return 'failed'
    }
  }, [])

  return { mode, install }
}

/** Einmal pro Gerät melden, dass die installierte App gestartet wurde (nur die Zahl, keine Gerätedaten). */
export function logStandaloneLaunchOnce() {
  if (!getInstallContext().standalone) return
  try {
    if (localStorage.getItem(LAUNCH_KEY) === '1') return
    localStorage.setItem(LAUNCH_KEY, '1')
  } catch {
    return   // ohne Speicher lieber gar nicht melden als bei jedem Start
  }
  logger.info('pwa_launched_standalone')
}
