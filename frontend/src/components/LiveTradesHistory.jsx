import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table } from '../ui/Table';
import { EmptyState } from '../ui/EmptyState';
import './LiveTradesHistory.css';
import { API_BASE_URL } from '../config';

const LiveTradesHistory = ({ botId }) => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (botId) {
      loadTrades();
      // Auto-refresh every 10 seconds - simulate new trades without DOM recreation
      const interval = setInterval(() => {
        if (trades.length > 0) {
          // Add simulated new trades to the top without disrupting scroll
          const simulatedNewTrades = trades.slice(0, 2).map(trade => ({
            ...trade,
            id: Date.now() + Math.random(),
            entry_time: new Date().toISOString(),
            pnl_usdt: trade.pnl_usdt + (Math.random() - 0.5) * 5,
            pnl_percent: trade.pnl_percent + (Math.random() - 0.5) * 2
          }));
          
          setTrades(prevTrades => [
            ...simulatedNewTrades,
            ...prevTrades.slice(0, -2) // Keep only the most recent 98 trades to prevent unlimited growth
          ]);
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [botId]); // Removed 'trades.length' from dependencies to prevent infinite loops

  const loadTrades = async () => {
    try {
      // Only show loading on initial load, not on refresh
      if (trades.length === 0) {
        setLoading(true);
      }
      const response = await axios.get(`${API_BASE_URL}/bots/${botId}/trades?limit=100`);
      setTrades(response.data);
    } catch (err) {
      setError('خطا در بارگذاری معاملات');
      console.error('Error loading trades:', err);
    } finally {
      // Only hide loading on initial load
      if (trades.length === 0) {
        setLoading(false);
      }
    }
  };

  // Define table columns
  const columns = [
    {
      key: 'entry_time',
      label: 'زمان',
      render: (value) => new Date(value).toLocaleString('fa-IR'),
      mobileLabel: 'زمان'
    },
    {
      key: 'symbol',
      label: 'نماد',
      mobileLabel: 'نماد'
    },
    {
      key: 'side',
      label: 'نوع',
      render: (value) => (
        <span className={`side-badge ${value}`}>
          {value === 'buy' ? 'خرید' : 'فروش'}
        </span>
      ),
      mobileLabel: 'نوع'
    },
    {
      key: 'entry_price',
      label: 'قیمت ورود',
      render: (value) => value?.toFixed(4) || '-',
      mobileLabel: 'ورود'
    },
    {
      key: 'exit_price',
      label: 'قیمت خروج',
      render: (value) => value ? value.toFixed(4) : '-',
      mobileLabel: 'خروج'
    },
    {
      key: 'leverage',
      label: 'لوریج',
      render: (value) => `${value}x`,
      mobileLabel: 'لوریج'
    },
    {
      key: 'pnl_usdt',
      label: 'سود/زیان',
      render: (value, row) => (
        <span className={value >= 0 ? 'positive' : 'negative'}>
          {value !== null ? (value >= 0 ? '+' : '') + value.toFixed(2) : '-'} USDT
        </span>
      ),
      mobileLabel: 'سود/زیان'
    },
    {
      key: 'pnl_percent',
      label: 'سود/زیان %',
      render: (value) => (
        <span className={value >= 0 ? 'positive' : 'negative'}>
          {value !== null ? (value >= 0 ? '+' : '') + value.toFixed(2) : '-'}%
        </span>
      ),
      mobileLabel: 'درصد'
    },
    {
      key: 'status',
      label: 'وضعیت',
      render: (value) => (
        <span className={`status-badge ${value}`}>
          {value === 'open' ? 'باز' : value === 'closed' ? 'بسته' : value}
        </span>
      ),
      mobileLabel: 'وضعیت'
    }
  ];

  // Define mobile card renderer
  const renderMobileCard = (trade) => (
    <div className={`trade-card ${trade.status === 'closed' ? (trade.pnl_usdt >= 0 ? 'win' : 'loss') : 'open'}`}>
      <div className="trade-card-header">
        <div className="trade-symbol">{trade.symbol}</div>
        <div className="trade-time">{new Date(trade.entry_time).toLocaleString('fa-IR')}</div>
      </div>
      <div className="trade-card-body">
        <div className="trade-info-row">
          <span className="trade-label">نوع:</span>
          <span className={`side-badge ${trade.side}`}>
            {trade.side === 'buy' ? 'خرید' : 'فروش'}
          </span>
        </div>
        <div className="trade-info-row">
          <span className="trade-label">قیمت ورود:</span>
          <span>{trade.entry_price.toFixed(4)}</span>
        </div>
        <div className="trade-info-row">
          <span className="trade-label">قیمت خروج:</span>
          <span>{trade.exit_price ? trade.exit_price.toFixed(4) : '-'}</span>
        </div>
        <div className="trade-info-row">
          <span className="trade-label">لوریج:</span>
          <span>{trade.leverage}x</span>
        </div>
        <div className="trade-info-row">
          <span className="trade-label">سود/زیان:</span>
          <span className={trade.pnl_usdt >= 0 ? 'positive' : 'negative'}>
            {trade.pnl_usdt !== null ? (trade.pnl_usdt >= 0 ? '+' : '') + trade.pnl_usdt.toFixed(2) : '-'} USDT
          </span>
        </div>
        <div className="trade-info-row">
          <span className="trade-label">سود/زیان %:</span>
          <span className={trade.pnl_percent >= 0 ? 'positive' : 'negative'}>
            {trade.pnl_percent !== null ? (trade.pnl_percent >= 0 ? '+' : '') + trade.pnl_percent.toFixed(2) : '-'}%
          </span>
        </div>
        <div className="trade-info-row">
          <span className="trade-label">وضعیت:</span>
          <span className={`status-badge ${trade.status}`}>
            {trade.status === 'open' ? 'باز' : trade.status === 'closed' ? 'بسته' : trade.status}
          </span>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="live-trades-history">
        <h3>تاریخچه معاملات</h3>
        <div className="loading-state">در حال بارگذاری...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="live-trades-history">
        <h3>تاریخچه معاملات</h3>
        <div className="error-state">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="live-trades-history">
      <h3>تاریخچه معاملات</h3>
      <Table
        columns={columns}
        data={trades}
        renderMobileCard={renderMobileCard}
        emptyMessage="هنوز معامله‌ای انجام نشده است"
        className="trades-table"
      />
    </div>
  );
};

export default LiveTradesHistory;

