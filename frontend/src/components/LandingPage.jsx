import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import PricingBuilder from './PricingBuilder'
import AuthModal from './AuthModal'

export default function LandingPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showAuth, setShowAuth] = useState(false)

  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="logo">WeWork Framework</div>
        <nav>
          <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
            ویژگی‌ها
          </button>
          <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
            پلن‌ها
          </button>
          <button onClick={() => document.getElementById('howitworks')?.scrollIntoView({ behavior: 'smooth' })}>
            راهنما
          </button>
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <span className="user-greeting">سلام، {user.full_name || user.email}</span>
              <button className="secondary-btn" onClick={() => navigate('/app')}>
                پنل کاربری
              </button>
              <button className="ghost-btn" onClick={logout}>
                خروج
              </button>
            </>
          ) : (
            <button className="primary-btn" onClick={() => setShowAuth(true)}>
              ورود / ثبت‌نام
            </button>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-text">
            <h1 className="text-size-24">«فریمورک کامل برای ساخت اپلیکیشن‌های وب مدرن»</h1>
            <p>
              با WeWork Framework می‌توانید به سرعت اپلیکیشن‌های وب کامل با Backend (FastAPI) و Frontend (React) بسازید.
              با CLI قدرتمند، المان‌های مختلف را به راحتی ایجاد کنید.
            </p>
            <div className="hero-actions">
              <button className="primary-btn" onClick={() => (user ? navigate('/app') : setShowAuth(true))}>
                شروع کنید
              </button>
              <button className="secondary-btn" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
                مشاهده پلن‌ها
              </button>
            </div>
            <div className="hero-badge">
              فریمورک خام و عمومی - برای هر نوع پروژه‌ای قابل استفاده است.
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card">
              <span className="hero-chip">WeWork Framework</span>
              <h3>Full-Stack Framework</h3>
              <p>Backend: <strong>FastAPI</strong></p>
              <p>Frontend: <strong>React 19</strong></p>
              <div className="hero-gradient"></div>
            </div>
          </div>
        </section>

        <section id="features" className="section">
          <h2>ویژگی‌ها</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <h3>CLI قدرتمند</h3>
              <p>با دستورات ساده، API، Model، Component و Hook ایجاد کنید.</p>
            </div>
            <div className="feature-card">
              <h3>معماری ماژولار</h3>
              <p>ساختار تمیز و قابل توسعه برای پروژه‌های بزرگ و کوچک.</p>
            </div>
            <div className="feature-card">
              <h3>پنل ادمین و مدیریت کاربران</h3>
              <p>سیستم احراز هویت، مدیریت کاربران و پلن‌های اشتراکی آماده.</p>
            </div>
          </div>
        </section>

        <section id="pricing" className="section">
          <h2>پلن‌ها و کاستوم‌سازی اشتراک</h2>
          <p className="section-subtitle">
            یک پلن رایگان با ۱ استراتژی فعال همیشه در دسترس است. برای امکانات بیشتر پلن خودت را با اسلایدر زیر بساز.
          </p>
          <PricingBuilder onRequireLogin={() => setShowAuth(true)} />
        </section>

        <section id="howitworks" className="section section-muted">
          <h2>شروع سریع</h2>
          <ol className="steps-list">
            <li>نصب فریمورک و ایجاد پروژه جدید</li>
            <li>استفاده از CLI برای ایجاد API، Model و Component</li>
            <li>توسعه و سفارشی‌سازی بر اساس نیاز پروژه</li>
          </ol>
        </section>
      </main>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} WeWork Framework</span>
        <span>فریمورک خام و عمومی برای ساخت اپلیکیشن‌های وب مدرن</span>
      </footer>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}


