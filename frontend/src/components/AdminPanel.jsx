import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useAuth } from './AuthContext'
import { useToast } from './Toast'
import { API_BASE_URL } from '../config'

const TABS = {
  OVERVIEW: 'overview',
  USERS: 'users',
  PAYMENTS: 'payments',
  SUBSCRIPTIONS: 'subscriptions',
  PLANS: 'plans',
  BACKTESTS: 'backtests',
  TRADES: 'trades',
  CONFIG: 'config',
}

export default function AdminPanel() {
  const { isAdmin, user: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.role?.name === 'super_admin'
  const toast = useToast()
  const [activeTab, setActiveTab] = useState(TABS.OVERVIEW)

  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [payments, setPayments] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [plans, setPlans] = useState([])
  const [backtests, setBacktests] = useState([])
  const [trades, setTrades] = useState([])
  const [configItems, setConfigItems] = useState([])
  const [configEdits, setConfigEdits] = useState({})
  const [savingConfigId, setSavingConfigId] = useState(null)

  const [backtestSymbolFilter, setBacktestSymbolFilter] = useState('')
  const [backtestStrategyFilter, setBacktestStrategyFilter] = useState('')
  const [tradeSymbolFilter, setTradeSymbolFilter] = useState('')
  const [tradeStrategyFilter, setTradeStrategyFilter] = useState('')

  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userActiveFilter, setUserActiveFilter] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingUserId, setUpdatingUserId] = useState(null)

  const [editingUser, setEditingUser] = useState(null)
  const [editingUserData, setEditingUserData] = useState({
    email: '',
    full_name: '',
    phone_number: '',
    role: 'user',
    is_active: true,
  })
  const [savingUserEdit, setSavingUserEdit] = useState(false)

  useEffect(() => {
    if (!isAdmin) return

    setLoading(true)
    setError('')

    Promise.all([
      axios.get(`${API_BASE_URL}/admin/stats`),
      axios.get(`${API_BASE_URL}/admin/overview`),
      axios.get(`${API_BASE_URL}/admin/subscriptions`),
      axios.get(`${API_BASE_URL}/admin/plans`),
      axios.get(`${API_BASE_URL}/admin/backtests`),
      axios.get(`${API_BASE_URL}/admin/trades`),
      axios.get(`${API_BASE_URL}/admin/config`),
    ])
      .then(([statsRes, overviewRes, subsRes, plansRes, btRes, tradesRes, cfgRes]) => {
        setStats(statsRes.data || null)
        setUsers(overviewRes.data.users || [])
        setPayments(overviewRes.data.payments || [])
        setSubscriptions(subsRes.data || [])
        setPlans(plansRes.data || [])
        setBacktests(btRes.data || [])
        setTrades(tradesRes.data || [])
        const cfg = cfgRes.data || []
        setConfigItems(cfg)
        setConfigEdits(
          cfg.reduce((acc, item) => {
            acc[item.id] = item.value ?? ''
            return acc
          }, {})
        )
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || 'خطا در دریافت داده‌های ادمین')
      })
      .finally(() => setLoading(false))
  }, [isAdmin])

  const filteredUsers = useMemo(() => {
    let result = [...users]
    if (userSearch) {
      const term = userSearch.toLowerCase()
      result = result.filter(
        (u) =>
          (u.email && u.email.toLowerCase().includes(term)) ||
          (u.full_name && u.full_name.toLowerCase().includes(term)) ||
          (u.phone_number && u.phone_number.toLowerCase().includes(term))
      )
    }
    if (userRoleFilter) {
      result = result.filter((u) => {
        const roleName = typeof u.role === 'string' ? u.role : u.role?.name
        return roleName === userRoleFilter
      })
    }
    if (userActiveFilter) {
      const isActive = userActiveFilter === 'active'
      result = result.filter((u) => !!u.is_active === isActive)
    }
    return result
  }, [users, userSearch, userRoleFilter, userActiveFilter])

  const filteredBacktests = useMemo(() => {
    return backtests.filter((b) => {
      const symbolOk = backtestSymbolFilter
        ? (b.symbol || '').toLowerCase().includes(backtestSymbolFilter.toLowerCase())
        : true
      const strategyOk = backtestStrategyFilter
        ? (b.strategy_name || '').toLowerCase().includes(backtestStrategyFilter.toLowerCase())
        : true
      return symbolOk && strategyOk
    })
  }, [backtests, backtestSymbolFilter, backtestStrategyFilter])

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const symbolOk = tradeSymbolFilter
        ? (t.symbol || '').toLowerCase().includes(tradeSymbolFilter.toLowerCase())
        : true
      const strategyOk = tradeStrategyFilter
        ? (t.strategy || '').toLowerCase().includes(tradeStrategyFilter.toLowerCase())
        : true
      return symbolOk && strategyOk
    })
  }, [trades, tradeSymbolFilter, tradeStrategyFilter])

  const handleToggleUserActive = async (user) => {
    try {
      setUpdatingUserId(user.id)
      const res = await axios.patch(`${API_BASE_URL}/admin/users/${user.id}`, {
        is_active: !user.is_active,
      })
      const updated = res.data
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))
      toast.success('وضعیت کاربر با موفقیت به‌روزرسانی شد')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'خطا در به‌روزرسانی وضعیت کاربر')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleChangeUserRole = async (user, newRole) => {
    const currentRole = typeof user.role === 'string' ? user.role : user.role?.name
    if (currentRole === newRole) return
    try {
      setUpdatingUserId(user.id)
      const res = await axios.patch(`${API_BASE_URL}/admin/users/${user.id}`, {
        role: newRole,
      })
      const updated = res.data
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))
      toast.success('نقش کاربر با موفقیت تغییر کرد')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'خطا در تغییر نقش کاربر')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const openEditUser = (user) => {
    setEditingUser(user)
    const roleName = typeof user.role === 'string' ? user.role : user.role?.name
    setEditingUserData({
      email: user.email || '',
      full_name: user.full_name || '',
      phone_number: user.phone_number || '',
      role: roleName || 'user',
      is_active: !!user.is_active,
    })
  }

  const closeEditUser = () => {
    setEditingUser(null)
    setEditingUserData({
      email: '',
      full_name: '',
      phone_number: '',
      role: 'user',
      is_active: true,
    })
    setSavingUserEdit(false)
  }

  const handleEditInputChange = (field, value) => {
    setEditingUserData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSaveUserEdit = async () => {
    if (!editingUser) return
    try {
      setSavingUserEdit(true)
      const payload = {
        email: editingUserData.email,
        full_name: editingUserData.full_name,
        phone_number: editingUserData.phone_number,
        role: editingUserData.role,
        is_active: editingUserData.is_active,
      }
      const res = await axios.patch(
        `${API_BASE_URL}/admin/users/${editingUser.id}`,
        payload
      )
      const updated = res.data
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))
      closeEditUser()
      toast.success('کاربر با موفقیت ویرایش شد')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'خطا در ویرایش کاربر')
      setSavingUserEdit(false)
    }
  }

  const handleConfigValueChange = (id, value) => {
    setConfigEdits((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleConfigSave = async (item) => {
    try {
      setSavingConfigId(item.id)
      const newValue = configEdits[item.id]
      const res = await axios.put(`${API_BASE_URL}/admin/config/${item.id}`, {
        value: newValue,
      })
      const updated = res.data
      setConfigItems((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, value: updated.value } : c))
      )
      toast.success('تنظیمات با موفقیت ذخیره شد')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'خطا در ذخیره تنظیمات')
    } finally {
      setSavingConfigId(null)
    }
  }

  if (!isAdmin) {
    return <div className="admin-panel-no-access">شما دسترسی ادمین ندارید.</div>
  }

  return (
    <div className="admin-panel">
      <header className="admin-panel-header">
        <div>
          <h1>پنل مدیریت Wewework</h1>
          <p className="admin-panel-subtitle">
            نظارت کامل روی کاربران، پرداخت‌ها و سلامت سیستم در یک نگاه
          </p>
        </div>
      </header>

      <nav className="admin-panel-tabs">
        <button
          className={activeTab === TABS.OVERVIEW ? 'active' : ''}
          onClick={() => setActiveTab(TABS.OVERVIEW)}
        >
          داشبورد کلی
        </button>
        <button
          className={activeTab === TABS.USERS ? 'active' : ''}
          onClick={() => setActiveTab(TABS.USERS)}
        >
          کاربران
        </button>
        <button
          className={activeTab === TABS.PAYMENTS ? 'active' : ''}
          onClick={() => setActiveTab(TABS.PAYMENTS)}
        >
          پرداخت‌ها
        </button>
        <button
          className={activeTab === TABS.SUBSCRIPTIONS ? 'active' : ''}
          onClick={() => setActiveTab(TABS.SUBSCRIPTIONS)}
        >
          اشتراک‌ها
        </button>
        <button
          className={activeTab === TABS.PLANS ? 'active' : ''}
          onClick={() => setActiveTab(TABS.PLANS)}
        >
          پلن‌ها
        </button>
        <button
          className={activeTab === TABS.BACKTESTS ? 'active' : ''}
          onClick={() => setActiveTab(TABS.BACKTESTS)}
        >
          بک‌تست
        </button>
        <button
          className={activeTab === TABS.TRADES ? 'active' : ''}
          onClick={() => setActiveTab(TABS.TRADES)}
        >
          ترید ژورنال
        </button>
        <button
          className={activeTab === TABS.CONFIG ? 'active' : ''}
          onClick={() => setActiveTab(TABS.CONFIG)}
        >
          تنظیمات سیستم
        </button>
      </nav>

      {loading && <div className="admin-panel-loading">در حال بارگذاری...</div>}
      {error && <div className="error-text admin-panel-error">{error}</div>}

      {!loading && !error && (
        <div className="admin-panel-content">
          {activeTab === TABS.OVERVIEW && (
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
          )}

          {activeTab === TABS.USERS && (
            <section className="admin-panel-section">
              <div className="admin-section-header">
                <h2>مدیریت کاربران</h2>
                <p>جستجو، فیلتر و تغییر نقش / فعال بودن کاربران</p>
              </div>

              <div className="admin-filters-row">
                <input
                  type="text"
                  placeholder="جستجو براساس ایمیل، نام یا موبایل"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                >
                  <option value="">همه نقش‌ها</option>
                  <option value="user">کاربر عادی</option>
                  <option value="admin">ادمین</option>
                  <option value="super_admin">سوپر ادمین</option>
                </select>
                <select
                  value={userActiveFilter}
                  onChange={(e) => setUserActiveFilter(e.target.value)}
                >
                  <option value="">همه وضعیت‌ها</option>
                  <option value="active">فقط فعال</option>
                  <option value="inactive">فقط غیرفعال</option>
                </select>
              </div>

              <div className="admin-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ایمیل</th>
                      <th>نام</th>
                      <th>نقش</th>
                      <th>وضعیت</th>
                      <th>تاریخ عضویت</th>
                      <th>اقدامات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td>{u.email}</td>
                        <td>{u.full_name || '-'}</td>
                        <td>
                          {(typeof u.role === 'string' ? u.role : u.role?.name) === 'super_admin' && !isSuperAdmin ? (
                            <span className="badge badge-info">سوپر ادمین</span>
                          ) : (
                            <select
                              value={typeof u.role === 'string' ? u.role : u.role?.name || 'user'}
                              disabled={updatingUserId === u.id}
                              onChange={(e) => handleChangeUserRole(u, e.target.value)}
                            >
                              <option value="user">کاربر</option>
                              <option value="admin">ادمین</option>
                              <option value="super_admin">سوپر ادمین</option>
                            </select>
                          )}
                        </td>
                        <td>
                          <span
                            className={
                              u.is_active ? 'badge badge-success' : 'badge badge-muted'
                            }
                          >
                            {u.is_active ? 'فعال' : 'غیرفعال'}
                          </span>
                        </td>
                        <td>
                          {u.created_at
                            ? new Date(u.created_at).toLocaleDateString('fa-IR')
                            : '-'}
                        </td>
                        <td>
                          <button
                            className="btn-link"
                            disabled={updatingUserId === u.id}
                            onClick={() => handleToggleUserActive(u)}
                          >
                            {u.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                          </button>
                          <button
                            className="btn-link"
                            style={{ marginRight: 8 }}
                            onClick={() => openEditUser(u)}
                          >
                            ویرایش
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {editingUser && (
                <div className="admin-modal-backdrop">
                  <div className="admin-modal">
                    <h3>ویرایش کاربر</h3>
                    <div className="admin-modal-body">
                      <label className="admin-form-field">
                        <span>ایمیل</span>
                        <input
                          type="email"
                          value={editingUserData.email}
                          onChange={(e) => handleEditInputChange('email', e.target.value)}
                        />
                      </label>
                      <label className="admin-form-field">
                        <span>نام کامل</span>
                        <input
                          type="text"
                          value={editingUserData.full_name}
                          onChange={(e) =>
                            handleEditInputChange('full_name', e.target.value)
                          }
                        />
                      </label>
                      <label className="admin-form-field">
                        <span>شماره موبایل</span>
                        <input
                          type="text"
                          value={editingUserData.phone_number}
                          onChange={(e) =>
                            handleEditInputChange('phone_number', e.target.value)
                          }
                        />
                      </label>
                      <label className="admin-form-field">
                        <span>نقش</span>
                        {editingUserData.role === 'super_admin' && !isSuperAdmin ? (
                          <span className="badge badge-info">سوپر ادمین</span>
                        ) : (
                          <select
                            value={editingUserData.role}
                            onChange={(e) => handleEditInputChange('role', e.target.value)}
                          >
                            <option value="user">کاربر</option>
                            <option value="admin">ادمین</option>
                            <option value="super_admin">سوپر ادمین</option>
                          </select>
                        )}
                      </label>
                      <label className="admin-form-field">
                        <span>وضعیت</span>
                        <select
                          value={editingUserData.is_active ? 'active' : 'inactive'}
                          onChange={(e) =>
                            handleEditInputChange('is_active', e.target.value === 'active')
                          }
                        >
                          <option value="active">فعال</option>
                          <option value="inactive">غیرفعال</option>
                        </select>
                      </label>
                    </div>
                    <div className="admin-modal-footer">
                      <button className="btn-secondary" onClick={closeEditUser}>
                        انصراف
                      </button>
                      <button
                        className="btn-primary"
                        disabled={savingUserEdit}
                        onClick={handleSaveUserEdit}
                      >
                        {savingUserEdit ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === TABS.PAYMENTS && (
            <section className="admin-panel-section">
              <div className="admin-section-header">
                <h2>مدیریت پرداخت‌ها</h2>
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
          )}

          {activeTab === TABS.SUBSCRIPTIONS && (
            <section className="admin-panel-section">
              <div className="admin-section-header">
                <h2>اشتراک‌های کاربران</h2>
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
          )}

          {activeTab === TABS.PLANS && (
            <section className="admin-panel-section">
              <div className="admin-section-header">
                <h2>پلن‌های اشتراک</h2>
                <p>تعریف و مدیریت پلن‌ها (نمایش فقط خواندنی در این نسخه)</p>
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
                        قیمت پایه:{' '}
                        {p.base_price?.toLocaleString('fa-IR') || 0} تومان
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
          )}

          {activeTab === TABS.BACKTESTS && (
            <section className="admin-panel-section">
              <div className="admin-section-header">
                <h2>بک‌تست‌ها</h2>
                <p>مانیتورینگ آخرین بک‌تست‌های اجرا شده توسط کاربران</p>
              </div>

              <div className="admin-filters-row">
                <input
                  type="text"
                  placeholder="فیلتر نماد (مثلاً BTC/USDT)"
                  value={backtestSymbolFilter}
                  onChange={(e) => setBacktestSymbolFilter(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="فیلتر نام استراتژی"
                  value={backtestStrategyFilter}
                  onChange={(e) => setBacktestStrategyFilter(e.target.value)}
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
                            b.net_pnl_percent >= 0
                              ? 'text-success'
                              : 'text-danger'
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
          )}

          {activeTab === TABS.TRADES && (
            <section className="admin-panel-section">
              <div className="admin-section-header">
                <h2>ژورنال ترید</h2>
                <p>نمای زنده از آخرین معاملات ربات روی اکانت‌ها</p>
              </div>

              <div className="admin-filters-row">
                <input
                  type="text"
                  placeholder="فیلتر نماد (مثلاً BTC/USDT)"
                  value={tradeSymbolFilter}
                  onChange={(e) => setTradeSymbolFilter(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="فیلتر نام استراتژی"
                  value={tradeStrategyFilter}
                  onChange={(e) => setTradeStrategyFilter(e.target.value)}
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
                          className={
                            t.pnl_percent >= 0 ? 'text-success' : 'text-danger'
                          }
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
          )}

          {activeTab === TABS.CONFIG && (
            <section className="admin-panel-section">
              <div className="admin-section-header">
                <h2>تنظیمات سیستم</h2>
                <p>مدیریت key/value های مهم سیستم (env-level در دیتابیس)</p>
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
                    {configItems.map((c) => (
                      <tr key={c.id}>
                        <td>{c.key}</td>
                        <td>
                          <input
                            type="text"
                            value={configEdits[c.id] ?? ''}
                            onChange={(e) =>
                              handleConfigValueChange(c.id, e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <button
                            className="btn-primary"
                            disabled={savingConfigId === c.id}
                            onClick={() => handleConfigSave(c)}
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
          )}
        </div>
      )}
    </div>
  )
}

