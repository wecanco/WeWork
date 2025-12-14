import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import './StrategyCard.css'

function StrategyCard({ 
  strategy, 
  onEdit, 
  onBacktest, 
  onHistory, 
  onDelete,
  showOwner = true 
}) {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  
  const isOwner = strategy.is_owner
  const isPublic = strategy.is_public
  const isSystemStrategy = !strategy.owner_id // استراتژی‌های عمومی سیستم (بدون مالک)
  // ادمین‌ها فقط می‌توانند استراتژی‌های خودشان یا استراتژی‌های عمومی سیستم را ویرایش کنند
  const canEdit = strategy.can_edit !== undefined ? strategy.can_edit : (isOwner || (isAdmin && isSystemStrategy))
  const canDelete = (isAdmin || isOwner) && !isPublic
  
  // اگر استراتژی متعلق به کاربر نباشد و ادمین نباشد، بجای دکمه ویرایش، دکمه مشاهده نمایش داده می‌شود
  const shouldShowViewButton = !isOwner && !isAdmin

  const handleOwnerClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (strategy.owner?.id) {
      navigate(`/user/${strategy.owner.id}`)
    } else if (strategy.owner?.username) {
      navigate(`/user/${strategy.owner.username}`)
    }
  }

  return (
    <div className="strategy-card">
      <div className="strategy-card-header">
        <h3>{strategy.name}</h3>
        <div className="strategy-actions">
          {canEdit && onEdit && (
            <button 
              className="btn-edit"
              onClick={() => onEdit(strategy)}
            >
              ویرایش
            </button>
          )}
          {shouldShowViewButton && onEdit && (
            <button 
              className="btn-view"
              onClick={() => onEdit(strategy)}
            >
              مشاهده
            </button>
          )}
          {onBacktest && (
            <button 
              className="btn-backtest"
              onClick={() => onBacktest(strategy)}
            >
              بک تست
            </button>
          )}
          {onHistory && (
            <button 
              className="btn-history"
              onClick={() => onHistory(strategy)}
            >
              تاریخچه
            </button>
          )}
          {canDelete && onDelete && (
            <button 
              className="btn-delete"
              onClick={() => onDelete(strategy.id, strategy.name)}
            >
              حذف
            </button>
          )}
        </div>
      </div>
      <p className="strategy-description">
        {strategy.description || 'بدون توضیحات'}
      </p>
      {showOwner && strategy.owner && (
        <div className="strategy-owner">
          <span className="owner-label">سازنده:</span>
          <button 
            className="owner-link"
            onClick={handleOwnerClick}
          >
            {strategy.owner.full_name || strategy.owner.username || 'کاربر ناشناس'}
          </button>
        </div>
      )}
      <div className="strategy-meta">
        <span>
          تاریخ ایجاد: {new Date(strategy.created_at).toLocaleDateString('fa-IR')}
        </span>
        <span>
          تاریخ بروزرسانی: {new Date(strategy.updated_at).toLocaleDateString('fa-IR')}
        </span>
        {isPublic && (
          <span className="strategy-tag strategy-tag-public">
            استراتژی عمومی
          </span>
        )}
      </div>
    </div>
  )
}

export default StrategyCard

