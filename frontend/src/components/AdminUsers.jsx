import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useToast } from './Toast'
import { API_BASE_URL } from '../config'
import { useAuth } from './AuthContext'

export default function AdminUsers() {
  const toast = useToast()
  const { user: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.role?.name === 'super_admin'
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingUserId, setUpdatingUserId] = useState(null)

  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userActiveFilter, setUserActiveFilter] = useState('')

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
    setLoading(true)
    setError('')
    axios
      .get(`${API_BASE_URL}/admin/overview`)
      .then((res) => {
        setUsers(res.data.users || [])
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || 'خطا در دریافت لیست کاربران')
      })
      .finally(() => setLoading(false))
  }, [])

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

  if (loading) return <div className="admin-panel-loading">در حال بارگذاری...</div>
  if (error) return <div className="error-text admin-panel-error">{error}</div>

  return (
    <section className="admin-panel-section">
      <div className="admin-section-header">
        <h1>مدیریت کاربران</h1>
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
              <th>موبایل</th>
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
                <td>{u.phone_number || '-'}</td>
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
  )
}


