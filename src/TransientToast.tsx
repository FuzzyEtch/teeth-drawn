import { useEffect } from 'react'
import './TransientToast.css'

const AUTO_DISMISS_MS = 5000

type TransientToastProps = {
  message: string
  onDismiss: () => void
}

export function TransientToast({ message, onDismiss }: TransientToastProps) {
  useEffect(() => {
    const id = window.setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => window.clearTimeout(id)
  }, [message, onDismiss])

  return (
    <div className="transient-toast" role="alert">
      <p className="transient-toast-message">{message}</p>
      <button
        type="button"
        className="transient-toast-close"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
