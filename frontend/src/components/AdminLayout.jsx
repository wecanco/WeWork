import React, { useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function AdminLayout() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAdmin) {
      navigate('/app/strategies')
    }
  }, [isAdmin, navigate])

  if (!isAdmin) {
    return null
  }

  return (
    <div className="admin-layout">
      {/* <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title">ادمین پنل</h2>
        <nav className="admin-sidebar-nav">
          <NavLink end to="/app/admin">
            داشبورد
          </NavLink>
          <NavLink to="/app/admin/health">سلامت سیستم</NavLink>
          <NavLink to="/app/admin/notifications">اعلان‌ها</NavLink>
          <NavLink to="/app/admin/users">کاربران</NavLink>
          <NavLink to="/app/admin/payments">پرداخت‌ها</NavLink>
          <NavLink to="/app/admin/subscriptions">اشتراک‌ها</NavLink>
          <NavLink to="/app/admin/plans">پلن‌ها</NavLink>
          <NavLink to="/app/admin/backtests">بک‌تست‌ها</NavLink>
          <NavLink to="/app/admin/trades">ژورنال ترید</NavLink>
          <NavLink to="/app/admin/strategy-insights">Strategy Intelligence</NavLink>
          <NavLink to="/app/admin/user-cohorts">User Cohorts</NavLink>
          <NavLink to="/app/admin/risk">Risk View</NavLink>
          <NavLink to="/app/admin/config">تنظیمات سیستم</NavLink>
          <NavLink to="/app/admin/file-based-bots">بات‌های مبتنی بر فایل</NavLink>
        </nav>
      </aside> */}
      <section className="admin-main">
        <Outlet />
      </section>
    </div>
  )
}


