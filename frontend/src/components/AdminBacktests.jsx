import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config'

export default function AdminBacktests() {
  const [backtests, setBacktests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [symbolFilter, setSymbolFilter] = useState('')
  const [strategyFilter, setStrategyFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    axios
      .get(`${API_BASE_URL}/admin/backtests`)
      .then((res) => {
        setBacktests(res.data || [])
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || 'خطا در دریافت بک‌تست‌ها')
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredBacktests = useMemo(() => {
    return backtests.filter((b) => {
      const symbolOk = symbolFilter
        ? (b.symbol || '').toLowerCase().includes(symbolFilter.toLowerCase())
        : true
      const strategyOk = strategyFilter
        ? (b.strategy_name || '')
            .toLowerCase()
            .includes(strategyFilter.toLowerCase())
        : true
      return symbolOk && strategyOk
    })
  }, [backtests, symbolFilter, strategyFilter])

  if (loading) return <div className="admin-panel-loading">در حال بارگذاری...</div>
  if (error) return <div className="error-text admin-panel-error">{error}</div>

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <h1>بک‌تست‌ها</h1>
        <p>مانیتورینگ آخرین بک‌تست‌های اجرا شده توسط کاربران</p>
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
              <th>استراتژی</th>
              <th>نماد / تایم‌فریم</th>
              <th>تریدها</th>
              <th>برد / باخت</th>
              <th>Win rate</th>
              <th>PNL %</th>
              <th>تاریخ</th>
            </tr>
          </thead>
          <tbody>
            {filteredBacktests.map((b) => (
              <tr key={b.id}>
                <td>{b.strategy_name}</td>
                <td>
                  {b.symbol} / {b.timeframe}
                </td>
                <td>{b.total_trades}</td>
                <td>
                  {b.wins} / {b.losses}
                </td>
                <td>{b.win_rate?.toFixed(2)}%</td>
                <td
                  className={
                    b.net_pnl_percent >= 0 ? 'text-success' : 'text-danger'
                  }
                >
                  {b.net_pnl_percent?.toFixed(2)}%
                </td>
                <td>
                  {b.created_at
                    ? new Date(b.created_at).toLocaleString('fa-IR')
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


