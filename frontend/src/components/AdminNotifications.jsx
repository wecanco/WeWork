import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useAuth } from './AuthContext'
import { useToast } from './Toast'
import { API_BASE_URL } from '../config'
import './AdminNotifications.css'

const AUDIENCE = {
  ALL: 'all',
  SPECIFIC: 'specific',
}

const NOTIFICATION_TYPES = [
  { value: 'system', label: 'سیستمی' },
  { value: 'info', label: 'اطلاعاتی' },
  { value: 'success', label: 'موفقیت' },
  { value: 'warning', label: 'هشدار' },
  { value: 'error', label: 'خطا' },
]

export default function AdminNotifications() {
  const { isAdmin } = useAuth()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [type, setType] = useState('system')
  const [audience, setAudience] = useState(AUDIENCE.ALL)
  const [sending, setSending] = useState(false)

  const [activeUsersCount, setActiveUsersCount] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])

  useEffect(() => {
    // Fetch active users count for context
    axios
      .get(`${API_BASE_URL}/admin/stats`)
      .then((res) => setActiveUsersCount(res.data?.active_users ?? null))
      .catch(() => setActiveUsersCount(null))
  }, [])

  useEffect(() => {
    if (audience !== AUDIENCE.SPECIFIC) return
    const term = searchTerm.trim()

    if (term.length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }

    const controller = new AbortController()
    setSearchLoading(true)
    const timeout = setTimeout(() => {
      axios
        .get(`${API_BASE_URL}/admin/users`, {
          params: { search: term, limit: 10 },
          signal: controller.signal,
        })
        .then((res) => {
          setSearchResults(res.data?.items || [])
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSearchResults([])
          }
        })
        .finally(() => setSearchLoading(false))
    }, 300)

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [audience, searchTerm])

  const canSubmit = useMemo(() => {
    if (!title.trim() || !message.trim()) return false
    if (audience === AUDIENCE.SPECIFIC && selectedUsers.length === 0) return false
    return true
  }, [title, message, audience, selectedUsers])

  const handleAddUser = (user) => {
    setSelectedUsers((prev) => {
      if (prev.some((u) => u.id === user.id)) return prev
      return [...prev, user]
    })
  }

  const handleRemoveUser = (userId) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!canSubmit) {
      toast.error('عنوان، متن و مخاطب را تکمیل کنید.')
      return
    }

    setSending(true)
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        type,
        send_to_all: audience === AUDIENCE.ALL,
      }
      if (link.trim()) payload.link = link.trim()
      if (audience === AUDIENCE.SPECIFIC) {
        payload.user_ids = selectedUsers.map((u) => u.id)
      }

      const res = await axios.post(`${API_BASE_URL}/admin/notifications/send`, payload)
      const created = res.data?.created_count ?? 0
      const target = res.data?.target_count ?? 0
      const skipped = res.data?.skipped_user_ids?.length ?? 0

      toast.success(`اعلان ارسال شد (${created}/${target}، رد شده: ${skipped})`)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'خطا در ارسال اعلان')
    } finally {
      setSending(false)
    }
  }

  if (!isAdmin) {
    return <div className="admin-panel-no-access">شما دسترسی ادمین ندارید.</div>
  }

  return (
    <div className="admin-notifications-page">
      <div className="admin-page-header">
        <div>
          <h1>ارسال اعلان</h1>
          <p className="admin-page-subtitle">
            اعلان درون برنامه‌ای و Web Push برای همه کاربران یا کاربران انتخابی
          </p>
        </div>
        <div className="admin-notifications-meta">
          <span className="meta-label">کاربران فعال</span>
          <span className="meta-value">
            {activeUsersCount !== null ? activeUsersCount.toLocaleString('fa-IR') : '—'}
          </span>
        </div>
      </div>

      <div className="admin-notifications-grid">
        <section className="admin-card">
          <header className="section-header">
            <div>
              <h2>جزئیات اعلان</h2>
              <p>عنوان، متن، نوع و لینک اختیاری اعلان را وارد کنید.</p>
            </div>
          </header>

          <form className="admin-form" onSubmit={handleSend}>
            <div className="form-row">
              <div className="form-field">
                <label>عنوان*</label>
                <input
                  type="text"
                  value={title}
                  maxLength={255}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثلاً: به‌روزرسانی مهم سیستم"
                />
              </div>
              <div className="form-field">
                <label>نوع</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  {NOTIFICATION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>متن اعلان*</label>
              <textarea
                rows={5}
                maxLength={4000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="جزئیات اعلان را اینجا بنویسید..."
              />
            </div>

            <div className="form-field">
              <label>لینک (اختیاری)</label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/app/notifications یا یک URL کامل"
              />
              <small className="field-hint">
                در کلیک روی اعلان (وب‌پوش یا داخل برنامه) کاربر به این مسیر هدایت می‌شود.
              </small>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={sending || !canSubmit}>
                {sending ? 'در حال ارسال...' : 'ارسال اعلان'}
              </button>
            </div>
          </form>
        </section>

        <section className="admin-card">
          <header className="section-header">
            <div>
              <h2>مخاطبان</h2>
              <p>ارسال برای همه کاربران یا انتخاب کاربران مشخص.</p>
            </div>
          </header>

          <div className="audience-toggle">
            <label className={audience === AUDIENCE.ALL ? 'active' : ''}>
              <input
                type="radio"
                name="audience"
                value={AUDIENCE.ALL}
                checked={audience === AUDIENCE.ALL}
                onChange={() => setAudience(AUDIENCE.ALL)}
              />
              <div>
                <div className="audience-title">همه کاربران فعال</div>
                <div className="audience-subtitle">
                  ارسال به همه کاربران فعال (Push برای کسانی که مشترک شده‌اند)
                </div>
              </div>
            </label>

            <label className={audience === AUDIENCE.SPECIFIC ? 'active' : ''}>
              <input
                type="radio"
                name="audience"
                value={AUDIENCE.SPECIFIC}
                checked={audience === AUDIENCE.SPECIFIC}
                onChange={() => setAudience(AUDIENCE.SPECIFIC)}
              />
              <div>
                <div className="audience-title">کاربران انتخابی</div>
                <div className="audience-subtitle">
                  ارسال به فهرست انتخابی بر اساس جستجو یا شناسه کاربر
                </div>
              </div>
            </label>
          </div>

          {audience === AUDIENCE.SPECIFIC && (
            <div className="audience-selector">
              <label>جستجوی کاربر (ایمیل، نام یا موبایل)</label>
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="مثلاً example@mail.com یا 0912..."
              />
              {searchLoading && <div className="loading-inline">در حال جستجو...</div>}
              {!searchLoading && searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((user) => (
                    <button
                      type="button"
                      key={user.id}
                      className="search-result-item"
                      onClick={() => handleAddUser(user)}
                    >
                      <div className="result-name">
                        {user.full_name || user.email || 'کاربر'}
                      </div>
                      <div className="result-meta">
                        <span>{user.email}</span>
                        <span>{user.phone_number}</span>
                        <span>{typeof user.role === 'string' ? user.role : user.role?.name}</span>
                      </div>
                      <span className="add-pill">افزودن</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="selected-users">
                <div className="selected-users-header">
                  <span>کاربران انتخاب‌شده</span>
                  <span>{selectedUsers.length} کاربر</span>
                </div>
                {selectedUsers.length === 0 ? (
                  <div className="empty-pill">کاربری انتخاب نشده است.</div>
                ) : (
                  <div className="pill-list">
                    {selectedUsers.map((u) => (
                      <span key={u.id} className="pill">
                        {u.full_name || u.email || u.phone_number || `کاربر ${u.id}`}
                        <button
                          type="button"
                          className="pill-remove"
                          onClick={() => handleRemoveUser(u.id)}
                          aria-label="حذف"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="admin-card-note">
            <p>
              برای دریافت Web Push، مرورگر کاربر باید قبلاً مجوز نوتیفیکیشن را داده و در مسیر
              اپ لاگین شده باشد. اگر کلیدهای VAPID تنظیم نشده باشد، اعلان فقط داخل برنامه نمایش
              داده می‌شود.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

