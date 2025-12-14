import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config'

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    axios
      .get(`${API_BASE_URL}/admin/subscriptions`)
      .then((res) => {
        setSubscriptions(res.data || [])
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || 'خطا در دریافت اشتراک‌ها')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="admin-panel-loading">در حال بارگذاری...</div>
  if (error) return <div className="error-text admin-panel-error">{error}</div>

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <h1>اشتراک‌های کاربران</h1>
        <p>نمای کلی از وضعیت اشتراک‌ها و پلن‌های فعال</p>
      </div>

      <div className="admin-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>کاربر</th>
              <th>پلن</th>
              <th>قیمت</th>
              <th>وضعیت</th>
              <th>شروع</th>
              <th>پایان</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((s) => (
              <tr key={s.id}>
                <td>{s.user_email || s.user_id}</td>
                <td>{s.plan_name || s.plan_id || '-'}</td>
                <td>
                  {s.price?.toLocaleString('fa-IR')}{' '}
                  {s.currency === 'IRR' ? 'تومان' : s.currency}
                </td>
                <td>
                  <span
                    className={
                      s.is_active ? 'badge badge-success' : 'badge badge-muted'
                    }
                  >
                    {s.is_active ? 'فعال' : 'غیرفعال'}
                  </span>
                </td>
                <td>
                  {s.start_at
                    ? new Date(s.start_at).toLocaleDateString('fa-IR')
                    : '-'}
                </td>
                <td>
                  {s.end_at
                    ? new Date(s.end_at).toLocaleDateString('fa-IR')
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


