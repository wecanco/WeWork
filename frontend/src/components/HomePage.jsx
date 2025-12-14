import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import './HomePage.css'

/**
 * HomePage Component
 * 
 * صفحه اصلی عمومی برای کاربران لاگین شده
 * این کامپوننت یک داشبورد خام و عمومی است که می‌توانید
 * المان‌های مورد نیاز خود را به آن اضافه کنید.
 */
export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="homepage">
      <div className="homepage-header">
        <h1>خوش آمدید {user?.full_name || user?.email}</h1>
        <p>به پنل کاربری خود خوش آمدید</p>
      </div>

      <div className="homepage-content">
        <div className="homepage-grid">
          {/* کارت‌های نمونه - می‌توانید با CLI ایجاد کنید */}
          <div className="homepage-card">
            <div className="homepage-card-header">
              <h3>شروع سریع</h3>
            </div>
            <div className="homepage-card-body">
              <p>از اینجا می‌توانید شروع کنید:</p>
              <div className="homepage-actions">
                <button 
                  className="homepage-btn homepage-btn-primary" 
                  onClick={() => navigate('/app/notifications')}
                >
                  مشاهده اعلان‌ها
                </button>
                <button 
                  className="homepage-btn homepage-btn-secondary" 
                  onClick={() => navigate('/app/subscription')}
                >
                  مدیریت اشتراک
                </button>
              </div>
            </div>
          </div>

          <div className="homepage-card">
            <div className="homepage-card-header">
              <h3>اطلاعات حساب</h3>
            </div>
            <div className="homepage-card-body">
              <div className="homepage-info">
                <div className="info-row">
                  <span>نام:</span>
                  <span>{user?.full_name || '—'}</span>
                </div>
                <div className="info-row">
                  <span>ایمیل:</span>
                  <span>{user?.email || '—'}</span>
                </div>
                <div className="info-row">
                  <span>نقش:</span>
                  <span>{user?.role?.title || user?.role || 'کاربر'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="homepage-card">
            <div className="homepage-card-header">
              <h3>راهنما</h3>
            </div>
            <div className="homepage-card-body">
              <p>برای ایجاد المان‌های جدید از CLI استفاده کنید:</p>
              <div className="homepage-code">
                <code>wework make:component MyComponent</code>
                <code>wework make:api myapi</code>
                <code>wework make:model MyModel</code>
              </div>
            </div>
          </div>
        </div>

        {/* بخش خالی برای المان‌های آینده */}
        <div className="homepage-section">
          <h2>المان‌های شما</h2>
          <div className="homepage-empty-state">
            <p className="homepage-empty-title">هنوز المانی ایجاد نشده</p>
            <p className="homepage-empty-message">از CLI برای ایجاد API، Model و Component استفاده کنید</p>
          </div>
        </div>
      </div>
    </div>
  )
}

