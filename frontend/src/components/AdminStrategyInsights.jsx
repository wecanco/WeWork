import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config'

export default function AdminStrategyInsights() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    axios
      .get(`${API_BASE_URL}/admin/strategy-insights`)
      .then((res) => setItems(res.data || []))
      .catch((err) => {
        setError(
          err?.response?.data?.detail ||
            'خطا در دریافت آمار عملکرد استراتژی‌ها'
        )
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="admin-panel-loading">در حال بارگذاری...</div>
  if (error) return <div className="error-text admin-panel-error">{error}</div>

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <h1>Strategy Intelligence</h1>
        <p>کدام استراتژی‌ها بیشتر استفاده شده‌اند و بهترین عملکرد را داشته‌اند؟</p>
      </div>

      <div className="admin-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>استراتژی</th>
              <th>تعداد بک‌تست</th>
              <th>میانگین Win rate</th>
              <th>میانگین PNL %</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.strategy_name || 'unknown'}>
                <td>{s.strategy_name || '—'}</td>
                <td>{s.backtests_count}</td>
                <td>{s.avg_win_rate?.toFixed(2)}%</td>
                <td
                  className={
                    s.avg_net_pnl_percent >= 0 ? 'text-success' : 'text-danger'
                  }
                >
                  {s.avg_net_pnl_percent?.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}


