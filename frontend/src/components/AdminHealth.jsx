import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config'

export default function AdminHealth() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    axios
      .get(`${API_BASE_URL}/admin/health`)
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(err?.response?.data?.detail || 'خطا در دریافت وضعیت سلامت سیستم')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="admin-panel-loading">در حال بارگذاری...</div>
  if (error) return <div className="error-text admin-panel-error">{error}</div>

  const { backtests, trades, payments } = data || {}

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <h1>سلامت و پایداری سیستم</h1>
        <p>نمای کلی از وضعیت بک‌تست، ترید و پرداخت‌ها در ۲۴ ساعت / ۷ روز اخیر</p>
      </div>

      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <span className="admin-kpi-label">بک‌تست‌ها (کل)</span>
          <span className="admin-kpi-value">{backtests?.total ?? '-'}</span>
          <span className="admin-kpi-sub">
            شکست‌خورده‌ها: {backtests?.failed ?? '-'}
          </span>
          <span className="admin-kpi-sub">
            ۲۴ ساعت اخیر: {backtests?.last_24h ?? '-'}
          </span>
        </div>
        <div className="admin-kpi-card">
          <span className="admin-kpi-label">تریدها (کل)</span>
          <span className="admin-kpi-value">{trades?.total ?? '-'}</span>
          <span className="admin-kpi-sub">باز: {trades?.open ?? '-'}</span>
          <span className="admin-kpi-sub">
            ۲۴ ساعت اخیر: {trades?.last_24h ?? '-'}
          </span>
        </div>
        <div className="admin-kpi-card">
          <span className="admin-kpi-label">پرداخت‌ها (کل)</span>
          <span className="admin-kpi-value">{payments?.total ?? '-'}</span>
          <span className="admin-kpi-sub">
            ناموفق/لغو شده: {payments?.failed ?? '-'}
          </span>
          <span className="admin-kpi-sub">
            ۷ روز اخیر: {payments?.last_7d ?? '-'}
          </span>
        </div>
      </div>

      <div className="admin-panel-section">
        <h2>آخرین فعالیت‌ها</h2>
        <ul className="admin-health-timeline">
          <li>
            آخرین بک‌تست:{' '}
            {backtests?.last_at
              ? new Date(backtests.last_at).toLocaleString('fa-IR')
              : '—'}
          </li>
          <li>
            آخرین ترید:{' '}
            {trades?.last_at
              ? new Date(trades.last_at).toLocaleString('fa-IR')
              : '—'}
          </li>
        </ul>
      </div>
    </section>
  )
}


