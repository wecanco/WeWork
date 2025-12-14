import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config'

export default function AdminTrades() {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [symbolFilter, setSymbolFilter] = useState('')
  const [strategyFilter, setStrategyFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    axios
      .get(`${API_BASE_URL}/admin/trades`)
      .then((res) => {
        setTrades(res.data || [])
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || 'خطا در دریافت ژورنال ترید')
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const symbolOk = symbolFilter
        ? (t.symbol || '').toLowerCase().includes(symbolFilter.toLowerCase())
        : true
      const strategyOk = strategyFilter
        ? (t.strategy || '')
            .toLowerCase()
            .includes(strategyFilter.toLowerCase())
        : true
      return symbolOk && strategyOk
    })
  }, [trades, symbolFilter, strategyFilter])

  if (loading) return <div className="admin-panel-loading">در حال بارگذاری...</div>
  if (error) return <div className="error-text admin-panel-error">{error}</div>

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <h1>ژورنال ترید</h1>
        <p>نمای زنده از آخرین معاملات ربات روی اکانت‌ها</p>
      </div>

      <div className="admin-filters-row">
        <input
          type="text"
          placeholder="فیلتر نماد (مثلاً BTC/USDT)"
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
        />
        <input
          type="text"
          placeholder="فیلتر نام استراتژی"
          value={strategyFilter}
          onChange={(e) => setStrategyFilter(e.target.value)}
        />
      </div>

      <div className="admin-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>اکسچنج</th>
              <th>نماد</th>
              <th>استراتژی</th>
              <th>سمت</th>
              <th>قیمت</th>
              <th>Leverage</th>
              <th>PNL %</th>
              <th>وضعیت</th>
              <th>تاریخ</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrades.map((t) => (
              <tr key={t.id}>
                <td>{t.exchange}</td>
                <td>{t.symbol}</td>
                <td>{t.strategy || '-'}</td>
                <td>{t.side}</td>
                <td>{t.price}</td>
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


