import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config'

export default function AdminRisk() {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    axios
      .get(`${API_BASE_URL}/admin/risk-trades`)
      .then((res) => setTrades(res.data || []))
      .catch((err) => {
        setError(
          err?.response?.data?.detail || 'خطا در دریافت تریدهای پرریسک'
        )
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="admin-panel-loading">در حال بارگذاری...</div>
  if (error) return <div className="error-text admin-panel-error">{error}</div>

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <h1>Risk & Compliance View</h1>
        <p>تریدهایی با اهرم بالا یا نوسان شدید PnL</p>
      </div>

      <div className="admin-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>اکسچنج</th>
              <th>نماد</th>
              <th>استراتژی</th>
              <th>سمت</th>
              <th>Leverage</th>
              <th>PNL %</th>
              <th>وضعیت</th>
              <th>تاریخ</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id}>
                <td>{t.exchange}</td>
                <td>{t.symbol}</td>
                <td>{t.strategy || '-'}</td>
                <td>{t.side}</td>
                <td>{t.leverage}</td>
                <td
                  className={t.pnl_percent >= 0 ? 'text-success' : 'text-danger'}
                >
                  {t.pnl_percent?.toFixed(2)}%
                </td>
                <td>
                  <span
                    className={
                      t.closed ? 'badge badge-muted' : 'badge badge-warning'
                    }
                  >
                    {t.closed ? 'بسته شده' : 'باز'}
                  </span>
                </td>
                <td>
                  {t.created_at
                    ? new Date(t.created_at).toLocaleString('fa-IR')
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}


