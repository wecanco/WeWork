import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useToast } from './Toast'
import { API_BASE_URL } from '../config'

export default function AdminConfig() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [edits, setEdits] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    axios
      .get(`${API_BASE_URL}/admin/config`)
      .then((res) => {
        const list = res.data || []
        setItems(list)
        setEdits(
          list.reduce((acc, item) => {
            acc[item.id] = item.value ?? ''
            return acc
          }, {})
        )
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || 'خطا در دریافت تنظیمات سیستم')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (id, value) => {
    setEdits((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleSave = async (item) => {
    try {
      setSavingId(item.id)
      const newValue = edits[item.id]
      const res = await axios.put(`${API_BASE_URL}/admin/config/${item.id}`, {
        value: newValue,
      })
      const updated = res.data
      setItems((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, value: updated.value } : c))
      )
      toast.success('تنظیمات با موفقیت ذخیره شد')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'خطا در ذخیره تنظیمات')
    } finally {
      setSavingId(null)
    }
  }

  if (loading) return <div className="admin-panel-loading">در حال بارگذاری...</div>
  if (error) return <div className="error-text admin-panel-error">{error}</div>

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <h1>تنظیمات سیستم</h1>
        <p>مدیریت key/value های مهم سیستم (ConfigKV در دیتابیس)</p>
      </div>

      <div className="admin-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>کلید</th>
              <th>مقدار</th>
              <th>اقدام</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.key}</td>
                <td>
                  <input
                    type="text"
                    value={edits[c.id] ?? ''}
                    onChange={(e) => handleChange(c.id, e.target.value)}
                  />
                </td>
                <td>
                  <button
                    className="btn-primary"
                    disabled={savingId === c.id}
                    onClick={() => handleSave(c)}
                  >
                    ذخیره
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}


