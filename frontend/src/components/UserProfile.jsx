import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import StrategyCard from './StrategyCard'
import './UserProfile.css'
import { API_BASE_URL, STRATEGIES_API_BASE_URL } from '../config'

function UserProfile() {
  const { userIdOrUsername } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadUserProfile()
  }, [userIdOrUsername])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Try to load by ID or username
      const isNumeric = /^\d+$/.test(userIdOrUsername)
      const endpoint = isNumeric 
        ? `${API_BASE_URL}/auth/users/${userIdOrUsername}/public`
        : `${API_BASE_URL}/auth/users/username/${userIdOrUsername}/public`
      
      const userRes = await axios.get(endpoint)
      setUser(userRes.data)
      
      // Load user's public strategies
      const strategiesRes = await axios.get(`${STRATEGIES_API_BASE_URL}/user/${userRes.data.id}/public`, {
        params: {
          limit: 100
        }
      })
      
      const strategiesData = Array.isArray(strategiesRes.data) 
        ? strategiesRes.data 
        : (strategiesRes.data.items || [])
      
      setStrategies(strategiesData)
      
    } catch (err) {
      setError(err?.response?.data?.detail || 'خطا در بارگذاری پروفایل کاربر')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="user-profile-loading">در حال بارگذاری...</div>
  }

  if (error) {
    return (
      <div className="user-profile-error">
        <p>{error}</p>
        <button onClick={() => navigate('/')} className="btn-back">
          بازگشت به صفحه اصلی
        </button>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="user-profile-error">
        <p>کاربر یافت نشد</p>
        <button onClick={() => navigate('/')} className="btn-back">
          بازگشت به صفحه اصلی
        </button>
      </div>
    )
  }

  return (
    <div className="user-profile">
      <div className="user-profile-header">
        <button onClick={() => navigate(-1)} className="btn-back">
          ← بازگشت
        </button>
      </div>
      
      <div className="user-profile-content">
        <div className="user-profile-card">
          <div className="user-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt={user.full_name || user.username} />
            ) : (
              <div className="avatar-placeholder">
                {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h1 className="user-name">{user.full_name || user.username || 'کاربر ناشناس'}</h1>
          {user.username && (
            <p className="user-username">@{user.username}</p>
          )}
          {user.bio && (
            <p className="user-bio">{user.bio}</p>
          )}
          <div className="user-meta">
            <span>عضو از: {new Date(user.created_at).toLocaleDateString('fa-IR')}</span>
          </div>
        </div>

        <div className="user-strategies-section">
          <h2>استراتژی‌های عمومی ({strategies.length})</h2>
          {strategies.length === 0 ? (
            <div className="empty-state">
              <p>این کاربر هنوز استراتژی عمومی‌ای منتشر نکرده است.</p>
            </div>
          ) : (
            <div className="strategies-grid">
              {strategies.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  showOwner={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserProfile

