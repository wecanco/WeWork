import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([
      axios.get(`${API_BASE_URL}/admin/stats`),
      axios.get(`${API_BASE_URL}/admin/overview`),
    ])
      .then(([statsRes, overviewRes]) => {
        setStats(statsRes.data || null)
        setUsers(overviewRes.data.users || [])
        setPayments(overviewRes.data.payments || [])
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || 'خطا در دریافت داده‌های داشبورد ادمین')
      })
      .finally(() => setLoading(false))
  }, [])

  const aggregateByDay = (items, getDate, getValue) => {
    const map = new Map()
    items.forEach((item) => {
      const d = getDate(item)
      if (!d) return
      const dayKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
      const prev = map.get(dayKey) || 0
      map.set(dayKey, prev + getValue(item))
    })
    // sort ascending by date
    const entries = Array.from(map.entries()).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
    )
    return entries
  }

  const revenueByDay = aggregateByDay(
    payments.filter((p) => p.status === 'paid' && p.paid_at),
    (p) => new Date(p.paid_at),
    (p) => p.amount || 0
  )

  const newUsersByDay = aggregateByDay(
    users.filter((u) => u.created_at),
    (u) => new Date(u.created_at),
    () => 1
  )

  const last7Revenue = revenueByDay.slice(-7)
  const last7Users = newUsersByDay.slice(-7)
  const maxRevenue = last7Revenue.reduce((max, [, v]) => (v > max ? v : max), 0) || 1
  const maxUsers = last7Users.reduce((max, [, v]) => (v > max ? v : max), 0) || 1

  if (loading) return <div className="admin-panel-loading">در حال بارگذاری...</div>
  if (error) return <div className="error-text admin-panel-error">{error}</div>

  return (
    <div className="admin-panel">
      <header className="admin-panel-header">
        <div>
          <h1>داشبورد مدیریت Wewework</h1>
          <p className="admin-panel-subtitle">
            تصویر کلی از رشد کاربران، درآمد و استفاده از سیستم
          </p>
        </div>
      </header>

      <section className="admin-dashboard-overview">
        <div className="admin-kpi-grid">
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">کل کاربران</span>
            <span className="admin-kpi-value">
              {stats?.total_users?.toLocaleString('fa-IR') ?? '-'}
            </span>
          </div>
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">کاربران فعال</span>
            <span className="admin-kpi-value">
              {stats?.active_users?.toLocaleString('fa-IR') ?? '-'}
            </span>
          </div>
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">ادمین‌ها</span>
            <span className="admin-kpi-value">
              {stats?.admins_count?.toLocaleString('fa-IR') ?? '-'}
            </span>
          </div>
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">درآمد کل</span>
            <span className="admin-kpi-value">
              {stats
                ? `${stats.total_revenue.toLocaleString('fa-IR')} تومان`
                : '-'}
            </span>
          </div>
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">اشتراک‌های فعال</span>
            <span className="admin-kpi-value">
              {stats?.active_subscriptions?.toLocaleString('fa-IR') ?? '-'}
            </span>
          </div>
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">پلن‌های فعال</span>
            <span className="admin-kpi-value">
              {stats?.active_plans?.toLocaleString('fa-IR') ?? '-'}
            </span>
          </div>
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">تعداد بک‌تست‌ها</span>
            <span className="admin-kpi-value">
              {stats?.backtests_count?.toLocaleString('fa-IR') ?? '-'}
            </span>
          </div>
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">تریدهای باز</span>
            <span className="admin-kpi-value">
              {stats?.open_trades?.toLocaleString('fa-IR') ?? '-'}
            </span>
          </div>
        </div>

        <div className="admin-charts-grid">
          <div className="admin-panel-section admin-chart-card">
            <h2>روند درآمد ۷ روز اخیر</h2>
            {last7Revenue.length === 0 ? (
              <p className="admin-chart-empty">داده کافی برای نمایش موجود نیست.</p>
            ) : (
              <div className="admin-chart-bars">
                {last7Revenue.map(([day, value]) => (
                  <div key={day} className="admin-chart-bar-wrapper">
                    <div
                      className="admin-chart-bar"
                      style={{
                        height: `${(value / maxRevenue) * 100 || 0}%`,
                      }}
                    />
                    <span className="admin-chart-bar-label">
                      {new Date(day).toLocaleDateString('fa-IR', {
                        month: 'numeric',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-panel-section admin-chart-card">
            <h2>کاربران جدید ۷ روز اخیر</h2>
            {last7Users.length === 0 ? (
              <p className="admin-chart-empty">داده کافی برای نمایش موجود نیست.</p>
            ) : (
              <div className="admin-chart-bars">
                {last7Users.map(([day, value]) => (
                  <div key={day} className="admin-chart-bar-wrapper">
                    <div
                      className="admin-chart-bar users"
                      style={{
                        height: `${(value / maxUsers) * 100 || 0}%`,
                      }}
                    />
                    <span className="admin-chart-bar-label">
                      {new Date(day).toLocaleDateString('fa-IR', {
                        month: 'numeric',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="admin-panel-section">
          <h2>آخرین پرداخت‌ها</h2>
          <div className="admin-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>کاربر</th>
                  <th>مبلغ</th>
                  <th>وضعیت</th>
                  <th>Ref ID</th>
                  <th>تاریخ پرداخت</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 10).map((p) => (
                  <tr key={p.id}>
                    <td>{p.user_email}</td>
                    <td>{p.amount.toLocaleString('fa-IR')} تومان</td>
                    <td>{p.status}</td>
                    <td>{p.ref_id || '-'}</td>
                    <td>
                      {p.paid_at
                        ? new Date(p.paid_at).toLocaleString('fa-IR')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}


