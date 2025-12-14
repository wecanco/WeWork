import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from './AuthContext'
import { useAppVersion } from '../hooks/useAppVersion'
import { API_BASE_URL } from '../config'
import {
  Target,
  Wrench,
  CreditCard,
  LayoutDashboard,
  Users,
  Activity,
  Home,
  Layers,
  BarChart3,
  BookOpen,
  Lightbulb,
  Shield,
  Settings,
  Crown,
  ShoppingCart,
  Star,
  Bell,
  MoreHorizontal,
  X,
  Building2,
  Bot,
} from 'lucide-react'

const USER_NAV = [
  {
    id: 'home',
    label: 'صفحه اصلی',
    path: '/app/home',
    description: 'داشبورد اصلی',
    section: 'عمومی',
    surface: 'primary',
    icon: 'home',
    platforms: { mobile: true, desktop: true },
  },
  {
    id: 'subscription',
    label: 'اشتراک من',
    path: '/app/subscription',
    description: 'وضعیت پلن و فاکتورهای اخیر',
    section: 'مالی',
    surface: 'primary',
    icon: 'billing',
    platforms: { mobile: true, desktop: true },
  },
  {
    id: 'notifications',
    label: 'اعلان‌ها',
    path: '/app/notifications',
    description: 'مرکز اعلان‌های سیستم',
    section: 'عمومی',
    surface: 'primary',
    icon: 'bell',
    platforms: { mobile: true, desktop: true },
  },
]

const ADMIN_CHILDREN = [
  {
    id: 'admin-dashboard',
    label: 'داشبورد ادمین',
    path: '/app/admin',
    description: 'دید کلی KPI و سلامت سیستم',
    section: 'ادمین',
    surface: 'primary',
    icon: 'dashboard',
    platforms: { mobile: true, desktop: true },
  },
  {
    id: 'admin-users',
    label: 'کاربران',
    path: '/app/admin/users',
    description: 'مدیریت دسترسی و وضعیت مشترکین',
    section: 'ادمین',
    surface: 'primary',
    icon: 'users',
    platforms: { mobile: true, desktop: true },
  },
  {
    id: 'admin-health',
    label: 'سلامت سیستم',
    path: '/app/admin/health',
    description: 'مانیتورینگ سرویس‌ها و هشدارها',
    section: 'ادمین',
    surface: 'primary',
    icon: 'health',
    platforms: { mobile: true, desktop: true },
  },
  {
    id: 'admin-notifications',
    label: 'اعلان‌ها',
    path: '/app/admin/notifications',
    description: 'ارسال اعلان به همه یا کاربران منتخب',
    section: 'ادمین',
    surface: 'primary',
    icon: 'bell',
    platforms: { mobile: true, desktop: true },
  },
  {
    id: 'admin-payments',
    label: 'پرداخت‌ها',
    path: '/app/admin/payments',
    description: 'جریان‌های مالی اخیر',
    section: 'ادمین',
    icon: 'billing',
    platforms: { mobile: true, desktop: true },
  },
  {
    id: 'admin-subscriptions',
    label: 'اشتراک‌ها',
    path: '/app/admin/subscriptions',
    description: 'پلن‌ها و دوره‌های فعال',
    section: 'ادمین',
    icon: 'subscription',
    platforms: { mobile: true, desktop: true },
  },
  {
    id: 'admin-plans',
    label: 'پلن‌ها',
    path: '/app/admin/plans',
    description: 'پیکربندی پلن‌های فروش',
    section: 'ادمین',
    icon: 'layers',
    platforms: { mobile: true, desktop: true },
  },
  {
    id: 'admin-config',
    label: 'تنظیمات سیستم',
    path: '/app/admin/config',
    description: 'درگاه‌های اتصال، API و پایپ‌لاین',
    section: 'ادمین',
    icon: 'settings',
    platforms: { mobile: true, desktop: true },
  },
]

