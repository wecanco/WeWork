import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { toPersianDateTime, toDualDateTime } from '../utils/dateUtils'
import { useToast } from './Toast'
import './BacktestPanel.css'
import { STRATEGIES_API_BASE_URL } from '../config'

const API_BASE = STRATEGIES_API_BASE_URL

function BacktestPanel({ strategy, onBack }) {
  const [symbol, setSymbol] = useState('BTC/USDT')
  const [timeframe, setTimeframe] = useState('5m')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [initialCapital, setInitialCapital] = useState(1000)
  const [positionSizingType, setPositionSizingType] = useState('percentage')
  const [positionSizeValue, setPositionSizeValue] = useState(10)
  const [useCompound, setUseCompound] = useState(true)
  const [feePercent, setFeePercent] = useState(0.05)
  const [leverage, setLeverage] = useState(10)
  const [marginType, setMarginType] = useState('isolated')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [jobId, setJobId] = useState(null)
  const [jobStatus, setJobStatus] = useState(null)
  const toast = useToast()

  const timeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d']
  
  // Format a Date to local `datetime-local` input string (YYYY-MM-DDTHH:mm)
  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Get current date/time in local format for max attribute
  const getMaxDateTime = () => {
    const now = new Date()
    // Format: YYYY-MM-DDTHH:mm
    return formatDateTimeLocal(now)
  }
  
  const maxDateTime = getMaxDateTime()

  // Default date range: from 7 days ago until yesterday
  useEffect(() => {
    if (startDate || endDate) return
    const now = new Date()
    const end = new Date(now)
    end.setDate(end.getDate() - 1)
    end.setHours(23, 59, 59, 0) // Set to 23:59:00
    const start = new Date(end)
    start.setDate(start.getDate() - 7)
    start.setHours(0, 0, 0, 0) // Set to 00:00:00
    setStartDate(formatDateTimeLocal(start))
    setEndDate(formatDateTimeLocal(end))
  }, [])

  const handleRunBacktest = async () => {
    if (!startDate || !endDate) {
      toast.warning('لطفا تاریخ شروع و پایان را وارد کنید')
      return
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    const now = new Date()
    
    if (start > now) {
      toast.warning('تاریخ شروع نمی‌تواند در آینده باشد')
      return
    }
    
    if (end > now) {
      toast.warning('تاریخ پایان نمی‌تواند در آینده باشد')
      return
    }
    
    if (end <= start) {
      toast.warning('تاریخ پایان باید بعد از تاریخ شروع باشد')
      return
    }

    setRunning(true)
    setError(null)
    setResult(null)
    setJobId(null)
    setJobStatus(null)

    try {
      // Start backtest job
      const response = await axios.post(`${API_BASE}/backtest`, {
        strategy_id: strategy.id,
        symbol: symbol,
        timeframe: timeframe,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        initial_capital: parseFloat(initialCapital),
        position_sizing_type: positionSizingType,
        position_size_value: parseFloat(positionSizeValue),
        use_compound: useCompound,
        fee_percent: parseFloat(feePercent),
        leverage: parseInt(leverage, 10) || 1,
        margin_type: marginType,
      })

      const newJobId = response.data.job_id
      setJobId(newJobId)
      setJobStatus('pending')
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'خطا در شروع بک تست')
      console.error(err)
      setRunning(false)
    }
  }

  // Poll for job status
  const pollIntervalRef = useRef(null)
  
  useEffect(() => {
    if (!jobId) return

    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusResponse = await axios.get(`${API_BASE}/backtest/jobs/${jobId}`)
        const status = statusResponse.data.status
        setJobStatus(status)
        
        if (status === 'completed') {
          clearInterval(pollIntervalRef.current)
          setRunning(false)
          // Get result
          try {
            const resultResponse = await axios.get(`${API_BASE}/backtest/jobs/${jobId}/result`)
            setResult(resultResponse.data)
          } catch (err) {
            setError('خطا در دریافت نتیجه بک تست')
            console.error(err)
          }
        } else if (status === 'failed') {
          clearInterval(pollIntervalRef.current)
          setRunning(false)
          setError(statusResponse.data.error || 'بک تست با خطا مواجه شد')
        }
      } catch (err) {
        console.error('Error polling job status:', err)
      }
    }, 2000) // Poll every 2 seconds

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [jobId])

  const prepareChartData = () => {
    if (!result || !result.trades) return []

    let cumulativePnl = 0
    return result.trades.map((trade, index) => {
      cumulativePnl += trade.pnl_percent_leveraged
      return {
        trade: index + 1,
        pnl: trade.pnl_percent_leveraged,
        cumulative: cumulativePnl,
        win: trade.win ? 1 : 0,
      }
    })
  }

  return (
    <div className="backtest-panel">
      <div className="backtest-header">
        <button onClick={onBack} className="btn-back">← بازگشت</button>
        <h2>بک تست: {strategy.name}</h2>
      </div>

      <div className="backtest-content">
        <div className="backtest-config">
          <h3>تنظیمات بک تست</h3>

          <div className="config-row">
            <div className="config-field">
              <label>نماد (Symbol)</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="BTC/USDT"
              />
            </div>

            <div className="config-field">
              <label>تایم فریم</label>
              <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                {timeframes.map(tf => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </select>
            </div>

            <div className="config-field">
              <label>لوریج (x)</label>
              <input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                min="1"
                max="1000"
                step="1"
                placeholder="1"
              />
            </div>
            <div className="config-field">
              <label>تاریخ شروع</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={maxDateTime}
                title="تاریخ نمی‌تواند در آینده باشد"
              />
            </div>

            <div className="config-field">
              <label>تاریخ پایان</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                max={maxDateTime}
                min={startDate || undefined}
                title="تاریخ نمی‌تواند در آینده باشد و باید بعد از تاریخ شروع باشد"
              />
            </div>

            <div className="config-field">
              <label>سرمایه اولیه (USDT)</label>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(e.target.value)}
                min="1"
                step="0.01"
                placeholder="1000"
              />
            </div>

          </div>

          <div className="config-row">
          <div className="config-field">
              <label>نوع سایز معامله</label>
              <select value={positionSizingType} onChange={(e) => setPositionSizingType(e.target.value)}>
                <option value="percentage">درصد سرمایه</option>
                <option value="fixed">مقدار ثابت (USDT)</option>
              </select>
            </div>

            <div className="config-field">
              <label>
                {positionSizingType === 'percentage' ? 'درصد سرمایه در هر معامله' : 'مقدار ثابت در هر معامله (USDT)'}
              </label>
              <input
                type="number"
                value={positionSizeValue}
                onChange={(e) => setPositionSizeValue(e.target.value)}
                min="0.01"
                step="0.01"
                placeholder={positionSizingType === 'percentage' ? "10" : "100"}
              />
            </div>

            <div className="config-field">
              <label>نوع مارجین</label>
              <select value={marginType} onChange={(e) => setMarginType(e.target.value)}>
                <option value="isolated">Isolated (ایزوله)</option>
                <option value="cross">Cross (کراس)</option>
              </select>
              <div style={{ marginTop: '4px', fontSize: '0.85em', color: '#666' }}>
                {marginType === 'isolated' 
                  ? 'ایزوله: مارجین فقط برای این پوزیشن استفاده می‌شود' 
                  : 'کراس: مارجین بین تمام پوزیشن‌ها مشترک است'}
              </div>
            </div>
          </div>

          <div className="config-row">
            <div className="config-field">
              <label>کارمزد صرافی (%)</label>
              <input
                type="number"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
                min="0"
                max="1"
                step="0.01"
                placeholder="0.05"
              />
            </div>
            <div className="config-field">
              <label>استفاده از سود ترکیبی</label>
              <label>
                <input
                  type="checkbox"
                  checked={useCompound}
                  onChange={(e) => setUseCompound(e.target.checked)}
                />
                {' '} بله
              </label>
            </div>
          </div>
          <button
            onClick={handleRunBacktest}
            disabled={running}
            className="btn-run-backtest"
          >
            {running ? (jobStatus === 'running' ? 'در حال اجرا...' : 'در حال شروع...') : 'اجرای بک تست'}
          </button>
          
          {jobId && (
            <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
              Job ID: {jobId.substring(0, 8)}... | Status: {jobStatus || 'pending'}
            </div>
          )}
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {result && (
          <div className="backtest-results">
            <h3>نتایج بک تست</h3>

            <div className="results-summary">
              <div className="summary-card">
                <div className="summary-label">تعداد معاملات</div>
                <div className="summary-value">{result.total_trades}</div>
              </div>
              <div className="summary-card">
                <div className="summary-label">برد</div>
                <div className="summary-value success">{result.wins}</div>
              </div>
              <div className="summary-card">
                <div className="summary-label">باخت</div>
                <div className="summary-value danger">{result.losses}</div>
              </div>
              <div className="summary-card">
                <div className="summary-label">نرخ برد</div>
                <div className="summary-value">{result.win_rate.toFixed(2)}%</div>
              </div>
              <div className="summary-card">
                <div className="summary-label">لوریج</div>
                <div className="summary-value">{result.leverage || 1}x</div>
              </div>
              {result.initial_capital && (
                <>
                  <div className="summary-card">
                    <div className="summary-label">سرمایه اولیه</div>
                    <div className="summary-value">{result.initial_capital.toFixed(2)} USDT</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">سرمایه نهایی</div>
                    <div className={`summary-value ${result.final_capital >= result.initial_capital ? 'success' : 'danger'}`}>
                      {result.final_capital?.toFixed(2) || 'N/A'} USDT
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">سود/زیان (USDT)</div>
                    <div className={`summary-value ${result.net_pnl_usdt >= 0 ? 'success' : 'danger'}`}>
                      {result.net_pnl_usdt?.toFixed(2) || '0.00'} USDT
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">سود/زیان (%)</div>
                    <div className={`summary-value ${result.net_pnl_usdt_percent >= 0 ? 'success' : 'danger'}`}>
                      {result.net_pnl_usdt_percent?.toFixed(2) || '0.00'}%
                    </div>
                  </div>
                </>
              )}
              <div className="summary-card">
                <div className="summary-label">سود/زیان خالص</div>
                <div className={`summary-value ${result.net_pnl_percent >= 0 ? 'success' : 'danger'}`}>
                  {result.net_pnl_percent.toFixed(2)}%
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-label">سود/زیان با لوریج</div>
                <div className={`summary-value ${result.net_pnl_percent_leveraged >= 0 ? 'success' : 'danger'}`}>
                  {result.net_pnl_percent_leveraged.toFixed(2)}%
                </div>
              </div>
            </div>

            {result.trades && result.trades.length > 0 && (
              <div className="results-chart">
                <h4>نمودار عملکرد</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={prepareChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="trade" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="cumulative" stroke="#10b981" name="سود/زیان تجمعی" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {result.trades && result.trades.length > 0 && (
              <div className="results-table">
                <h4>لیست معاملات</h4>
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
                      {result.trades.slice(0, 50).map((trade, index) => {
                        const entryDate = toDualDateTime(trade.entry_time)
                        const exitDate = toDualDateTime(trade.exit_time)
                        return (
                          <tr key={index} className={trade.win ? 'win' : 'loss'}>
                            <td>{index + 1}</td>
                            <td>
                              <div style={{ lineHeight: '1.4' }}>
                                <div style={{ fontWeight: 'bold' }}>{entryDate.persian}</div>
                                <div style={{ fontSize: '0.85em', color: '#666' }}>{entryDate.gregorian}</div>
                              </div>
                            </td>
                            <td>
                              <div style={{ lineHeight: '1.4' }}>
                                <div style={{ fontWeight: 'bold' }}>{exitDate.persian}</div>
                                <div style={{ fontSize: '0.85em', color: '#666' }}>{exitDate.gregorian}</div>
                              </div>
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
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default BacktestPanel

