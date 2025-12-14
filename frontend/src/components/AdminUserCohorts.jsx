import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config'

export default function AdminUserCohorts() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    axios
      .get(`${API_BASE_URL}/admin/user-metrics`)
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(
          err?.response?.data?.detail || 'خطا در دریافت متریک‌های رفتار کاربر'
        )
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="admin-panel-loading">در حال بارگذاری...</div>
  if (error) return <div className="error-text admin-panel-error">{error}</div>

  const {
    total_users,
    users_with_backtest,
    users_with_payment,
    avg_days_to_first_backtest,
    avg_days_to_first_payment,
  } = data || {}

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <h1>User Cohorts & Activation</h1>
        <p>درک این‌که کاربران چقدر سریع فعال و تبدیل به مشتری پولی می‌شوند</p>
      </div>

      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <span className="admin-kpi-label">کل کاربران</span>
          <span className="admin-kpi-value">
            {total_users?.toLocaleString('fa-IR') ?? '-'}
          </span>
        </div>
        <div className="admin-kpi-card">
          <span className="admin-kpi-label">کاربرانی که حداقل یک بک‌تست دارند</span>
          <span className="admin-kpi-value">
            {users_with_backtest?.toLocaleString('fa-IR') ?? '-'}
          </span>
        </div>
        <div className="admin-kpi-card">
          <span className="admin-kpi-label">کاربرانی که پرداخت انجام داده‌اند</span>
          <span className="admin-kpi-value">
            {users_with_payment?.toLocaleString('fa-IR') ?? '-'}
          </span>
        </div>
      </div>

      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <span className="admin-kpi-label">
            میانگین زمان تا اولین بک‌تست (روز)
          </span>
          <span className="admin-kpi-value">
            {avg_days_to_first_backtest != null
              ? avg_days_to_first_backtest.toFixed(2)
              : '—'}
          </span>
        </div>
        <div className="admin-kpi-card">
          <span className="admin-kpi-label">
            میانگین زمان تا اولین پرداخت (روز)
          </span>
          <span className="admin-kpi-value">
            {avg_days_to_first_payment != null
              ? avg_days_to_first_payment.toFixed(2)
              : '—'}
          </span>
        </div>
      </div>
    </section>
  )
}


