import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { toPersianDateTime, toDualDateTime } from '../utils/dateUtils'
import './BacktestDetails.css'
import { STRATEGIES_API_BASE_URL } from '../config'

const API_BASE = STRATEGIES_API_BASE_URL

function BacktestDetails({ backtestId, onBack }) {
  const [backtestDetails, setBacktestDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (backtestId) {
      fetchBacktestDetails()
    }
  }, [backtestId])

  const fetchBacktestDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(`${API_BASE}/backtest/results/${backtestId}`, {
        params: { limit: 15 }
      })
      setBacktestDetails(response.data)
    } catch (err) {
      console.error('Error fetching backtest details:', err)
      setError('خطا در دریافت جزئیات بک‌تست')
    } finally {
      setLoading(false)
    }
  }

  const prepareChartData = () => {
    if (!backtestDetails || !backtestDetails.trades) return []

    let cumulativePnl = 0
    return backtestDetails.trades.map((trade, index) => {
      cumulativePnl += trade.pnl_percent_leveraged
      return {
        trade: index + 1,
        pnl: trade.pnl_percent_leveraged,
        cumulative: cumulativePnl,
        win: trade.win ? 1 : 0,
      }
    })
  }

  if (loading) {
    return (
      <div className="backtest-details-page">
        <div className="backtest-details-header">
          <button onClick={onBack} className="btn-back">
            ← بازگشت
          </button>
          <h2>جزئیات بک‌تست</h2>
        </div>
        <div className="loading-container">
          <div className="loading">در حال بارگذاری...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="backtest-details-page">
        <div className="backtest-details-header">
          <button onClick={onBack} className="btn-back">
            ← بازگشت
          </button>
          <h2>جزئیات بک‌تست</h2>
        </div>
        <div className="error-container">
          <div className="error">{error}</div>
        </div>
      </div>
    )
  }

  if (!backtestDetails) {
    return (
      <div className="backtest-details-page">
        <div className="backtest-details-header">
          <button onClick={onBack} className="btn-back">
            ← بازگشت
          </button>
          <h2>جزئیات بک‌تست</h2>
        </div>
        <div className="error-container">
          <div className="error">بک‌تست یافت نشد</div>
        </div>
      </div>
    )
  }

  return (
    <div className="backtest-details-page">
      <div className="backtest-details-header">
        <button onClick={onBack} className="btn-back">
          ← بازگشت
        </button>
        <div className="header-info">
          <h2>جزئیات بک‌تست</h2>
          <div className="backtest-meta">
            <span>{backtestDetails.strategy_name}</span>
            <span>•</span>
            <span>{backtestDetails.symbol}</span>
            <span>•</span>
            <span>{backtestDetails.timeframe}</span>
          </div>
        </div>
      </div>

      <div className="backtest-details-content">
        <div className="backtest-results">
          <h3>خلاصه نتایج</h3>

          <div className="results-summary">
            <div className="summary-card">
              <div className="summary-label">تعداد معاملات</div>
              <div className="summary-value">{backtestDetails.total_trades}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">برد</div>
              <div className="summary-value success">{backtestDetails.wins}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">باخت</div>
              <div className="summary-value danger">{backtestDetails.losses}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">نرخ برد</div>
              <div className="summary-value">{backtestDetails.win_rate.toFixed(2)}%</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">لوریج</div>
              <div className="summary-value">{backtestDetails.leverage || 1}x</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">سود/زیان خالص</div>
              <div className={`summary-value ${backtestDetails.net_pnl_percent >= 0 ? 'success' : 'danger'}`}>
                {backtestDetails.net_pnl_percent.toFixed(2)}%
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">سود/زیان با لوریج</div>
              <div className={`summary-value ${backtestDetails.net_pnl_percent_leveraged >= 0 ? 'success' : 'danger'}`}>
                {backtestDetails.net_pnl_percent_leveraged.toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="backtest-period-info">
            <div className="period-item">
              <span className="period-label">تاریخ شروع:</span>
              <span className="period-value">{toPersianDateTime(backtestDetails.start_date)}</span>
            </div>
            <div className="period-item">
              <span className="period-label">تاریخ پایان:</span>
              <span className="period-value">{toPersianDateTime(backtestDetails.end_date)}</span>
            </div>
            <div className="period-item">
              <span className="period-label">تاریخ اجرا:</span>
              <span className="period-value">{toPersianDateTime(backtestDetails.created_at)}</span>
            </div>
          </div>

          {backtestDetails.trades && backtestDetails.trades.length > 0 && (
            <>
              <div className="results-chart">
                <h4>نمودار عملکرد</h4>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={prepareChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="trade" label={{ value: 'شماره معامله', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'سود/زیان (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="cumulative" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="سود/زیان تجمعی" 
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="results-table">
                <h4>لیست معاملات ({backtestDetails.trades.length} معامله)</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>تاریخ ورود</th>
                        <th>تاریخ خروج</th>
                        <th>سمت</th>
                        <th>قیمت ورود</th>
                        <th>قیمت خروج</th>
                        <th>SL</th>
                        <th>TP</th>
                        <th>نقطه لیکویدی</th>
                        <th>مارجین</th>
                        <th>نوع مارجین</th>
                        <th>سود/زیان</th>
                        <th>نتیجه</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backtestDetails.trades.map((trade, index) => (
                        <tr key={trade.id || index} className={trade.win ? 'win' : 'loss'}>
                          <td>{index + 1}</td>
                          <td>
                            {(() => {
                              const entryDate = toDualDateTime(trade.entry_time)
                              return (
                                <div style={{ lineHeight: '1.4' }}>
                                  <div style={{ fontWeight: 'bold' }}>{entryDate.persian}</div>
                                  <div style={{ fontSize: '0.85em', color: '#666' }}>{entryDate.gregorian}</div>
                                </div>
                              )
                            })()}
                          </td>
                          <td>
                            {(() => {
                              const exitDate = toDualDateTime(trade.exit_time)
                              return (
                                <div style={{ lineHeight: '1.4' }}>
                                  <div style={{ fontWeight: 'bold' }}>{exitDate.persian}</div>
                                  <div style={{ fontSize: '0.85em', color: '#666' }}>{exitDate.gregorian}</div>
                                </div>
                              )
                            })()}
                          </td>
                          <td>{trade.side === 'buy' ? 'Long' : 'Short'}</td>
                          <td>{trade.entry_price.toFixed(2)}</td>
                          <td>{trade.exit_price.toFixed(2)}</td>
                          <td>{trade.stop_loss.toFixed(2)}</td>
                          <td>{trade.take_profit.toFixed(2)}</td>
                          <td style={{ color: trade.liquidation_price ? (trade.exit_reason === 'liquidation' ? '#ef4444' : '#6b7280') : '#9ca3af' }}>
                            {trade.liquidation_price ? trade.liquidation_price.toFixed(2) : '-'}
                            {trade.exit_reason === 'liquidation' && ' ⚠️'}
                          </td>
                          <td>{trade.position_margin ? trade.position_margin.toFixed(2) + ' USDT' : '-'}</td>
                          <td>
                            <span style={{ 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              fontSize: '0.85em',
                              backgroundColor: trade.margin_type === 'isolated' ? '#e0f2fe' : '#fef3c7',
                              color: trade.margin_type === 'isolated' ? '#0369a1' : '#92400e'
                            }}>
                              {trade.margin_type === 'isolated' ? 'ایزوله' : 'کراس'}
                            </span>
                          </td>
                          <td className={trade.pnl_percent_leveraged >= 0 ? 'success' : 'danger'}>
                            {trade.pnl_percent_leveraged.toFixed(2)}%
                          </td>
                          <td>{trade.win ? '✅' : '❌'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default BacktestDetails

