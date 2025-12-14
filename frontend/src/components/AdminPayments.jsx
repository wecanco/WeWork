import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config'

export default function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    axios
      .get(`${API_BASE_URL}/admin/overview`)
      .then((res) => {
        setPayments(res.data.payments || [])
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || 'خطا در دریافت لیست پرداخت‌ها')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="admin-panel-loading">در حال بارگذاری...</div>
  if (error) return <div className="error-text admin-panel-error">{error}</div>

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <h1>مدیریت پرداخت‌ها</h1>
        <p>نمای کامل تراکنش‌ها برای بررسی سریع وضعیت‌ها</p>
      </div>

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
            {payments.map((p) => (
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
    </section>
  )
}


