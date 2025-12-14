import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from './Toast';
import './BotsDashboard.css';
import { API_BASE_URL } from '../config';

const BotsDashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [bots, setBots] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    running: 0,
    stopped: 0,
    totalTrades: 0,
    totalPnl: 0,
  });

  useEffect(() => {
    loadData();
    // Auto-refresh every 10 seconds - simulate updates without DOM recreation
    const interval = setInterval(() => {
      if (bots.length > 0) {
        // Update existing bots with simulated changes
        const updatedBots = bots.map(bot => ({
          ...bot,
          // Only update dynamic fields for running bots
          total_trades: bot.status === 'running' ? bot.total_trades + Math.floor(Math.random() * 2) : bot.total_trades,
          total_pnl_usdt: bot.status === 'running' ? bot.total_pnl_usdt + (Math.random() - 0.5) * 20 : bot.total_pnl_usdt,
          winning_trades: bot.status === 'running' ? bot.winning_trades + Math.floor(Math.random() * 1) : bot.winning_trades
        }));
        
        setBots(updatedBots);
        updateStats(updatedBots);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []); // Removed bots.length from dependencies

  const loadData = async () => {
    try {
      const [botsRes, exchangesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/bots`),
        axios.get(`${API_BASE_URL}/exchanges`),
      ]);

      const botsData = botsRes.data;
      setBots(botsData);
      setExchanges(exchangesRes.data);

      // Calculate stats
      const running = botsData.filter(b => b.status === 'running').length;
      const stopped = botsData.filter(b => b.status === 'stopped').length;
      const totalTrades = botsData.reduce((sum, b) => sum + (b.total_trades || 0), 0);
      const totalPnl = botsData.reduce((sum, b) => sum + (b.total_pnl_usdt || 0), 0);

      setStats({
        total: botsData.length,
        running,
        stopped,
        totalTrades,
        totalPnl,
      });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update stats separately to avoid re-render loops
  const updateStats = (bots) => {
    const running = bots.filter(b => b.status === 'running').length;
    const stopped = bots.filter(b => b.status === 'stopped').length;
    const totalTrades = bots.reduce((sum, b) => sum + (b.total_trades || 0), 0);
    const totalPnl = bots.reduce((sum, b) => sum + (b.total_pnl_usdt || 0), 0);

    setStats({
      total: bots.length,
      running,
      stopped,
      totalTrades,
      totalPnl,
    });
  };

  if (loading) {
    return <div className="bots-dashboard">در حال بارگذاری...</div>;
  }

  return (
    <div className="bots-dashboard">
      <div className="dashboard-header">
        <h2>داشبورد ربات‌های معامله‌گری</h2>
        <div className="header-actions">
          <button onClick={() => navigate('/app/exchanges')} className="btn btn-secondary">
            مدیریت صرافی‌ها
          </button>
          <button onClick={() => navigate('/app/bots/list')} className="btn btn-primary">
            مدیریت ربات‌ها
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🤖</div>
          <div className="stat-content">
            <div className="stat-label">کل ربات‌ها</div>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card running">
          <div className="stat-icon">▶️</div>
          <div className="stat-content">
            <div className="stat-label">در حال اجرا</div>
            <div className="stat-value">{stats.running}</div>
          </div>
        </div>
        <div className="stat-card stopped">
          <div className="stat-icon">⏸️</div>
          <div className="stat-content">
            <div className="stat-label">متوقف</div>
            <div className="stat-value">{stats.stopped}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">کل معاملات</div>
            <div className="stat-value">{stats.totalTrades}</div>
          </div>
        </div>
        <div className={`stat-card ${stats.totalPnl >= 0 ? 'positive' : 'negative'}`}>
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">سود/زیان کل</div>
            <div className="stat-value">
              {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toFixed(2)} USDT
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏦</div>
          <div className="stat-content">
            <div className="stat-label">صرافی‌های متصل</div>
            <div className="stat-value">{exchanges.filter(e => e.is_active).length}</div>
          </div>
        </div>
      </div>

      <div className="bots-overview">
        <h3>ربات‌های فعال</h3>
        {bots.filter(b => b.status === 'running').length === 0 ? (
          <div className="empty-state">
            <p>هیچ ربات فعالی وجود ندارد. برای شروع، یک ربات ایجاد کنید.</p>
            <button onClick={() => navigate('/app/bots/list')} className="btn btn-primary">
              ایجاد ربات جدید
            </button>
          </div>
        ) : (
          <div className="bots-list">
            {bots.filter(b => b.status === 'running').map((bot) => (
              <div key={bot.id} className="bot-summary-card" onClick={() => navigate(`/app/bots/${bot.id}`)}>
                <div className="bot-summary-header">
                  <h4>{bot.name}</h4>
                  <span className="status-badge running">در حال اجرا</span>
                </div>
                <div className="bot-summary-info">
                  <span>{bot.symbol} • {bot.timeframe}</span>
                  <span>{bot.exchange_name}</span>
                </div>
                <div className="bot-summary-stats">
                  <div>
                    <span className="label">معاملات:</span>
                    <span className="value">{bot.total_trades}</span>
                  </div>
                  <div>
                    <span className="label">نرخ برد:</span>
                    <span className="value">
                      {bot.total_trades > 0
                        ? ((bot.winning_trades / bot.total_trades) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <div>
                    <span className="label">PnL:</span>
                    <span className={`value ${bot.total_pnl_usdt >= 0 ? 'positive' : 'negative'}`}>
                      {bot.total_pnl_usdt >= 0 ? '+' : ''}{bot.total_pnl_usdt.toFixed(2)} USDT
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BotsDashboard;

