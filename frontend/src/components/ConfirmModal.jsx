import React, { createContext, useContext, useState, useCallback } from 'react'
import { AlertTriangle, Info, HelpCircle } from 'lucide-react'
import './ConfirmModal.css'

const ConfirmModalContext = createContext()

export const useConfirm = () => {
  const context = useContext(ConfirmModalContext)
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmModalProvider')
  }
  return context.confirm
}

export const ConfirmModalProvider = ({ children }) => {
  const [modal, setModal] = useState(null)

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setModal({
        message,
        title: options.title || 'تایید عملیات',
        confirmText: options.confirmText || 'تایید',
        cancelText: options.cancelText || 'لغو',
        type: options.type || 'warning',
        onConfirm: () => {
          setModal(null)
          resolve(true)
        },
        onCancel: () => {
          setModal(null)
          resolve(false)
        },
      })
    })
  }, [])

  return (
    <ConfirmModalContext.Provider value={{ confirm }}>
      {children}
      {modal && <ConfirmModal {...modal} />}
    </ConfirmModalContext.Provider>
  )
}

const ConfirmModal = ({
  message,
  title,
  confirmText,
  cancelText,
  type,
  onConfirm,
  onCancel,
}) => {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  const getIcon = () => {
    const iconProps = { size: 24 }
    switch (type) {
      case 'danger':
        return <AlertTriangle {...iconProps} />
      case 'warning':
        return <AlertTriangle {...iconProps} />
      case 'info':
        return <Info {...iconProps} />
      default:
        return <HelpCircle {...iconProps} />
    }
  }

  return (
    <div className="confirm-modal-backdrop" onClick={handleBackdropClick}>
      <div className="confirm-modal">
        <div className={`confirm-modal-header confirm-modal-${type}`}>
          <div className="confirm-modal-icon">{getIcon()}</div>
          <h3 className="confirm-modal-title">{title}</h3>
        </div>
        <div className="confirm-modal-body">
          <p className="confirm-modal-message">{message}</p>
        </div>
        <div className="confirm-modal-footer">
          <button className="confirm-modal-btn confirm-modal-btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`confirm-modal-btn confirm-modal-btn-confirm confirm-modal-btn-${type}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

