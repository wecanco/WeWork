import React, { useEffect } from 'react'
import axios from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import HomePage from './components/HomePage'
import DashboardLayout from './components/DashboardLayout'
import AdminLayout from './components/AdminLayout'
import AdminDashboard from './components/AdminDashboard'
import AdminUsers from './components/AdminUsers'
import AdminPayments from './components/AdminPayments'
import AdminSubscriptions from './components/AdminSubscriptions'
import AdminPlans from './components/AdminPlans'
import AdminConfig from './components/AdminConfig'
import AdminHealth from './components/AdminHealth'
import AdminNotifications from './components/AdminNotifications'
import PaymentResult from './components/PaymentResult'
import NotificationsPanel from './components/NotificationsPanel'
import UserProfile from './components/UserProfile'
import { AuthProvider, useAuth } from './components/AuthContext'
import { ToastProvider } from './components/Toast'
import { ConfirmModalProvider } from './components/ConfirmModal'
import './App.css'
import { API_BASE_URL } from './config'

const queryClient = new QueryClient()

function SubscriptionPage() {
  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [payments, setPayments] = React.useState([])
  const [paymentsLoading, setPaymentsLoading] = React.useState(true)
  const [paymentsError, setPaymentsError] = React.useState('')

  React.useEffect(() => {
    let cancelled = false

    const fetchSubscription = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await axios.get(`${API_BASE_URL}/billing/me/subscription`)
        if (!cancelled) {
          setData(res.data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.detail || 'خطا در دریافت وضعیت اشتراک')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    const fetchPayments = async () => {
      setPaymentsLoading(true)
      setPaymentsError('')
      try {
        const res = await axios.get(`${API_BASE_URL}/billing/me/payments`)
        if (!cancelled) {
          setPayments(res.data.payments || [])
        }
      } catch (err) {
        if (!cancelled) {
          setPaymentsError(err?.response?.data?.detail || 'خطا در دریافت لیست پرداخت‌ها')
        }
      } finally {
        if (!cancelled) {
          setPaymentsLoading(false)
        }
      }
    }

    fetchSubscription()
    fetchPayments()

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <div>در حال بارگذاری...</div>

  const paymentStatuses = {
    paid: 'پرداخت شده',
    pending: 'در انتظار تایید',
    failed: 'ناموفق',
    cancelled: 'لغو شده',
  }

  return (
    <div className="subscription-page">
      {error ? (
        <div className="error-text">{error}</div>
      ) : data?.active ? (
        <div className="subscription-card">
          <h2>اشتراک فعال من</h2>
          <p>پلن: {data.plan_name || '—'}</p>
          <p>
            بازه: {data.start_at ? new Date(data.start_at).toLocaleDateString('fa-IR') : '—'} تا{' '}
            {data.end_at ? new Date(data.end_at).toLocaleDateString('fa-IR') : '—'}
          </p>
          <h3>ویژگی‌ها</h3>
          <ul>
            {Object.entries(data.features || {}).map(([k, v]) => (
              <li key={k}>
                {k}: {String(v)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="subscription-card empty">
          <h2>اشتراک فعال ندارید</h2>
          <p>از صفحه اصلی می‌توانید پلن شخصی‌سازی شده خود را بسازید و پرداخت کنید.</p>
        </div>
      )}

      <section id="payments" className="payment-history-section">
        <div className="payment-history-header">
          <h3>تاریخچه پرداخت‌ها</h3>
          <p>لیست تمام پرداخت‌های انجام شده در پنل کاربری شما</p>
        </div>
        {paymentsLoading && <p>در حال دریافت تاریخچه پرداخت...</p>}
        {!paymentsLoading && paymentsError && <p className="error-text">{paymentsError}</p>}
        {!paymentsLoading && !paymentsError && payments.length === 0 && (
          <p>تا کنون پرداختی ثبت نشده است.</p>
        )}
        {!paymentsLoading && !paymentsError && payments.length > 0 && (
          <div className="payment-history-table-wrapper">
            <table className="payment-history-table">
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>مبلغ</th>
                  <th>وضعیت</th>
                  <th>کد پیگیری</th>
                  <th>پلن</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.paid_at
                        ? new Date(p.paid_at).toLocaleString('fa-IR')
                        : new Date(p.created_at).toLocaleString('fa-IR')}
                    </td>
                    <td>
                      {typeof p.amount === 'number'
                        ? `${p.amount.toLocaleString('fa-IR')} ${p.currency}`
                        : '—'}
                    </td>
                    <td>{paymentStatuses[p.status] || p.status}</td>
                    <td>{p.ref_id || '—'}</td>
                    <td>{p.plan_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <div>در حال بررسی حساب کاربری...</div>
  if (!user) return <Navigate to="/" replace />
  return children
}

function PushInit() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidKey) return

    const urlBase64ToUint8Array = (base64String) => {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
      const rawData = window.atob(base64)
      const outputArray = new Uint8Array(rawData.length)
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
      }
      return outputArray
    }

    const registerPush = async () => {
      try {
        if (Notification.permission === 'denied') return
        if (Notification.permission !== 'granted') {
          const perm = await Notification.requestPermission()
          if (perm !== 'granted') return
        }

        const reg = await navigator.serviceWorker.register('/sw.js')
        const existing = await reg.pushManager.getSubscription()
        const subscription =
          existing ||
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          }))

        const raw = subscription.toJSON()
        await axios.post(`${API_BASE_URL}/notifications/push-subscriptions`, {
          endpoint: raw.endpoint,
          p256dh: raw.keys?.p256dh,
          auth: raw.keys?.auth,
          user_agent: navigator.userAgent,
        })
      } catch {
        // عدم موفقیت در وب‌پوش نباید UX اصلی را خراب کند
      }
    }

    registerPush()
  }, [user])

  return null
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <ConfirmModalProvider>
            <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/payment/success" element={<PaymentResult variant="success" />} />
            <Route path="/payment/failure" element={<PaymentResult variant="failure" />} />
            <Route path="/user/:userIdOrUsername" element={<UserProfile />} />

            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <>
                    <PushInit />
                    <DashboardLayout />
                  </>
                </ProtectedRoute>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="home" element={<HomePage />} />
              <Route path="notifications" element={<NotificationsPanel />} />
              <Route path="subscription" element={<SubscriptionPage />} />
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="health" element={<AdminHealth />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="plans" element={<AdminPlans />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="config" element={<AdminConfig />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
          </ConfirmModalProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App

