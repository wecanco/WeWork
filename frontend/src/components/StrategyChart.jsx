import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { createChart, ColorType, PriceScaleMode, LineStyle } from 'lightweight-charts'
import { STRATEGIES_API_BASE_URL } from '../config'
import { useToast } from './Toast'
import './StrategyChart.css'

const TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d']
const COLOR_PALETTE = ['#16a34a', '#2563eb', '#c026d3', '#f59e0b', '#06b6d4', '#f97316', '#22c55e']

const resolveSignalId = (sig) =>
  sig?.id ?? sig?.signal_id ?? sig?.signalId ?? sig?._id ?? sig?.uuid ?? sig?.uid
const formatLabel = (label, sig) => {
  const id = resolveSignalId(sig)
  return id ? `${label} #${id}` : label
}
const extractExitPrice = (sig, candle) => {
  const liq =
    sig?.liquidation_price ??
    sig?.liquidationPrice ??
    sig?.liquidation ??
    sig?.liq ??
    sig?.liq_price ??
    sig?.liqPrice
  const tp =
    sig?.take_profit_hit
      ? sig?.take_profit ?? sig?.takeProfit ?? sig?.tp ?? sig?.take_profit_price ?? sig?.takeProfitPrice
      : sig?.take_profit ?? sig?.takeProfit ?? sig?.tp ?? sig?.take_profit_price ?? sig?.takeProfitPrice
  const sl =
    sig?.stop_loss ??
    sig?.stopLoss ??
    sig?.sl ??
    sig?.stop ??
    sig?.stop_price ??
    sig?.stopPrice ??
    sig?.stoploss
  const exit = sig?.exit_price ?? sig?.exitPrice
  // Priority: liquidation > TP > SL > exit_price
  // TP comes before SL because TP is a better exit (profit vs loss)
  const price = liq ?? tp ?? sl ?? exit
  if (price !== undefined && price !== null) return Number(price)
  const fallback =
    candle?.close ??
    candle?.low ??
    candle?.high ??
    candle?.open ??
    (Array.isArray(candle?.values) ? candle.values[3] : undefined)
  return fallback !== undefined ? Number(fallback) : undefined
}
const getExitReason = (sig, candle, exitPrice, prevSide) => {
  if (!exitPrice || !prevSide) return null
  const tp =
    sig?.take_profit ??
    sig?.takeProfit ??
    sig?.tp ??
    sig?.take_profit_price ??
    sig?.takeProfitPrice
  const sl =
    sig?.stop_loss ??
    sig?.stopLoss ??
    sig?.sl ??
    sig?.stop ??
    sig?.stop_price ??
    sig?.stopPrice ??
    sig?.stoploss
  const prevSignalObj = sig
  const prevTp =
    prevSignalObj?.take_profit ??
    prevSignalObj?.takeProfit ??
    prevSignalObj?.tp ??
    prevSignalObj?.take_profit_price ??
    prevSignalObj?.takeProfitPrice
  const prevSl =
    prevSignalObj?.stop_loss ??
    prevSignalObj?.stopLoss ??
    prevSignalObj?.sl ??
    prevSignalObj?.stop ??
    prevSignalObj?.stop_price ??
    prevSignalObj?.stopPrice ??
    prevSignalObj?.stoploss
  const tpVal = tp ?? prevTp
  const slVal = sl ?? prevSl
  if (tpVal !== undefined && tpVal !== null) {
    const tolerance = Math.abs(exitPrice - tpVal) / tpVal
    if (tolerance < 0.001) return 'TP'
  }
  if (slVal !== undefined && slVal !== null) {
    const tolerance = Math.abs(exitPrice - slVal) / slVal
    if (tolerance < 0.001) return 'SL'
  }
  if (sig?.take_profit_hit || sig?.takeProfitHit) return 'TP'
  if (sig?.stop_loss_hit || sig?.stopLossHit) return 'SL'
  return null
}
const calculatePNL = (entryPrice, exitPrice, side) => {
  if (!entryPrice || !exitPrice || !side) return null
  const entry = Number(entryPrice)
  const exit = Number(exitPrice)
  if (side === 'long') {
    return ((exit - entry) / entry) * 100
  } else if (side === 'short') {
    return ((entry - exit) / entry) * 100
  }
  return null
}

