import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useToast } from './Toast'
import { API_BASE_URL } from '../config'

export default function AdminFileBasedBots() {
  const toast = useToast()
  const [bots, setBots] = useState([])
  const [strategyFiles, setStrategyFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingBot, setEditingBot] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    strategy_file: '',
    is_active: false,
    config: {},
  })
  const [configJson, setConfigJson] = useState('{}')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [botsRes, filesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/file-based-bots`),
        axios.get(`${API_BASE_URL}/admin/file-based-bots/strategy-files`),
      ])
      setBots(botsRes.data || [])
      setStrategyFiles(filesRes.data || [])
    } catch (err) {
      setError(err?.response?.data?.detail || 'خطا در دریافت داده‌ها')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingBot(null)
    setFormData({
      name: '',
      strategy_file: strategyFiles[0] || '',
      is_active: false,
      config: {},
    })
    setConfigJson('{}')
    setShowCreateModal(true)
  }

  const handleEdit = (bot) => {
    setEditingBot(bot)
    setFormData({
      name: bot.name,
      strategy_file: bot.strategy_file,
      is_active: bot.is_active,
      config: bot.config || {},
    })
    setConfigJson(JSON.stringify(bot.config || {}, null, 2))
    setShowCreateModal(true)
  }

  const handleDelete = async (botId) => {
    if (!window.confirm('آیا از حذف این بات اطمینان دارید؟')) return

    try {
      await axios.delete(`${API_BASE_URL}/admin/file-based-bots/${botId}`)
      toast.success('بات با موفقیت حذف شد')
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'خطا در حذف بات')
    }
  }

  const handleToggleActive = async (bot) => {
    try {
      const updated = await axios.put(`${API_BASE_URL}/admin/file-based-bots/${bot.id}`, {
        is_active: !bot.is_active,
      })
      toast.success(`بات ${updated.data.is_active ? 'فعال' : 'غیرفعال'} شد`)
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'خطا در تغییر وضعیت بات')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      let config = {}
      try {
        config = JSON.parse(configJson)
      } catch (e) {
        toast.error('فرمت JSON تنظیمات نامعتبر است')
        setSaving(false)
        return
      }

      const payload = {
        ...formData,
        config,
      }

      if (editingBot) {
        await axios.put(`${API_BASE_URL}/admin/file-based-bots/${editingBot.id}`, payload)
        toast.success('بات با موفقیت به‌روزرسانی شد')
      } else {
        await axios.post(`${API_BASE_URL}/admin/file-based-bots`, payload)
        toast.success('بات با موفقیت ایجاد شد')
      }

      setShowCreateModal(false)
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'خطا در ذخیره بات')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="admin-panel-loading">در حال بارگذاری...</div>
  if (error) return <div className="error-text admin-panel-error">{error}</div>

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <h1>مدیریت بات‌های مبتنی بر فایل</h1>
        <p>مدیریت بات‌هایی که استراتژی‌هایشان از فایل‌های پوشه strategies لود می‌شوند</p>
        <button className="btn-primary" onClick={handleCreate}>
          ایجاد بات جدید
        </button>
      </div>

      <div className="admin-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>نام</th>
              <th>فایل استراتژی</th>
              <th>وضعیت</th>
              <th>تنظیمات</th>
              <th>تاریخ ایجاد</th>
              <th>اقدامات</th>
            </tr>
          </thead>
          <tbody>
            {bots.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                  هیچ باتی ایجاد نشده است
                </td>
              </tr>
            ) : (
              bots.map((bot) => (
                <tr key={bot.id}>
                  <td>{bot.name}</td>
                  <td>
                    <code>{bot.strategy_file}</code>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${bot.is_active ? 'active' : 'inactive'}`}
                    >
                      {bot.is_active ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td>
                    <details>
                      <summary>مشاهده تنظیمات</summary>
                      <pre style={{ fontSize: '0.85em', marginTop: '0.5rem' }}>
                        {JSON.stringify(bot.config || {}, null, 2)}
                      </pre>
                    </details>
                  </td>
                  <td>{new Date(bot.created_at).toLocaleDateString('fa-IR')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => handleToggleActive(bot)}
                      >
                        {bot.is_active ? 'غیرفعال' : 'فعال'}
                      </button>
                      <button className="btn-secondary" onClick={() => handleEdit(bot)}>
                        ویرایش
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => handleDelete(bot.id)}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingBot ? 'ویرایش بات' : 'ایجاد بات جدید'}</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>
                  نام بات <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="مثال: بات اصلی RSI"
                />
              </div>

              <div className="form-group">
                <label>
                  فایل استراتژی <span className="required">*</span>
                </label>
                <select
                  value={formData.strategy_file}
                  onChange={(e) =>
                    setFormData({ ...formData, strategy_file: e.target.value })
                  }
                  required
                >
                  <option value="">انتخاب کنید...</option>
                  {strategyFiles.map((file) => (
                    <option key={file} value={file}>
                      {file}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                  />
                  فعال
                </label>
              </div>

              <div className="form-group">
                <label>
                  تنظیمات (JSON) <span className="text-muted">(اختیاری)</span>
                </label>
                <textarea
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  rows={8}
                  placeholder='{"symbol": "BTC/USDT", "leverage": 20, ...}'
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.9em',
                  }}
                />
                <small className="text-muted">
                  تنظیمات به صورت JSON وارد کنید. این تنظیمات به استراتژی پاس داده می‌شوند.
                </small>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  انصراف
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'در حال ذخیره...' : editingBot ? 'به‌روزرسانی' : 'ایجاد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 0.25rem;
          font-size: 0.85em;
          font-weight: 500;
        }
        .status-badge.active {
          background-color: #10b981;
          color: white;
        }
        .status-badge.inactive {
          background-color: #6b7280;
          color: white;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .modal-content {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 24px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #334155;
        }
        .modal-header h2 {
          margin: 0;
          color: #f1f5f9;
        }
        .modal-close {
          background: transparent;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #94a3b8;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .modal-close:hover {
          background: #334155;
          color: #f1f5f9;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #cbd5e1;
        }
        .form-group input[type="text"],
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #334155;
          border-radius: 4px;
          font-size: 14px;
          background: #0f172a;
          color: #e2e8f0;
        }
        .form-group input[type="text"]:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }
        .form-group input[type="checkbox"] {
          width: auto;
          margin-right: 8px;
        }
        .required {
          color: #ef4444;
        }
        .text-muted {
          color: #94a3b8;
          font-size: 0.85em;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #334155;
        }
        .btn-primary,
        .btn-secondary,
        .btn-danger {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: background 0.2s;
        }
        .btn-primary {
          background-color: #3b82f6;
          color: white;
        }
        .btn-primary:hover {
          background-color: #2563eb;
        }
        .btn-secondary {
          background-color: #334155;
          color: #e2e8f0;
          border: 1px solid #475569;
        }
        .btn-secondary:hover {
          background-color: #475569;
        }
        .btn-danger {
          background-color: #ef4444;
          color: white;
        }
        .btn-danger:hover {
          background-color: #dc2626;
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </section>
  )
}

