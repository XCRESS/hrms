import * as React from "react"
import { X } from "lucide-react"

const ToastProvider = React.createContext({
  toast: () => {},
  dismiss: () => {},
})

export function useToast() {
  return React.useContext(ToastProvider)
}

// Helper function to create variant classes
const toastVariants = (variant = "default") => {
  const baseClasses = "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 shadow-lg transition-all backdrop-blur-sm"
  
  const variantClasses = {
    default: "border bg-white/98 text-foreground dark:bg-slate-800/98 dark:border-slate-700 shadow-md",
    success: "success group border-green-500 bg-green-50/98 text-green-900 dark:bg-green-900/90 dark:text-green-50 dark:border-green-900/50 shadow-md",
    error: "error group border-red-500 bg-red-50/98 text-red-900 dark:bg-red-900/90 dark:text-red-50 dark:border-red-900/50 shadow-md",
    info: "info group border-blue-500 bg-blue-50/98 text-blue-900 dark:bg-blue-900/90 dark:text-blue-50 dark:border-blue-900/50 shadow-md",
    warning: "warning group border-yellow-500 bg-yellow-50/98 text-yellow-900 dark:bg-yellow-900/90 dark:text-yellow-50 dark:border-yellow-900/50 shadow-md",
  }
  
  return `${baseClasses} ${variantClasses[variant] || variantClasses.default}`
}

export const Toaster = ({ children }) => {
  const [state, dispatch] = React.useReducer(
    (state, action) => {
      switch (action.type) {
        case "ADD_TOAST": {
          const id = action.toast.id || String(Date.now())
          return {
            ...state,
            toasts: [...state.toasts, { ...action.toast, id }],
          }
        }
        case "DISMISS_TOAST": {
          return {
            ...state,
            toasts: state.toasts.filter((toast) => toast.id !== action.id),
          }
        }
        default:
          return state;
      }
    },
    { toasts: [] }
  )

  const toast = React.useCallback((props) => {
    const id = props.id || String(Date.now())
    dispatch({ type: "ADD_TOAST", toast: { ...props, id } })

    if (props.duration !== Infinity) {
      setTimeout(() => {
        dispatch({ type: "DISMISS_TOAST", id })
      }, props.duration || 5000)
    }
  }, [])

  const dismiss = React.useCallback((id) => {
    dispatch({ type: "DISMISS_TOAST", id })
  }, [])

  return (
    <ToastProvider value={{ toast, dismiss }}>
      {children}
      {state.toasts.length > 0 && (
        <div className="toast-container fixed bottom-5 left-5 z-50 flex flex-col gap-3 w-full max-w-md animate-in slide-in-from-bottom-5 drop-shadow-lg">
          {state.toasts.map((toast) => (
            <Toast key={toast.id} {...toast} onDismiss={() => dismiss(toast.id)} />
          ))}
        </div>
      )}
    </ToastProvider>
  )
}

const Toast = ({
  variant = "default",
  title,
  description,
  action,
  onDismiss,
}) => {
  return (
    <div className={toastVariants(variant)}>
      <div className="flex-1">
        {title && <div className="text-sm font-semibold">{title}</div>}
        {description && <div className="text-sm font-medium opacity-100">{description}</div>}
      </div>
      <div className="flex items-center gap-2">
        {action}
        <button
          onClick={onDismiss}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground/60 hover:text-foreground dark:text-slate-300 dark:hover:text-slate-100"
        >
          <X size={16} />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  )
}

export { Toast } 