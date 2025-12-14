import React, { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config'

const AuthContext = createContext(null)

// Helper to set/remove the default Authorization header for all axios requests
const setAxiosAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete axios.defaults.headers.common['Authorization']
  }
}

// Check if token is expired without making API call
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const currentTime = Date.now() / 1000
    return payload.exp < currentTime
  } catch (error) {
    return true // If we can't parse the token, consider it expired
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine)

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setNetworkStatus(true)
    const handleOffline = () => setNetworkStatus(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const me = await axios.get(`${API_BASE_URL}/auth/me`)
      setUser(me.data)
      return me.data
    } catch (error) {
      // If network is offline, don't immediately logout
      if (!navigator.onLine) {
        throw new Error('Network offline')
      }
      
      // Handle specific error cases
      const status = error.response?.status
      if (status === 401 || status === 403) {
        // Token is invalid/expired - this is expected logout
        localStorage.removeItem('access_token')
        setAxiosAuthToken(null)
        setUser(null)
        throw error
      }
      throw error
    }
  }

  // Axios interceptor to handle profile incomplete errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 428) {
          // Profile incomplete error - redirect to profile page
          const errorData = error.response.data?.detail || {}
          if (errorData.error_code === 'PROFILE_INCOMPLETE') {
            // Store error info for display
            sessionStorage.setItem('profile_incomplete_error', JSON.stringify({
              message: errorData.message || 'لطفاً پروفایل خود را تکمیل کنید',
              missing_fields: errorData.missing_fields || []
            }))
            // Redirect will be handled by the component that catches this
            // Use window.location to ensure full page reload and proper navigation
            if (window.location.pathname.startsWith('/app')) {
              window.location.href = '/app?profile=edit'
            } else {
              window.location.href = '/app?profile=edit'
            }
          }
        }
        return Promise.reject(error)
      }
    )

    return () => {
      axios.interceptors.response.eject(interceptor)
    }
  }, [])

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('access_token')
      
      if (!token) {
        setAxiosAuthToken(null)
        setLoading(false)
        return
      }

      // Check if token is expired before making API call
      if (isTokenExpired(token)) {
        localStorage.removeItem('access_token')
        setAxiosAuthToken(null)
        setLoading(false)
        return
      }

      // Set token in axios headers
      setAxiosAuthToken(token)

      // Only try to fetch user if network is online
      if (navigator.onLine) {
        try {
          await fetchCurrentUser()
        } catch (error) {
          // Error is already handled in fetchCurrentUser
          // If it's a network error, keep the user logged in
          if (error.message !== 'Network offline') {
            console.warn('Failed to fetch current user:', error)
          }
        }
      } else {
        // Network is offline, assume user is still logged in
        // We'll verify when network comes back online
        console.info('Network offline, skipping user verification')
      }
      
      setLoading(false)
    }

    initializeAuth()
  }, [])

  // Re-authenticate when network comes back online
  useEffect(() => {
    if (networkStatus && user) {
      // Network came back online and we have a stored token
      // Try to verify the user is still valid
      const token = localStorage.getItem('access_token')
      if (token && !isTokenExpired(token)) {
        fetchCurrentUser().catch((error) => {
          console.warn('Re-authentication failed:', error)
          // Only logout if it's a real authentication error, not network
          if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem('access_token')
            setAxiosAuthToken(null)
            setUser(null)
          }
        })
      }
    }
  }, [networkStatus])

  const requestOtp = async (phoneNumber) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/request-otp`, {
        phone_number: phoneNumber,
      })
      return res.data
    } catch (error) {
      // Don't throw network errors for OTP requests
      if (!navigator.onLine) {
        throw new Error('اتصال اینترنت برقرار نیست. لطفاً اتصال خود را بررسی کنید.')
      }
      throw error
    }
  }

  const verifyOtp = async (phoneNumber, code, fullName) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login-otp`, {
        phone_number: phoneNumber,
        code,
        full_name: fullName,
      })
      const token = res.data.access_token
      
      // Store token in localStorage (IP-agnostic storage)
      localStorage.setItem('access_token', token)
      setAxiosAuthToken(token)

      await fetchCurrentUser()
    } catch (error) {
      // Don't throw network errors for login
      if (!navigator.onLine) {
        throw new Error('اتصال اینترنت برقرار نیست. لطفاً اتصال خود را بررسی کنید.')
      }
      throw error
    }
  }

  const refreshUser = () => fetchCurrentUser()

  const updateProfile = async (updates) => {
    const res = await axios.patch(`${API_BASE_URL}/auth/me`, updates)
    setUser(res.data)
    return res.data
  }

  const logout = () => {
    // Clear token from localStorage (IP-agnostic storage)
    localStorage.removeItem('access_token')
    setAxiosAuthToken(null)
    setUser(null)
  }

  const value = {
    user,
    loading,
    networkStatus,
    requestOtp,
    verifyOtp,
    logout,
    isAdmin: user?.role?.name === 'admin' || user?.role?.name === 'super_admin',
    refreshUser,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