const getNavConfig = (isAdmin) =>
  isAdmin
    ? [
        ...USER_NAV,
        {
          id: 'admin',
          label: 'مدیریت سیستم',
          path: '/app/admin',
          description: 'کنسول مدیریتی و گزارش‌ها',
          section: 'ادمین',
          surface: 'secondary',
          icon: 'dashboard',
          platforms: { mobile: true, desktop: true },
          children: ADMIN_CHILDREN,
        },
      ]
    : USER_NAV

const filterNavItems = (items, platform = 'mobile') =>
  items
    .filter((item) => item.platforms?.[platform] !== false)
    .map((item) => {
      const children = item.children ? filterNavItems(item.children, platform) : undefined
      return { ...item, children }
    })
    .filter((item) => item.path || (item.children && item.children.length > 0))

const flattenNavItems = (items, platform = 'mobile') => {
  const filtered = filterNavItems(items, platform)
  const result = []
  const walk = (list) => {
    list.forEach((item) => {
      result.push(item)
      if (item.children) {
        walk(item.children)
      }
    })
  }
  walk(filtered)
  return result
}

const resolveIcon = (name) => {
  const iconProps = { size: 20, 'aria-hidden': 'true' }
  switch (name) {
    case 'strategy':
      return <Target {...iconProps} />
    case 'builder':
      return <Wrench {...iconProps} />
    case 'billing':
      return <CreditCard {...iconProps} />
    case 'dashboard':
      return <LayoutDashboard {...iconProps} />
    case 'users':
      return <Users {...iconProps} />
    case 'health':
      return <Activity {...iconProps} />
    case 'home':
      return <Home {...iconProps} />
    case 'layers':
      return <Layers {...iconProps} />
    case 'analytics':
      return <BarChart3 {...iconProps} />
    case 'journal':
      return <BookOpen {...iconProps} />
    case 'insight':
      return <Lightbulb {...iconProps} />
    case 'shield':
      return <Shield {...iconProps} />
    case 'settings':
      return <Settings {...iconProps} />
    case 'subscription':
      return <Crown {...iconProps} />
    case 'market':
      return <ShoppingCart {...iconProps} />
    case 'star':
      return <Star {...iconProps} />
    case 'bell':
      return <Bell {...iconProps} />
    case 'exchange':
      return <Building2 {...iconProps} />
    case 'bot':
      return <Bot {...iconProps} />
    default:
      return <MoreHorizontal {...iconProps} />
  }
}

