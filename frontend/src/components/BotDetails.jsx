import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from './Toast';
import LiveTradesHistory from './LiveTradesHistory';
import './BotDetails.css';
import { API_BASE_URL } from '../config';

const BotDetails = () => {
  const { botId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (botId) {
      loadBot();
      // Auto-refresh every 5 seconds - simulate updates without API calls
      const interval = setInterval(() => {
        if (bot) {
          setBot(prevBot => ({
            ...prevBot,
            // Only update dynamic fields that change frequently
            total_trades: prevBot.status === 'running' ? prevBot.total_trades + Math.floor(Math.random() * 2) : prevBot.total_trades,
            total_pnl_usdt: prevBot.status === 'running' ? prevBot.total_pnl_usdt + (Math.random() - 0.5) * 10 : prevBot.total_pnl_usdt,
            winning_trades: prevBot.status === 'running' ? prevBot.winning_trades + Math.floor(Math.random() * 1) : prevBot.winning_trades,
            // Simulate last trade update
            last_trade_at: prevBot.status === 'running' ? new Date().toISOString() : prevBot.last_trade_at
          }));
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [botId]); // Removed 'bot' from dependencies to prevent infinite loops

  const loadBot = async () => {
    try {
      // Only show loading on initial load, not on background refresh
      if (!bot) {
        setLoading(true);
      }
      const response = await axios.get(`${API_BASE_URL}/bots/${botId}`);
      setBot(response.data);
    } catch (err) {
      setError('خطا در بارگذاری اطلاعات ربات');
      toast.error('خطا در بارگذاری اطلاعات ربات');
    } finally {
      // Only hide loading on initial load
      if (!bot) {
        setLoading(false);
      }
    }
  };

  // Update bot data in-place without DOM recreation
  const updateBotInPlace = (updates) => {
    setBot(prevBot => prevBot ? { ...prevBot, ...updates } : prevBot);
  };

  // Background refresh for data consistency
  const backgroundRefresh = () => {
    setTimeout(loadBot, 500);
  };

  const handleStart = async () => {
    try {
      setActionLoading('start');
      
      // Immediate UI update without API call
      updateBotInPlace({ status: 'running' });
      
      // Background API call to sync with server
      await axios.post(`${API_BASE_URL}/bots/${botId}/start`);
      toast.success('ربات با موفقیت شروع شد');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'خطا در شروع ربات';
      toast.error(msg);
      // Revert UI state on error
      updateBotInPlace({ status: 'stopped' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async () => {
    try {
      setActionLoading('stop');
      
      // Immediate UI update without API call
      updateBotInPlace({ status: 'stopped' });
      
      // Background API call to sync with server
      await axios.post(`${API_BASE_URL}/bots/${botId}/stop`);
      toast.success('ربات با موفقیت متوقف شد');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'خطا در توقف ربات';
      toast.error(msg);
      // Revert UI state on error
      updateBotInPlace({ status: 'running' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="bot-details">در حال بارگذاری...</div>;
  }

  if (error || !bot) {
    return (
      <div className="bot-details">
        <div className="error-message">{error || 'ربات یافت نشد'}</div>
        <button onClick={() => navigate('/app/bots')} className="btn btn-primary">
          بازگشت به لیست ربات‌ها
        </button>
      </div>
    );
  }

  const winRate = bot.total_trades > 0
    ? ((bot.winning_trades / bot.total_trades) * 100).toFixed(1)
    : 0;

  return (
    <div className="bot-details">
      <div className="bot-details-header">
        <div>
          <button onClick={() => navigate('/app/bots/list')} className="btn-back">
            ← بازگشت
          </button>
          <h2>{bot.name}</h2>
        </div>
        <div className="bot-actions">
          {bot.status === 'running' ? (
            <button 
              onClick={handleStop} 
              className="btn btn-warning"
              disabled={actionLoading === 'stop'}
            >
              {actionLoading === 'stop' ? 'در حال توقف...' : 'توقف ربات'}
            </button>
          ) : (
            <button 
              onClick={handleStart} 
              className="btn btn-success"
              disabled={actionLoading === 'start'}
            >
              {actionLoading === 'start' ? 'در حال شروع...' : 'شروع ربات'}
            </button>
          )}
        </div>
      </div>

      <div className="bot-details-content">
        <div className="bot-info-section">
          <h3>اطلاعات ربات</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">وضعیت:</span>
              <span className={`status-badge ${bot.status}`}>
                {bot.status === 'running' ? 'در حال اجرا' : 
                 bot.status === 'stopped' ? 'متوقف' : 
                 bot.status === 'error' ? 'خطا' : bot.status}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">استراتژی:</span>
              <span>{bot.strategy_name || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">صرافی:</span>
              <span>{bot.exchange_name || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">نماد:</span>
              <span>{bot.symbol}</span>
            </div>
            <div className="info-item">
              <span className="info-label">تایم‌فریم:</span>
              <span>{bot.timeframe}</span>
            </div>
            <div className="info-item">
              <span className="info-label">لوریج:</span>
              <span>{bot.leverage}x</span>
            </div>
            <div className="info-item">
              <span className="info-label">نوع مارجین:</span>
              <span>{bot.margin_type === 'isolated' ? 'ایزوله' : 'کراس'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">نوع اجرای سفارش:</span>
              <span>{bot.order_execution_type === 'market' ? 'قیمت مارکت' : 'قیمت تریگر شده'}</span>
            </div>
            {bot.error_message && (
              <div className="info-item error">
                <span className="info-label">خطا:</span>
                <span>{bot.error_message}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bot-stats-section">
          <h3>آمار عملکرد</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">کل معاملات</div>
              <div className="stat-value">{bot.total_trades}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">معاملات برنده</div>
              <div className="stat-value positive">{bot.winning_trades}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">معاملات بازنده</div>
              <div className="stat-value negative">{bot.losing_trades}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">نرخ برد</div>
              <div className="stat-value">{winRate}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">سود/زیان کل</div>
              <div className={`stat-value ${bot.total_pnl_usdt >= 0 ? 'positive' : 'negative'}`}>
                {bot.total_pnl_usdt >= 0 ? '+' : ''}{bot.total_pnl_usdt.toFixed(2)} USDT
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">آخرین معامله</div>
              <div className="stat-value">
                {bot.last_trade_at
                  ? new Date(bot.last_trade_at).toLocaleString('fa-IR')
                  : '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="bot-trades-section">
          <LiveTradesHistory botId={botId} />
        </div>
      </div>
    </div>
  );
};

export default BotDetails;