export default function StrategyChart() {
  const toast = useToast()
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const candleSeriesRef = useRef(null)
  const indicatorSeriesRef = useRef({})
  const exitLineSeriesRef = useRef(null)
  const entryLineSeriesRef = useRef(null)

  const [strategies, setStrategies] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [symbol, setSymbol] = useState('BTC/USDT')
  const [timeframe, setTimeframe] = useState('15m')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [scaleMode, setScaleMode] = useState('normal') // normal | percent | log
  const [loading, setLoading] = useState(false)
  const [strategiesLoading, setStrategiesLoading] = useState(false)
  const [chartData, setChartData] = useState(null)
  const [error, setError] = useState('')
  const [indicatorStyles, setIndicatorStyles] = useState({})
  const [indicatorOverrides, setIndicatorOverrides] = useState({})
  const [hoverInfo, setHoverInfo] = useState(null)
  const [pinnedSignal, setPinnedSignal] = useState(null)
  const [showIndicatorsModal, setShowIndicatorsModal] = useState(false)

  const selectedStrategy = useMemo(
    () => strategies.find((s) => String(s.id) === String(selectedId)),
    [strategies, selectedId]
  )

  useEffect(() => {
    const fmt = (d) => {
      const pad = (n) => String(n).padStart(2, '0')
      const year = d.getFullYear()
      const month = pad(d.getMonth() + 1)
      const day = pad(d.getDate())
      const h = pad(d.getHours())
      const m = pad(d.getMinutes())
      return `${year}-${month}-${day}T${h}:${m}`
    }
    const now = new Date()
    const end = new Date(now)
    const start = new Date(now)
    start.setDate(start.getDate() - 7)
    // انتهای روز هفت روز قبل
    start.setHours(23, 59, 0, 0)
    setEndDate(fmt(end))
    setStartDate(fmt(start))
  }, [])

  useEffect(() => {
    const loadStrategies = async () => {
      setStrategiesLoading(true)
      setError('')
      try {
        // بدون فیلتر تا همه استراتژی‌های قابل مشاهده (شخصی و عمومی) برگردد
        const res = await axios.get(STRATEGIES_API_BASE_URL)
        const items = Array.isArray(res.data) ? res.data : res.data.items || []
        setStrategies(items)
      } catch (err) {
        setError(err?.response?.data?.detail || 'خطا در دریافت لیست استراتژی')
      } finally {
        setStrategiesLoading(false)
      }
    }

    loadStrategies()
  }, [])

  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return
    const chart = createChart(chartContainerRef.current, {
      layout: { textColor: '#e5e7eb', background: { type: ColorType.Solid, color: '#0f172a' } },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      timeScale: { borderColor: 'rgba(255,255,255,0.08)' },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
      crosshair: { mode: 1 },
    })
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#16a34a',
      downColor: '#dc2626',
      borderUpColor: '#16a34a',
      borderDownColor: '#dc2626',
      wickUpColor: '#16a34a',
      wickDownColor: '#dc2626',
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
  }, [])

  const loadChartData = async () => {
    if (!selectedId) {
      toast.warning('ابتدا یک استراتژی را انتخاب کنید')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${STRATEGIES_API_BASE_URL}/${selectedId}/chart-data`, {
        symbol,
        timeframe,
        include_indicators: true,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
        indicator_overrides: indicatorOverrides && Object.keys(indicatorOverrides).length ? indicatorOverrides : undefined,
      })
      setChartData(res.data)
      toast.success('چارت به‌روز شد')
    } catch (err) {
      const msg = err?.response?.data?.detail || 'خطا در دریافت داده چارت'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectStrategy = (value) => {
    setSelectedId(value || '')
    // پاک کردن داده قبلی تا با انتخاب جدید دوباره لود شود
    setChartData(null)
  }

  useEffect(() => {
    if (!chartRef.current || !chartData || !candleSeriesRef.current) return

    const candles = (chartData.candles || []).map((c) => ({
      time: c.timestamp / 1000,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
    }))
    // Adjust price scale mode
    const priceScaleOptions =
      scaleMode === 'percent'
        ? { mode: PriceScaleMode.Percentage }
        : scaleMode === 'log'
          ? { mode: PriceScaleMode.Logarithmic }
          : { mode: PriceScaleMode.Normal }
    candleSeriesRef.current.applyOptions({ priceScaleId: 'right' })
    chartRef.current.priceScale('right').applyOptions({
      mode: priceScaleOptions.mode,
      autoScale: true,
      borderVisible: true,
      scaleMargins: { top: 0.2, bottom: 0.15 },
    })
    candleSeriesRef.current.setData(candles)

    // Improve readability: show a reasonable number of bars with wider spacing
    const width = chartContainerRef.current?.clientWidth || 900
    const visibleBars = Math.min(candles.length || 0, 160) || 80
    const dynamicSpacing = width / visibleBars
    const barSpacing = Math.max(8, Math.min(24, dynamicSpacing))
    chartRef.current.timeScale().applyOptions({
      barSpacing,
      rightOffset: 10,
      minBarSpacing: 6,
    })
    if (candles.length > visibleBars) {
      const from = Math.max(0, candles.length - visibleBars - 2)
      const to = candles.length + 2
      chartRef.current.timeScale().setVisibleLogicalRange({ from, to })
    }

    const signals = chartData.signals || []
    const markers = []
    const exitPoints = []
    const entryPoints = []
    let prev = 0
    signals.forEach((s, idx) => {
      const signal = s.signal || 0
      const time = s.timestamp / 1000
      const candle = chartData.candles?.[idx]
      const prevSignalObj = idx > 0 ? signals[idx - 1] || {} : {}

      // Entry
      if (signal !== 0 && prev === 0) {
        const entryPrice =
          s.price ??
          candle?.close ??
          candle?.open ??
          candle?.low ??
          candle?.high ??
          (Array.isArray(candle?.values) ? candle.values[3] : undefined)
        markers.push({
          time,
          position: signal > 0 ? 'belowBar' : 'aboveBar',
          color: signal > 0 ? '#16a34a' : '#dc2626',
          shape: signal > 0 ? 'arrowUp' : 'arrowDown',
          text: signal > 0 ? formatLabel('LONG', s) : formatLabel('SHORT', s),
        })
        if (entryPrice !== undefined) {
          entryPoints.push({ time, value: Number(entryPrice) })
        }
      }

      // Pure exit (current record represents exit)
      if (signal === 0 && prev !== 0) {
        const exitPrice = extractExitPrice(s, candle) ?? extractExitPrice(prevSignalObj, candle)
        const exitReason = getExitReason(s, candle, exitPrice, prev > 0 ? 'long' : 'short') ?? getExitReason(prevSignalObj, candle, exitPrice, prev > 0 ? 'long' : 'short')
        const exitLabel = exitReason ? `EXIT (${exitReason})` : 'EXIT'
        const label = formatLabel(exitLabel, s) ?? formatLabel(exitLabel, prevSignalObj)
        const exitColor = exitReason === 'TP' ? '#22c55e' : exitReason === 'SL' ? '#ef4444' : '#f97316'
        markers.push({
          time,
          position: prev > 0 ? 'aboveBar' : 'belowBar',
          color: exitColor,
          shape: 'circle',
          text: label,
          ...(exitPrice !== undefined ? { price: Number(exitPrice) } : {}),
        })
        if (exitPrice !== undefined) {
          exitPoints.push({ time, value: Number(exitPrice) })
        }
      }

      // Flip: exit previous, enter current
      if (signal !== 0 && prev !== 0 && signal !== prev) {
        const exitPrice = extractExitPrice(prevSignalObj, candle) ?? extractExitPrice(s, candle)
        const exitReason = getExitReason(prevSignalObj, candle, exitPrice, prev > 0 ? 'long' : 'short') ?? getExitReason(s, candle, exitPrice, prev > 0 ? 'long' : 'short')
        const exitLabel = exitReason ? `EXIT (${exitReason})` : 'EXIT'
        const exitColor = exitReason === 'TP' ? '#22c55e' : exitReason === 'SL' ? '#ef4444' : '#f97316'
        markers.push({
          time,
          position: prev > 0 ? 'aboveBar' : 'belowBar',
          color: exitColor,
          shape: 'circle',
          text: formatLabel(exitLabel, prevSignalObj) ?? formatLabel(exitLabel, s),
          ...(exitPrice !== undefined ? { price: Number(exitPrice) } : {}),
        })
        if (exitPrice !== undefined) {
          exitPoints.push({ time, value: Number(exitPrice) })
        }
        markers.push({
          time,
          position: signal > 0 ? 'belowBar' : 'aboveBar',
          color: signal > 0 ? '#16a34a' : '#dc2626',
          shape: signal > 0 ? 'arrowUp' : 'arrowDown',
          text: signal > 0 ? formatLabel('LONG', s) : formatLabel('SHORT', s),
        })
        const entryPrice =
          s.price ??
          candle?.close ??
          candle?.open ??
          candle?.low ??
          candle?.high ??
          (Array.isArray(candle?.values) ? candle.values[3] : undefined)
        if (entryPrice !== undefined) {
          entryPoints.push({ time, value: Number(entryPrice) })
        }
      }
      prev = signal
    })
    candleSeriesRef.current.setMarkers(markers)

    // Exit price line series to anchor EXIT markers at exact SL/TP/exit price
    if (!exitLineSeriesRef.current) {
      exitLineSeriesRef.current = chartRef.current.addLineSeries({
        color: '#f97316',
        lineWidth: 2,
        lineStyle: LineStyle.LargeDashed,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      })
    }
    exitLineSeriesRef.current.setData(exitPoints)

    // Entry price points to anchor LONG/SHORT at exact entry price
    if (!entryLineSeriesRef.current) {
      entryLineSeriesRef.current = chartRef.current.addLineSeries({
        color: '#22c55e',
        lineWidth: 0,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: true,
        lineStyle: LineStyle.SparseDotted,
      })
    }
    entryLineSeriesRef.current.setData(entryPoints)

    // Clean previous indicator series
    Object.values(indicatorSeriesRef.current || {}).forEach((series) => {
      try {
        chartRef.current.removeSeries(series)
      } catch {
        // ignore
      }
    })
    indicatorSeriesRef.current = {}
    if (exitLineSeriesRef.current) {
      try {
        chartRef.current.removeSeries(exitLineSeriesRef.current)
      } catch {
        // ignore
      }
      exitLineSeriesRef.current = null
    }
    if (entryLineSeriesRef.current) {
      try {
        chartRef.current.removeSeries(entryLineSeriesRef.current)
      } catch {
        // ignore
      }
      entryLineSeriesRef.current = null
    }

    const indicators = chartData.indicators || []
    let hasOscillators = false
    indicators.forEach((ind, idx) => {
      const style = indicatorStyles[ind.id] || {}
      const indType = (ind.type || '').toLowerCase()
      const isOscillator =
        indType.includes('rsi') ||
        indType.includes('stochastic') ||
        indType.includes('constant') ||
        indType.includes('threshold')
      if (isOscillator) {
        hasOscillators = true
      }
      const series = chartRef.current.addLineSeries({
        color: style.color || COLOR_PALETTE[idx % COLOR_PALETTE.length],
        lineWidth: Number(style.width || 2),
        title: ind.label || ind.type,
        priceScaleId: isOscillator ? 'osc' : 'right',
        visible: style.visible !== false,
      })
      const values = ind.values || []
      const lineData = []
      for (let i = 0; i < values.length && i < candles.length; i++) {
        const v = values[i]
        if (v === null || v === undefined) continue
        lineData.push({ time: candles[i].time, value: Number(v) })
      }
      series.setData(lineData)
      indicatorSeriesRef.current[ind.id] = series
    })

    // Separate scale for oscillators
    if (hasOscillators) {
      const oscScale = chartRef.current.priceScale('osc')
      if (oscScale) {
        oscScale.applyOptions({
          scaleMargins: { top: 0.7, bottom: 0.05 },
          autoScale: true,
        })
      }
    }

    chartRef.current.timeScale().fitContent()

    const buildSignalDetail = (idx) => {
      if (!signals || !signals.length) return null
      const current = signals[idx]?.signal || 0
      const prev = idx > 0 ? signals[idx - 1]?.signal || 0 : 0
      if (current !== 0 && prev === 0) {
        return { type: 'entry', side: current > 0 ? 'long' : 'short' }
      }
      if (current === 0 && prev !== 0) {
        return { type: 'exit', side: prev > 0 ? 'long' : 'short' }
      }
      if (current !== 0 && prev !== 0 && current !== prev) {
        return { type: 'flip', from: prev > 0 ? 'long' : 'short', to: current > 0 ? 'long' : 'short' }
      }
      return null
    }

    // Hover handling
    chartRef.current.subscribeCrosshairMove((param) => {
      if (!param.time || !chartData?.candles?.length) {
        setHoverInfo(null)
        return
      }
      const tsMs = param.time * 1000
      const idx = chartData.candles.findIndex((c) => c.timestamp === tsMs)
      if (idx === -1) {
        setHoverInfo(null)
        return
      }
      const candle = chartData.candles[idx]
      const signalObj = signals[idx] || {}
      const signal = signalObj.signal || 0
      const indicatorValues = {}
      indicators.forEach((ind) => {
        const values = ind.values || []
        indicatorValues[ind.id] = values[idx] ?? null
      })
      setHoverInfo({
        timestamp: tsMs,
        candle,
        signal,
        indicators: indicatorValues,
        idx,
        signals,
        signalObj,
      })
    })

    // Click handling to pin signal info
    chartRef.current.subscribeClick((param) => {
      if (!param.time || !chartData?.candles?.length) {
        setPinnedSignal(null)
        return
      }
      const tsMs = param.time * 1000
      const idx = chartData.candles.findIndex((c) => c.timestamp === tsMs)
      if (idx === -1) return
      const candle = chartData.candles[idx]
      const signalObj = signals[idx] || {}
      const signal = signalObj.signal || 0
      const indicatorValues = {}
      indicators.forEach((ind) => {
        const values = ind.values || []
        indicatorValues[ind.id] = values[idx] ?? null
      })
      setPinnedSignal({
        timestamp: tsMs,
        candle,
        signal,
        indicators: indicatorValues,
        idx,
        signals,
        signalObj,
        detail: buildSignalDetail(idx),
      })
    })
  }, [chartData])

  const handleIndicatorStyleChange = (id, field, value) => {
    setIndicatorStyles((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }))
  }

  const handleIndicatorParamChange = (id, param, value) => {
    setIndicatorOverrides((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [param]: value,
      },
    }))
  }

  const signalStats = useMemo(() => {
    if (!chartData?.signals) return { long: 0, short: 0 }
    return chartData.signals.reduce(
      (acc, s) => {
        if (s.signal > 0) acc.long += 1
        if (s.signal < 0) acc.short += 1
        return acc
      },
      { long: 0, short: 0 }
    )
  }, [chartData])

  const findEntryPrice = (signals, idx, side, candles) => {
    if (!signals || !signals.length || idx < 0) return null
    for (let i = idx - 1; i >= 0; i--) {
      const sig = signals[i]?.signal || 0
      if (sig === 0) continue
      if ((side === 'long' && sig > 0) || (side === 'short' && sig < 0)) {
        const entrySig = signals[i]
        const entryCandle = candles?.[i]
        const entryPrice =
          entrySig?.price ??
          entryCandle?.close ??
          entryCandle?.open ??
          entryCandle?.low ??
          entryCandle?.high ??
          (Array.isArray(entryCandle?.values) ? entryCandle.values[3] : undefined)
        return entryPrice !== undefined ? Number(entryPrice) : null
      }
    }
    return null
  }

  const activeSignalInfo = useMemo(() => {
    const source = pinnedSignal || hoverInfo
    if (!source) return null
    const { idx, signals } = source
    if (!signals || !signals.length) return null
    const current = signals[idx]?.signal || 0
    const prev = idx > 0 ? signals[idx - 1]?.signal || 0 : 0
    if (current !== 0 && prev === 0) {
      return { type: 'entry', side: current > 0 ? 'long' : 'short', data: source }
    }
    if (current === 0 && prev !== 0) {
      return { type: 'exit', side: prev > 0 ? 'long' : 'short', data: source }
    }
    if (current !== 0 && prev !== 0 && current !== prev) {
      return { type: 'flip', from: prev > 0 ? 'long' : 'short', to: current > 0 ? 'long' : 'short', data: source }
    }
    return null
  }, [hoverInfo, pinnedSignal])

  const indicatorLabelMap = useMemo(() => {
    const map = {}
    chartData?.indicators?.forEach((ind) => {
      map[ind.id] = ind.label || ind.type || ind.id
    })
    return map
  }, [chartData])

  const renderIndicatorSettings = () => (
    <div className="indicator-panel">
      <div className="indicator-panel-header">تنظیمات موقت اندیکاتورها</div>
      {chartData?.indicators?.map((ind, idx) => {
        const style = indicatorStyles[ind.id] || {}
        const color = style.color || COLOR_PALETTE[idx % COLOR_PALETTE.length]
        const params = ind.params || {}
        const numericParams = Object.entries(params).filter(([, v]) => typeof v === 'number')
        return (
          <div className="indicator-row" key={ind.id || idx}>
            <div className="legend">
              <span className="legend-color" style={{ background: color }} />
              <span className="legend-label">{ind.label || ind.type}</span>
              <span className="legend-type">{ind.type}</span>
            </div>
            <div className="indicator-style">
              <label>
                رنگ
                <input
                  type="color"
                  value={color}
                  onChange={(e) => handleIndicatorStyleChange(ind.id, 'color', e.target.value)}
                />
              </label>
              <label>
                ضخامت
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={style.width || 2}
                  onChange={(e) => handleIndicatorStyleChange(ind.id, 'width', e.target.value)}
                />
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={style.visible !== false}
                  onChange={(e) => handleIndicatorStyleChange(ind.id, 'visible', e.target.checked)}
                />
                نمایش
              </label>
            </div>
            {numericParams.length > 0 && (
              <div className="indicator-params">
                {numericParams.map(([key, val]) => (
                  <label key={key}>
                    {key}
                    <input
                      type="number"
                      defaultValue={val}
                      onChange={(e) => handleIndicatorParamChange(ind.id, key, Number(e.target.value))}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        )
      })}
      <div className="indicator-actions">
        <button className="btn-primary" onClick={loadChartData} disabled={loading}>
          {loading ? 'در حال اعمال...' : 'اعمال تنظیمات اندیکاتور'}
        </button>
        <button className="btn-secondary" onClick={() => setShowIndicatorsModal(false)}>
          بستن
        </button>
      </div>
    </div>
  )

  return (
    <div className="strategy-chart">
      <div className="chart-header">
        <div>
          <h2>چارت تریدینگ‌ویو</h2>
          <p className="chart-subtitle">نمایش کندل‌ها، سیگنال‌ها و اندیکاتورهای استراتژی انتخاب‌شده</p>
        </div>
      </div>

      <div className="chart-controls">
        <div className="control">
          <label>استراتژی</label>
          <select
            value={selectedId || ''}
            onChange={(e) => handleSelectStrategy(e.target.value)}
            disabled={strategiesLoading}
          >
            <option value="">انتخاب کنید</option>
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || s.title || `استراتژی ${s.id}`}
              </option>
            ))}
          </select>
        </div>
        <div className="control">
          <label>نماد</label>
          <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
        </div>
        <div className="control">
          <label>تایم‌فریم</label>
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            {TIMEFRAMES.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
        </div>
        <div className="control">
          <label>تاریخ شروع</label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={endDate || undefined}
          />
        </div>
        <div className="control">
          <label>تاریخ پایان</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || undefined}
          />
        </div>
        <div className="control">
          <label>مقیاس قیمت</label>
          <select value={scaleMode} onChange={(e) => setScaleMode(e.target.value)}>
            <option value="normal">نرمال</option>
            <option value="percent">درصدی</option>
            <option value="log">لگاریتمی</option>
          </select>
        </div>
        <div className="control control-button">
          <label> </label>
          <button className="btn-primary full-width" onClick={loadChartData} disabled={loading}>
            {loading ? 'در حال بارگذاری...' : 'بارگذاری چارت'}
          </button>
        </div>
      </div>

      {error && <div className="chart-error">{error}</div>}

      <div className="chart-area">
        <div className="chart-canvas-wrap">
          <div className="chart-overlay">
            {hoverInfo ? (
              <div className="topbar-row">
                <span className="topbar-time">
                  {new Date(hoverInfo.timestamp).toLocaleDateString('fa-IR')} -{' '}
                  {new Date(hoverInfo.timestamp).toLocaleTimeString('fa-IR')}
                </span>
                <span>O: {hoverInfo.candle.open}</span>
                <span>H: {hoverInfo.candle.high}</span>
                <span>L: {hoverInfo.candle.low}</span>
                <span>C: {hoverInfo.candle.close}</span>
                <span>V: {hoverInfo.candle.volume}</span>
                {hoverInfo.signal !== 0 && (
                  <span className={`signal-badge ${hoverInfo.signal > 0 ? 'long' : 'short'}`}>
                    {hoverInfo.signal > 0 ? 'LONG' : 'SHORT'}
                  </span>
                )}
              </div>
            ) : (
              <div className="topbar-row muted">با حرکت موس روی کندل، اطلاعات نمایش داده می‌شود</div>
            )}
          </div>
          <div className="chart-canvas" ref={chartContainerRef} />
        </div>
        <div className="chart-info">
          <div className="stat">
            <span className="stat-label">تعداد سیگنال خرید</span>
            <span className="stat-value positive">{signalStats.long}</span>
          </div>
          <div className="stat">
            <span className="stat-label">تعداد سیگنال فروش</span>
            <span className="stat-value negative">{signalStats.short}</span>
          </div>
          <div className="stat">
            <span className="stat-label">
              تعداد اندیکاتور
              {chartData?.indicators?.length > 0 && (
                <button
                  className="icon-button"
                  title="تنظیمات اندیکاتورها"
                  onClick={() => setShowIndicatorsModal(true)}
                >
                  ⚙️
                </button>
              )}
            </span>
            <span className="stat-value">{chartData?.indicators?.length || 0}</span>
          </div>
          {activeSignalInfo && (
            <div className="signal-detail-box">
              {(() => {
                const id = resolveSignalId(activeSignalInfo.data.signalObj)
                const exitPrice =
                  activeSignalInfo.type === 'exit' || activeSignalInfo.type === 'flip'
                    ? extractExitPrice(activeSignalInfo.data.signalObj, activeSignalInfo.data.candle)
                    : undefined
                const exitReason =
                  activeSignalInfo.type === 'exit' || activeSignalInfo.type === 'flip'
                    ? getExitReason(
                        activeSignalInfo.data.signalObj,
                        activeSignalInfo.data.candle,
                        exitPrice,
                        activeSignalInfo.type === 'exit' ? activeSignalInfo.side : activeSignalInfo.from
                      )
                    : null
                const entryPriceForPNL =
                  activeSignalInfo.type === 'exit' || activeSignalInfo.type === 'flip'
                    ? findEntryPrice(
                        activeSignalInfo.data.signals,
                        activeSignalInfo.data.idx,
                        activeSignalInfo.type === 'exit' ? activeSignalInfo.side : activeSignalInfo.from,
                        chartData?.candles
                      )
                    : null
                const pnl =
                  exitPrice && entryPriceForPNL
                    ? calculatePNL(
                        entryPriceForPNL,
                        exitPrice,
                        activeSignalInfo.type === 'exit' ? activeSignalInfo.side : activeSignalInfo.from
                      )
                    : null
                return (
                  <>
                    {activeSignalInfo.type === 'entry' && (
                      <>
                        <span className={`signal-chip entry entry-${activeSignalInfo.side}`}>
                          ورود {activeSignalInfo.side === 'long' ? 'لانگ' : 'شورت'}
                        </span>
                        {id && <span className="signal-meta">شماره سیگنال: {id}</span>}
                        <span className="signal-meta">
                          زمان: {new Date(activeSignalInfo.data.timestamp).toLocaleString('fa-IR')}
                        </span>
                        <span className="signal-meta">قیمت: {activeSignalInfo.data.candle.close}</span>
                        <span className="signal-meta">High: {activeSignalInfo.data.candle.high}</span>
                        <span className="signal-meta">Low: {activeSignalInfo.data.candle.low}</span>
                        {activeSignalInfo.data.signalObj?.take_profit && (
                          <span className="signal-meta">TP: {activeSignalInfo.data.signalObj.take_profit}</span>
                        )}
                        {activeSignalInfo.data.signalObj?.stop_loss && (
                          <span className="signal-meta">SL: {activeSignalInfo.data.signalObj.stop_loss}</span>
                        )}
                      </>
                    )}
                    {activeSignalInfo.type === 'exit' && (
                      <>
                        <span className="signal-chip exit">
                          خروج {activeSignalInfo.side === 'long' ? 'لانگ' : 'شورت'}
                          {exitReason && ` (${exitReason})`}
                        </span>
                        {id && <span className="signal-meta">شماره سیگنال: {id}</span>}
                        <span className="signal-meta">
                          زمان: {new Date(activeSignalInfo.data.timestamp).toLocaleString('fa-IR')}
                        </span>
                        <span className="signal-meta">
                          قیمت: {exitPrice !== undefined ? exitPrice : activeSignalInfo.data.candle.close}
                        </span>
                        {entryPriceForPNL && (
                          <span className="signal-meta">قیمت ورود: {entryPriceForPNL}</span>
                        )}
                        {pnl !== null && (
                          <span className={`signal-meta ${pnl >= 0 ? 'positive' : 'negative'}`}>
                            PNL: {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                          </span>
                        )}
                        <span className="signal-meta">High: {activeSignalInfo.data.candle.high}</span>
                        <span className="signal-meta">Low: {activeSignalInfo.data.candle.low}</span>
                        {activeSignalInfo.data.signalObj?.take_profit && (
                          <span className="signal-meta">TP: {activeSignalInfo.data.signalObj.take_profit}</span>
                        )}
                        {activeSignalInfo.data.signalObj?.stop_loss && (
                          <span className="signal-meta">SL: {activeSignalInfo.data.signalObj.stop_loss}</span>
                        )}
                      </>
                    )}
                    {activeSignalInfo.type === 'flip' && (
                      <>
                        <span className="signal-chip exit">
                          خروج {activeSignalInfo.from === 'long' ? 'لانگ' : 'شورت'}
                          {exitReason && ` (${exitReason})`}
                        </span>
                        <span className="signal-chip entry">
                          ورود {activeSignalInfo.to === 'long' ? 'لانگ' : 'شورت'}
                        </span>
                        {id && <span className="signal-meta">شماره سیگنال: {id}</span>}
                        <span className="signal-meta">
                          زمان: {new Date(activeSignalInfo.data.timestamp).toLocaleString('fa-IR')}
                        </span>
                        <span className="signal-meta">
                          قیمت: {exitPrice !== undefined ? exitPrice : activeSignalInfo.data.candle.close}
                        </span>
                        {entryPriceForPNL && (
                          <span className="signal-meta">قیمت ورود: {entryPriceForPNL}</span>
                        )}
                        {pnl !== null && (
                          <span className={`signal-meta ${pnl >= 0 ? 'positive' : 'negative'}`}>
                            PNL: {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                          </span>
                        )}
                        <span className="signal-meta">High: {activeSignalInfo.data.candle.high}</span>
                        <span className="signal-meta">Low: {activeSignalInfo.data.candle.low}</span>
                        {activeSignalInfo.data.signalObj?.take_profit && (
                          <span className="signal-meta">TP: {activeSignalInfo.data.signalObj.take_profit}</span>
                        )}
                        {activeSignalInfo.data.signalObj?.stop_loss && (
                          <span className="signal-meta">SL: {activeSignalInfo.data.signalObj.stop_loss}</span>
                        )}
                      </>
                    )}
                    {activeSignalInfo.data?.indicators && (
                      <div className="signal-indicators">
                        {Object.entries(activeSignalInfo.data.indicators)
                          .slice(0, 4)
                          .map(([idKey, val]) => (
                            <span key={idKey} className="signal-meta">
                              {indicatorLabelMap[idKey] || idKey}: {val ?? '—'}
                            </span>
                          ))}
                      </div>
                    )}
                    {pinnedSignal && activeSignalInfo?.data === pinnedSignal && (
                      <span className="signal-pinned-note">این سیگنال پین شده است (با کلیک آزاد می‌شود)</span>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </div>
      </div>

      {showIndicatorsModal && (
        <div className="modal-backdrop" onClick={() => setShowIndicatorsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {renderIndicatorSettings()}
          </div>
        </div>
      )}
    </div>
  )
}