export default function DashboardLayout() {
  const { user, logout, isAdmin, updateProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { version, isUpdated } = useAppVersion()
  const [isMobile, setIsMobile] = useState(false)
  const [menuSheetOpen, setMenuSheetOpen] = useState(false)
  const [showUpdateToast, setShowUpdateToast] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [profilePanelMode, setProfilePanelMode] = useState(null)
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    username: '',
    bio: '',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileFeedback, setProfileFeedback] = useState('')
  const [profileError, setProfileError] = useState('')
  const accountMenuRef = useRef(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const [sidebarOpenMenus, setSidebarOpenMenus] = useState({})

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 960px)')
    const handleResize = (e) => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', handleResize)
    return () => mq.removeEventListener('change', handleResize)
  }, [])

  useEffect(() => {
    if (isUpdated) {
      setShowUpdateToast(true)
      const timeout = setTimeout(() => setShowUpdateToast(false), 4000)
      return () => clearTimeout(timeout)
    }
  }, [isUpdated])

  useEffect(() => {
    let cancelled = false
    const fetchUnread = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/notifications/unread-count`)
        if (!cancelled && res.data) {
          setUnreadCount(res.data.unread_count || 0)
        }
      } catch (e) {
        // ignore
      }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 60000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const navConfig = useMemo(() => getNavConfig(isAdmin), [isAdmin])
  const mobileNav = useMemo(() => filterNavItems(navConfig, 'mobile'), [navConfig])
  const desktopNav = useMemo(() => filterNavItems(navConfig, 'desktop'), [navConfig])
  const mobileFlatNav = useMemo(() => flattenNavItems(navConfig, 'mobile'), [navConfig])

  const primaryActions = useMemo(
    () => mobileNav.filter((item) => item.surface === 'primary').slice(0, 3),
    [mobileNav]
  )

  const groupedMenu = useMemo(() => {
    return mobileFlatNav.reduce((acc, item) => {
      const key = item.section || 'سایر'
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})
  }, [mobileFlatNav])


  const isStrategyBuilderView = false

  useEffect(() => {
    setProfileForm({
      full_name: user?.full_name || '',
      username: user?.username || '',
      bio: user?.bio || '',
    })
  }, [user])

  // Check for profile incomplete error from sessionStorage
  useEffect(() => {
    const errorData = sessionStorage.getItem('profile_incomplete_error')
    if (errorData) {
      try {
        const error = JSON.parse(errorData)
        setProfileError(error.message || 'لطفاً پروفایل خود را تکمیل کنید')
        if (error.missing_fields && error.missing_fields.length > 0) {
          setProfileError(
            `${error.message}\nفیلدهای خالی: ${error.missing_fields.join('، ')}`
          )
        }
        // Open profile panel in edit mode
        if (searchParams.get('profile') === 'edit') {
          setProfilePanelMode('edit')
          // Remove the query param
          searchParams.delete('profile')
          setSearchParams(searchParams, { replace: true })
        }
        // Clear the error from sessionStorage
        sessionStorage.removeItem('profile_incomplete_error')
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!accountMenuOpen) return
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [accountMenuOpen])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false)
        setProfilePanelMode(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    setAccountMenuOpen(false)
  }, [location.pathname, location.search])

  const isActive = (path) => {
    const [pathname, queryString] = path.split('?')
    if (!pathname) return false
    if (pathname !== location.pathname) {
      const isAdminPath = pathname === '/app/admin' && location.pathname.startsWith('/app/admin')
      if (!isAdminPath) {
        return false
      }
    }
    if (queryString) {
      const query = new URLSearchParams(queryString)
      for (const [key, value] of query.entries()) {
        if (searchParams.get(key) !== value) {
          return false
        }
      }
      return true
    }
    if (pathname === '/app/strategies') {
      return !searchParams.get('mode')
    }
    return true
  }

  const handleNavigate = (path) => {
    setMenuSheetOpen(false)
    navigate(path)
  }

  const toggleSidebarMenu = (id) => {
    setSidebarOpenMenus((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  useEffect(() => {
    // Auto open sidebar groups that contain the active route
    setSidebarOpenMenus((prev) => {
      const next = { ...prev }
      desktopNav.forEach((item) => {
        if (item.children && item.children.some((child) => isActive(child.path))) {
          next[item.id] = true
        }
      })
      return next
    })
  }, [desktopNav, location.pathname, location.search])

  const handleProfileInputChange = (field, value) => {
    setProfileForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const openProfilePanel = (mode) => {
    setProfileFeedback('')
    setProfileError('')
    setProfilePanelMode(mode)
    setAccountMenuOpen(false)
  }

  const closeProfilePanel = () => {
    setProfilePanelMode(null)
    setProfileFeedback('')
    setProfileError('')
    setProfileForm({
      full_name: user?.full_name || '',
      username: user?.username || '',
      bio: user?.bio || '',
    })
  }

  const handleProfileSave = async () => {
    try {
      setProfileSaving(true)
      setProfileError('')
      setProfileFeedback('')
      const updates = {
        full_name: profileForm.full_name,
      }
      // Only include username if it's not already set (can only be set once)
      if (!user?.username && profileForm.username) {
        updates.username = profileForm.username
      }
      if (profileForm.bio !== undefined) {
        updates.bio = profileForm.bio
      }
      await updateProfile(updates)
      setProfileFeedback('پروفایل با موفقیت بروزرسانی شد.')
      setProfilePanelMode('view')
    } catch (err) {
      const errorDetail = err?.response?.data?.detail
      if (typeof errorDetail === 'string') {
        setProfileError(errorDetail)
      } else if (errorDetail?.message) {
        setProfileError(errorDetail.message)
      } else {
        setProfileError('خطا در ذخیره پروفایل')
      }
    } finally {
      setProfileSaving(false)
    }
  }

  const handleLogout = () => {
    setAccountMenuOpen(false)
    logout()
  }

  if (!user) {
    navigate('/')
    return null
  }

  const accountInitial =
    (user.full_name && user.full_name.trim().charAt(0)) ||
    (user.email && user.email.trim().charAt(0)) ||
    'A'
  const userRoleLabel = user?.role?.title || 'کاربر'

  // Function to get dynamic page title based on current route
  const getPageTitle = () => {
    const path = location.pathname
    const searchParams = new URLSearchParams(location.search)
    const mode = searchParams.get('mode')

    // Admin routes
    if (path.startsWith('/app/admin')) {
      const adminTitles = {
        '/app/admin': 'داشبورد ادمین',
        '/app/admin/users': 'مدیریت کاربران',
        '/app/admin/health': 'سلامت سیستم',
        '/app/admin/notifications': 'ارسال اعلان',
        '/app/admin/payments': 'مدیریت پرداخت‌ها',
        '/app/admin/subscriptions': 'مدیریت اشتراک‌ها',
      '/app/admin/plans': 'پیکربندی پلن‌ها',
      '/app/admin/config': 'تنظیمات سیستم'
      }
      return adminTitles[path] || 'کنسول ادمین'
    }

    // User routes
    const userTitles = {
      '/': 'صفحه اصلی',
      '/app/home': 'داشبورد',
      '/app/subscription': 'اشتراک من',
      '/app/notifications': 'اعلان‌ها',
    }
    
    return userTitles[path] || 'فضای کاری'
  }

  const topbarTitle = getPageTitle()

  if (isMobile) {
    return (
      <div className="mobile-shell">
        <header className="mobile-header">
          <div>
            <p className="mobile-greeting">سلام {user.full_name || user.email}</p>
            <span className="mobile-role">{user?.role?.title || 'کاربر'}</span>
          </div>
          <button className="mobile-avatar" onClick={() => setMenuSheetOpen(true)}>
            {user.full_name?.[0] || user.email?.[0] || 'A'}
          </button>
        </header>

        {showUpdateToast && (
          <div className="mobile-update-pill">
            نسخه جدید {version} نصب شد ✅
          </div>
        )}

        <section className="mobile-content">
          <Outlet />
        </section>

        <nav className="mobile-bottom-nav">
          {primaryActions.map((item) => (
            <button
              key={item.id}
              className={`mobile-nav-button ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => handleNavigate(item.path)}
            >
              <span className="mobile-nav-icon">{resolveIcon(item.icon)}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <button
            className={`mobile-nav-button mobile-nav-menu ${menuSheetOpen ? 'active' : ''}`}
            onClick={() => setMenuSheetOpen(true)}
          >
            <span className="mobile-nav-icon dots">
              <span />
              <span />
              <span />
            </span>
            <span>منو</span>
          </button>
        </nav>

        <div className={`mobile-menu-sheet ${menuSheetOpen ? 'open' : ''}`}>
          <div className="mobile-menu-backdrop" onClick={() => setMenuSheetOpen(false)} />
          <div className="mobile-menu-card">
            <header className="mobile-menu-header">
              <div>
                <p>{user.full_name || user.email}</p>
                <span>{isAdmin ? 'مدیر سیستم' : 'کاربر پریمیوم'}</span>
              </div>
              <span className="version-chip">v{version}</span>
            </header>
            <div className="mobile-menu-list">
              {Object.entries(groupedMenu).map(([section, items]) => (
                <div key={section} className="mobile-menu-section">
                  <div className="mobile-menu-section-title">{section}</div>
                  {items.map((item) => (
                    <div key={item.id} className="mobile-menu-block">
                      <button
                        className={`mobile-menu-item ${isActive(item.path) ? 'active' : ''}`}
                        onClick={() => handleNavigate(item.path)}
                      >
                        <span className="mobile-menu-icon">{resolveIcon(item.icon)}</span>
                        <span>
                          <div className="mobile-menu-label">{item.label}</div>
                          <div className="mobile-menu-desc">{item.description}</div>
                        </span>
                      </button>
                      {item.children && item.children.length > 0 && (
                        <div className="mobile-menu-children">
                          {item.children.map((child) => (
                            <button
                              key={child.id}
                              className={`mobile-menu-item child ${isActive(child.path) ? 'active' : ''}`}
                              onClick={() => handleNavigate(child.path)}
                            >
                              <span className="mobile-menu-icon">{resolveIcon(child.icon)}</span>
                              <span>
                                <div className="mobile-menu-label">{child.label}</div>
                                <div className="mobile-menu-desc">{child.description}</div>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <button
              className="ghost-btn mobile-logout"
              onClick={() => {
                setMenuSheetOpen(false)
                logout()
              }}
            >
              خروج از حساب
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`dashboard-root ${isStrategyBuilderView ? 'sidebar-hidden' : ''}`}>
      {!isStrategyBuilderView && (
        <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="logo-small">WT</div>
          <div className="sidebar-brand">
            <div className="sidebar-title">WeWork Framework</div>
            <div className="sidebar-subtitle">فریمورک کامل برای توسعه وب</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {desktopNav.map((item) =>
            item.children && item.children.length > 0 ? (
              <div key={item.id} className="sidebar-group">
                <button
                  className={`sidebar-group-toggle ${
                    isActive(item.path) || sidebarOpenMenus[item.id] ? 'active' : ''
                  }`}
                  onClick={() => toggleSidebarMenu(item.id)}
                >
                  <span className="sidebar-icon">{resolveIcon(item.icon)}</span>
                  <span className="sidebar-label">{item.label}</span>
                  <span className="sidebar-caret">{sidebarOpenMenus[item.id] ? '−' : '+'}</span>
                </button>
                <div className={`sidebar-submenu ${sidebarOpenMenus[item.id] ? 'open' : ''}`}>
                  {item.children.map((child) => (
                    <Link
                      key={child.id}
                      to={child.path}
                      className={isActive(child.path) ? 'active' : ''}
                    >
                      <span className="sidebar-icon child">{resolveIcon(child.icon)}</span>
                      <span className="sidebar-label">{child.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={item.id} to={item.path} className={isActive(item.path) ? 'active' : ''}>
                <span className="sidebar-icon">{resolveIcon(item.icon)}</span>
                <span className="sidebar-label">{item.label}</span>
              </Link>
            )
          )}
        </nav>
        <div className="sidebar-version-pill">
          <span>نسخه {version}</span>
          {isUpdated && <span className="sidebar-version-badge">NEW</span>}
        </div>
        </aside>
      )}
      <div className="dashboard-shell">
        <header className="dashboard-topbar">
          <div className="topbar-title">
            <h1>{topbarTitle}</h1>
            <p>به‌روزرسانی شده به نسخه {version}</p>
          </div>
          <div className="topbar-right">
            <button
              className="notifications-button"
              onClick={() => navigate('/app/notifications')}
              title="اعلان‌ها"
            >
              <span className="notifications-icon">{resolveIcon('bell')}</span>
              {unreadCount > 0 && <span className="notifications-badge">{unreadCount}</span>}
            </button>
            <div className="account-cluster" ref={accountMenuRef}>
              <button
                className={`account-pill ${accountMenuOpen ? 'open' : ''}`}
                onClick={() => setAccountMenuOpen((prev) => !prev)}
              >
                <span className="account-avatar">{accountInitial}</span>
                <div className="account-meta">
                  <span className="account-name">{user.full_name || user.email}</span>
                  <span className="account-role">{userRoleLabel}</span>
                </div>
                <span className="account-caret">⌄</span>
              </button>
              {accountMenuOpen && (
                <div className="account-menu">
                  <button onClick={() => openProfilePanel('view')}>مشاهده پروفایل</button>
                  <button onClick={() => openProfilePanel('edit')}>ویرایش پروفایل</button>
                  <button className="danger" onClick={handleLogout}>
                    خروج از حساب
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className={`dashboard-main ${isStrategyBuilderView ? 'full-width' : ''}`}>
          <Outlet />
        </main>
      </div>

      {profilePanelMode && (
        <div className="profile-modal-backdrop" onClick={closeProfilePanel}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <div>
                <h3>{profilePanelMode === 'view' ? 'پروفایل من' : 'ویرایش پروفایل'}</h3>
                <p>اطلاعات حساب کاربری لاگین شده</p>
              </div>
              <button className="profile-close" onClick={closeProfilePanel}>
                <X size={20} />
              </button>
            </div>

            {profileFeedback && <div className="profile-feedback success">{profileFeedback}</div>}
            {profileError && <div className="profile-feedback error">{profileError}</div>}

            {profilePanelMode === 'view' ? (
              <div className="profile-view">
                <div className="profile-field">
                  <span>نام کامل</span>
                  <p>{user.full_name || '—'}</p>
                </div>
                <div className="profile-field">
                  <span>نام کاربری</span>
                  <p>{user.username ? `@${user.username}` : '—'}</p>
                </div>
                <div className="profile-field">
                  <span>ایمیل</span>
                  <p>{user.email}</p>
                </div>
                <div className="profile-field">
                  <span>موبایل</span>
                  <p>{user.phone_number || '—'}</p>
                </div>
                {user.bio && (
                  <div className="profile-field">
                    <span>بیوگرافی</span>
                    <p>{user.bio}</p>
                  </div>
                )}
                <div className="profile-field">
                  <span>نقش</span>
                  <p>{userRoleLabel}</p>
                </div>
                <button className="profile-primary-btn" onClick={() => openProfilePanel('edit')}>
ویرایش اطلاعات
                </button>
              </div>
            ) : (
              <form
                className="profile-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleProfileSave()
                }}
              >
                <label>
                  <span>نام کامل *</span>
                  <input
                    type="text"
                    value={profileForm.full_name}
                    onChange={(e) => handleProfileInputChange('full_name', e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>نام کاربری {!user?.username && '*'}</span>
                  <input
                    type="text"
                    value={profileForm.username}
                    onChange={(e) => handleProfileInputChange('username', e.target.value)}
                    disabled={!!user?.username}
                    placeholder="username"
                    pattern="[a-zA-Z0-9_]+"
                    title="فقط حروف انگلیسی، اعداد و خط زیر مجاز است"
                  />
                  {user?.username ? (
                    <small className="profile-field-hint">نام کاربری فقط یکبار قابل تنظیم است و قابل تغییر نیست.</small>
                  ) : (
                    <small className="profile-field-hint">نام کاربری فقط یکبار قابل تنظیم است. فقط حروف انگلیسی، اعداد و خط زیر مجاز است.</small>
                  )}
                </label>
                <label>
                  <span>بیوگرافی</span>
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) => handleProfileInputChange('bio', e.target.value)}
                    rows={3}
                    placeholder="درباره خودتان بنویسید..."
                  />
                </label>
                <label>
                  <span>شماره موبایل</span>
                  <input
                    type="text"
                    value={user.phone_number || ''}
                    disabled
                    placeholder="09xxxxxxxxx"
                  />
                  <small className="profile-field-hint">ویرایش شماره موبایل از این بخش امکان‌پذیر نیست.</small>
                </label>
                <div className="profile-form-actions">
                  <button type="button" className="profile-secondary-btn" onClick={closeProfilePanel}>
                    انصراف
                  </button>
                  <button type="submit" className="profile-primary-btn" disabled={profileSaving}>
                    {profileSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


