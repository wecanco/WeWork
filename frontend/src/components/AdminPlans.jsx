import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config'

export default function AdminPlans() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    axios
      .get(`${API_BASE_URL}/admin/plans`)
      .then((res) => {
        setPlans(res.data || [])
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || 'خطا در دریافت پلن‌ها')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="admin-panel-loading">در حال بارگذاری...</div>
  if (error) return <div className="error-text admin-panel-error">{error}</div>

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <h1>پلن‌های اشتراک</h1>
        <p>تعریف و مدیریت پلن‌ها (در حال حاضر فقط نمایش)</p>
      </div>

      <div className="admin-card-grid">
        {plans.map((p) => (
          <div key={p.id} className="admin-plan-card">
            <div className="admin-plan-card-header">
              <h3>{p.name}</h3>
              {p.is_default && <span className="badge badge-info">پیش‌فرض</span>}
            </div>
            <p className="admin-plan-description">{p.description}</p>
            <div className="admin-plan-meta">
              <span>
                قیمت پایه: {p.base_price?.toLocaleString('fa-IR') || 0} تومان
              </span>
              <span>
                وضعیت:{' '}
                <span
                  className={
                    p.is_active ? 'badge badge-success' : 'badge badge-muted'
                  }
                >
                  {p.is_active ? 'فعال' : 'غیرفعال'}
                </span>
              </span>
            </div>
            {p.features && (
              <pre className="admin-plan-features">
                {JSON.stringify(p.features, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}


