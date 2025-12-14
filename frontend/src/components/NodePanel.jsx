import React, { useState, useEffect, useRef } from 'react'
import { Info, BookOpen } from 'lucide-react'
import './NodePanel.css'
import { getNodeGuide, NodeGuideModal } from './StrategyBuilder'

// Helper function to generate comprehensive hints for parameters
function getParamHint(paramKey, paramDef, indicatorType) {
  const hints = {
    // Common parameters
    period: {
      title: 'دوره (Period)',
      description: 'تعداد کندل‌های مورد استفاده برای محاسبه اندیکاتور',
      example: 'مثال: period=14 یعنی از 14 کندل قبلی استفاده می‌شود. مقادیر کوچکتر (مثل 7-9) حساس‌تر و سریع‌تر هستند، مقادیر بزرگتر (مثل 21-50) کندتر و پایدارتر.'
    },
    lookback: {
      title: 'نگاه به عقب (Lookback)',
      description: 'تعداد کندل‌های قبلی برای بررسی (0 = کندل فعلی)',
      example: 'مثال: lookback=0 یعنی کندل فعلی، lookback=1 یعنی کندل قبلی، lookback=2 یعنی دو کندل قبل. برای بررسی شرایط گذشته استفاده می‌شود.'
    },
    source: {
      title: 'منبع قیمت (Source)',
      description: 'نوع قیمت مورد استفاده در محاسبه',
      example: 'گزینه‌ها: close (قیمت بسته‌شدن)، open (قیمت بازشدن)، high (بالاترین)، low (پایین‌ترین)، hl2 (میانگین high/low)، hlc3 (میانگین high/low/close)، ohlc4 (میانگین همه). پیش‌فرض: close'
    },
    
    // RSI specific
    rsi_period: {
      title: 'دوره RSI',
      description: 'تعداد کندل‌های مورد استفاده برای محاسبه RSI',
      example: 'مثال: rsi_period=14 (پیش‌فرض). مقادیر کوچکتر (7-9) سیگنال‌های بیشتری می‌دهند اما نویز بیشتری دارند. مقادیر بزرگتر (21-25) پایدارتر اما کندتر.'
    },
    ma_period: {
      title: 'دوره میانگین متحرک',
      description: 'تعداد کندل‌های مورد استفاده برای میانگین متحرک',
      example: 'مثال: ma_period=21 (پیش‌فرض). برای RSI MA، معمولاً 21 یا 50 استفاده می‌شود. مقادیر بزرگتر نرم‌تر و کندتر هستند.'
    },
    ma_type: {
      title: 'نوع میانگین متحرک',
      description: 'نوع میانگین متحرک: EMA (نمایی) یا SMA (ساده)',
      example: 'EMA: سریع‌تر به تغییرات قیمت واکنش نشان می‌دهد (برای روندهای کوتاه‌مدت). SMA: پایدارتر و نرم‌تر (برای روندهای بلندمدت). پیش‌فرض: EMA'
    },
    
    // MACD specific
    fast_period: {
      title: 'دوره سریع MACD',
      description: 'دوره EMA سریع برای MACD',
      example: 'مثال: fast_period=12 (پیش‌فرض). هرچه کوچکتر باشد، سریع‌تر به تغییرات واکنش نشان می‌دهد.'
    },
    slow_period: {
      title: 'دوره کند MACD',
      description: 'دوره EMA کند برای MACD',
      example: 'مثال: slow_period=26 (پیش‌فرض). معمولاً 2-3 برابر fast_period است. مقادیر بزرگتر نویز کمتری دارند.'
    },
    signal_period: {
      title: 'دوره سیگنال MACD',
      description: 'دوره خط سیگنال MACD',
      example: 'مثال: signal_period=9 (پیش‌فرض). خط سیگنال برای فیلتر کردن نویز استفاده می‌شود.'
    },
    
    // Stochastic specific
    k_period: {
      title: 'دوره %K',
      description: 'دوره محاسبه %K در Stochastic',
      example: 'مثال: k_period=14 (پیش‌فرض). مقادیر کوچکتر (5-9) حساس‌تر هستند.'
    },
    d_period: {
      title: 'دوره %D',
      description: 'دوره میانگین متحرک %K برای محاسبه %D',
      example: 'مثال: d_period=3 (پیش‌فرض). معمولاً 3 یا 5 است. برای هموار کردن %K استفاده می‌شود.'
    },
    
    // Bollinger Bands
    std_dev: {
      title: 'انحراف معیار',
      description: 'تعداد انحراف معیار برای باندهای بولینگر',
      example: 'مثال: std_dev=2.0 (پیش‌فرض). مقادیر کوچکتر (1.5) باندهای باریک‌تر و سیگنال‌های بیشتر. مقادیر بزرگتر (2.5-3) باندهای پهن‌تر و سیگنال‌های کمتر اما قابل اعتمادتر.'
    },
    
    // ATR specific
    atr_period: {
      title: 'دوره ATR',
      description: 'تعداد کندل‌های مورد استفاده برای محاسبه ATR',
      example: 'مثال: atr_period=14 (پیش‌فرض). ATR برای اندازه‌گیری نوسانات استفاده می‌شود. مقادیر بزرگتر نوسانات بلندمدت را نشان می‌دهند.'
    },
    atr_multiplier: {
      title: 'ضریب ATR',
      description: 'ضریب ضرب در ATR برای محاسبه فاصله استاپ/تارگت',
      example: 'مثال: atr_multiplier=2.0 یعنی فاصله استاپ = 2 × ATR. مقادیر کوچکتر (1-1.5) استاپ‌های تنگ‌تر، مقادیر بزرگتر (2.5-3) استاپ‌های بازتر.'
    },
    
    // Risk Management
    signal_type: {
      title: 'نوع سیگنال',
      description: 'نوع سیگنالی که این TP/SL برای آن اعمال می‌شود',
      example: 'long: فقط برای سیگنال‌های لانگ، short: فقط برای سیگنال‌های شورت، both: برای هر دو نوع سیگنال. این پارامتر به شما امکان می‌دهد TP/SL جداگانه برای لانگ و شورت داشته باشید.'
    },
    method: {
      title: 'روش محاسبه',
      description: 'روش محاسبه استاپ لاس یا تیک پروفیت',
      example: 'fixed: مقدار ثابت، percentage: درصد از قیمت ورود، pip: تعداد پیپ، atr: بر اساس ATR، swing: بر اساس قله/دره، indicator: بر اساس اندیکاتور متصل'
    },
    value: {
      title: 'مقدار',
      description: 'مقدار عددی بر اساس روش انتخاب شده',
      example: 'برای fixed: قیمت (مثلاً 50000)، برای percentage: درصد (مثلاً 2 یعنی 2%)، برای pip: تعداد پیپ (مثلاً 50)، برای atr: ضریب ATR (مثلاً 2.0)'
    },
    swing_lookback: {
      title: 'بازه نگاه به عقب برای Swing',
      description: 'تعداد کندل‌های قبلی برای یافتن قله/دره',
      example: 'مثال: swing_lookback=5 یعنی در 5 کندل قبلی به دنبال قله/دره می‌گردد. مقادیر کوچکتر (3-5) برای تایم‌فریم‌های کوتاه، بزرگتر (10-20) برای تایم‌فریم‌های بلند.'
    },
    pip_size: {
      title: 'اندازه پیپ',
      description: 'اندازه یک پیپ برای جفت ارز (increment قیمت)',
      example: 'مثال: برای BTC/USDT: 0.01 یا 1، برای EUR/USD: 0.0001، برای جفت‌های ین: 0.01. این مقدار برای محاسبه استاپ/تارگت بر اساس پیپ استفاده می‌شود.'
    },
    risk_reward_ratio: {
      title: 'نسبت ریسک به ریوارد',
      description: 'نسبت سود به ضرر (مثلاً 1.5 یعنی سود 1.5 برابر ضرر)',
      example: 'مثال: risk_reward_ratio=1.5 یعنی اگر استاپ 100 دلار باشد، تارگت 150 دلار است. مقادیر بالاتر (2-3) محافظه‌کارانه‌تر اما احتمال رسیدن کمتر.'
    },
    
    // Trailing Stop
    enabled: {
      title: 'فعال/غیرفعال',
      description: 'فعال یا غیرفعال کردن این ویژگی',
      example: 'true: فعال است و اعمال می‌شود، false: غیرفعال است و نادیده گرفته می‌شود'
    },
    trigger_profit: {
      title: 'سود فعال‌سازی',
      description: 'درصد سود مورد نیاز برای فعال شدن تریلینگ استاپ',
      example: 'مثال: trigger_profit=0.01 یعنی وقتی سود به 1% برسد، تریلینگ استاپ فعال می‌شود. مقادیر کوچکتر (0.005) زودتر فعال می‌شود.'
    },
    trail_distance: {
      title: 'فاصله تریلینگ',
      description: 'فاصله تریلینگ استاپ از قیمت (برای روش percentage)',
      example: 'مثال: trail_distance=0.005 یعنی استاپ همیشه 0.5% از بالاترین قیمت فاصله دارد. مقادیر کوچکتر (0.002-0.003) استاپ تنگ‌تر، بزرگتر (0.01-0.02) استاپ بازتر.'
    },
    fixed_distance: {
      title: 'فاصله ثابت',
      description: 'فاصله ثابت تریلینگ استاپ (برای روش fixed)',
      example: 'مثال: fixed_distance=100 یعنی استاپ همیشه 100 واحد از بالاترین قیمت فاصله دارد. بر اساس واحد قیمت جفت ارز تنظیم می‌شود.'
    },
    
    // Risk Free
    profit_trigger: {
      title: 'سود فعال‌سازی',
      description: 'درصد سود مورد نیاز برای انتقال استاپ به نقطه سر به سر',
      example: 'مثال: profit_trigger=0.01 یعنی وقتی سود به 1% برسد، استاپ به قیمت ورود (یا نزدیک آن) منتقل می‌شود. مقادیر کوچکتر (0.005) زودتر فعال می‌شود.'
    },
    breakeven_offset: {
      title: 'افست نقطه سر به سر',
      description: 'فاصله از قیمت ورود برای استاپ (می‌تواند منفی باشد)',
      example: 'مثال: breakeven_offset=0 یعنی دقیقاً روی قیمت ورود، 0.001 یعنی کمی بالاتر (سود کوچک)، -0.001 یعنی کمی پایین‌تر (ضرر کوچک مجاز)'
    },
    
    // Cross conditions
    check_previous_candle: {
      title: 'بررسی کندل قبلی',
      description: 'بررسی کراس در کندل قبلی به جای کندل فعلی',
      example: 'true: کراس در کندل قبلی بررسی می‌شود (برای تایید سیگنال)، false: کراس در کندل فعلی بررسی می‌شود (پیش‌فرض)'
    },
    
    // Output
    type: {
      title: 'نوع سیگنال',
      description: 'نوع سیگنال خروجی استراتژی',
      example: 'long: فقط سیگنال خرید، short: فقط سیگنال فروش، both: هر دو نوع سیگنال'
    },
    
    // Pivot detection
    lookback_left: {
      title: 'بازه چپ (Lookback Left)',
      description: 'تعداد کندل‌های قبل از نقطه پیوت برای بررسی',
      example: 'مثال: lookback_left=5 یعنی نقطه پیوت باید از 5 کندل قبل پایین‌تر (برای pivot_low) یا بالاتر (برای pivot_high) باشد. مقادیر کوچکتر (3-5) پیوت‌های بیشتر، مقادیر بزرگتر (10-20) پیوت‌های کمتر اما قابل اعتمادتر.'
    },
    lookback_right: {
      title: 'بازه راست (Lookback Right)',
      description: 'تعداد کندل‌های بعد از نقطه پیوت برای بررسی',
      example: 'مثال: lookback_right=5 یعنی نقطه پیوت باید از 5 کندل بعد پایین‌تر (برای pivot_low) یا بالاتر (برای pivot_high) باشد. معمولاً با lookback_left برابر است. برای تایید پیوت‌های واقعی استفاده می‌شود.'
    },
    
    // Value When
    occurrence: {
      title: 'رخداد (Occurrence)',
      description: 'کدام رخداد شرط را برگرداند (0 = آخرین، 1 = قبلی، ...)',
      example: 'مثال: occurrence=0 یعنی آخرین باری که شرط true بوده، occurrence=1 یعنی یک بار قبل از آن، occurrence=2 یعنی دو بار قبل از آن. برای مقایسه مقادیر در نقاط پیوت مختلف استفاده می‌شود.'
    }
  }
  
  // Return specific hint or generate generic one
  if (hints[paramKey]) {
    return hints[paramKey]
  }
  
  // Generate generic hint based on parameter definition
  const genericHint = {
    title: paramKey,
    description: paramDef.description || 'پارامتر تنظیمات',
    example: ''
  }
  
  if (paramDef.type === 'number') {
    genericHint.example = `مقدار عددی بین ${paramDef.min || 0} تا ${paramDef.max || 'بی‌نهایت'}. پیش‌فرض: ${paramDef.default || 0}`
  } else if (paramDef.type === 'select') {
    genericHint.example = `گزینه‌های موجود: ${paramDef.options?.join(', ') || ''}. پیش‌فرض: ${paramDef.default || ''}`
  } else if (paramDef.type === 'boolean') {
    genericHint.example = `true: فعال، false: غیرفعال. پیش‌فرض: ${paramDef.default ? 'true' : 'false'}`
  }
  
  return genericHint
}

// Hint Icon Component
function HintIcon({ hint }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ class: 'right', style: {} })
  const tooltipRef = useRef(null)
  const iconRef = useRef(null)
  
  const checkTooltipPosition = () => {
    if (!tooltipRef.current || !iconRef.current) return
    
    const tooltip = tooltipRef.current
    const icon = iconRef.current
    const rect = icon.getBoundingClientRect()
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // Calculate available space
    const spaceOnRight = viewportWidth - rect.right - 20 // 20px margin
    const spaceOnLeft = rect.left - 20 // 20px margin from left edge
    const spaceBelow = viewportHeight - rect.bottom - 20
    const spaceAbove = rect.top - 20
    
    // Estimate tooltip dimensions (use max-width as approximate)
    const estimatedWidth = 320 // max-width from CSS
    const estimatedHeight = 150 // estimated height
    
    let positionClass = 'right'
    let style = {}
    
    // Default position: right side, below icon
    if (spaceOnRight >= estimatedWidth) {
      positionClass = 'right'
      style = {
        top: `${rect.bottom + 5}px`,
        left: `${rect.right}px`,
        right: 'auto'
      }
    } 
    // If right doesn't have space, try left side
    else if (spaceOnLeft >= estimatedWidth) {
      positionClass = 'left'
      style = {
        top: `${rect.bottom + 5}px`,
        left: `${rect.left - estimatedWidth}px`,
        right: 'auto'
      }
    } 
    // If neither side has space, use the side with more space and let it overflow gracefully
    else {
      if (spaceOnRight > spaceOnLeft) {
        positionClass = 'right'
        style = {
          top: `${rect.bottom + 5}px`,
          left: `${Math.max(20, rect.right - Math.min(spaceOnRight, estimatedWidth - 20))}px`,
          right: 'auto',
          maxWidth: `${Math.max(200, Math.min(spaceOnRight, estimatedWidth))}px`
        }
      } else {
        positionClass = 'left'
        style = {
          top: `${rect.bottom + 5}px`,
          left: `${Math.max(20, rect.left - Math.min(spaceOnLeft, estimatedWidth))}px`,
          right: 'auto',
          maxWidth: `${Math.max(200, Math.min(spaceOnLeft, estimatedWidth))}px`
        }
      }
    }
    
    // Check vertical overflow
    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      positionClass += '-top'
      style = {
        ...style,
        top: 'auto',
        bottom: `${viewportHeight - rect.top + 5}px`
      }
    }
    
    setTooltipPosition({ class: positionClass, style })
  }
  
  useEffect(() => {
    if (showTooltip) {
      // Small delay to allow tooltip to render before checking position
      setTimeout(checkTooltipPosition, 10)
    }
  }, [showTooltip])
  
  useEffect(() => {
    window.addEventListener('resize', checkTooltipPosition)
    return () => window.removeEventListener('resize', checkTooltipPosition)
  }, [])
  
  return (
    <div className="hint-container">
      <span
        ref={iconRef}
        className="hint-icon"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        title="راهنما"
      >
        <Info size={16} />
      </span>
      {showTooltip && (
        <div 
          ref={tooltipRef}
          className={`hint-tooltip hint-tooltip-${tooltipPosition.class}`}
          style={tooltipPosition.style}
        >
          <div className="hint-tooltip-header">
            <strong>{hint.title}</strong>
          </div>
          <div className="hint-tooltip-body">
            <p className="hint-description">{hint.description}</p>
            {hint.example && (
              <p className="hint-example">
                <strong>مثال:</strong> {hint.example}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to extract Pine Script title
function extractPineScriptTitle(code) {
  if (!code) return null
  // Pattern: indicator('Title', ...) or indicator("Title", ...)
  const patterns = [
    /indicator\s*\(\s*['"]([^'"]+)['"]/,
    /strategy\s*\(\s*['"]([^'"]+)['"]/
  ]
  for (const pattern of patterns) {
    const match = code.match(pattern)
    if (match) {
      return match[1]
    }
  }
  return null
}

function NodePanel({ node, onUpdateParams, onDelete }) {
  const [params, setParams] = useState(node.data.params || {})
  const [guideModalOpen, setGuideModalOpen] = useState(false)
  const indicator = node.data.indicator

  useEffect(() => {
    setParams(node.data.params || {})
  }, [node])

  const handleParamChange = (key, value) => {
    const newParams = { ...params, [key]: value }
    setParams(newParams)
    onUpdateParams(newParams)
    
    // If Pine Script code changed, update node label
    if (indicator?.type === 'pinescript' && key === 'code') {
      const title = extractPineScriptTitle(value)
      if (title) {
        // Update node label in the graph
        // This will be handled by the parent component through updateNodeParams
      }
    }
  }

  const renderParamInput = (key, paramDef) => {
    if (!paramDef) return null

    const value = params[key] !== undefined ? params[key] : paramDef.default
    const hint = getParamHint(key, paramDef, indicator?.type)

    if (paramDef.type === 'number') {
      // Determine step based on min/max range for better UX
      let step = paramDef.step
      if (!step) {
        const range = (paramDef.max || 100) - (paramDef.min || 0)
        if (range < 1) {
          step = 0.0001  // For very small ranges (like pip_size)
        } else if (range < 10) {
          step = 0.1  // For small ranges
        } else {
          step = 1  // Default
        }
      }
      
      return (
        <div key={key} className="param-input">
          <label className="param-label">
            <span className="param-label-text">{key}</span>
            <HintIcon hint={hint} />
          </label>
          <input
            type="number"
            value={value}
            min={paramDef.min}
            max={paramDef.max}
            step={step}
            onChange={(e) => {
              const val = e.target.value === '' ? paramDef.default : parseFloat(e.target.value)
              handleParamChange(key, isNaN(val) ? paramDef.default : val)
            }}
          />
        </div>
      )
    }

    if (paramDef.type === 'select') {
      return (
        <div key={key} className="param-input">
          <label className="param-label">
            <span className="param-label-text">{key}</span>
            <HintIcon hint={hint} />
          </label>
          <select
            value={value}
            onChange={(e) => handleParamChange(key, e.target.value)}
          >
            {paramDef.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )
    }

    if (paramDef.type === 'boolean') {
      return (
        <div key={key} className="param-input">
          <label className="param-label param-label-checkbox">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleParamChange(key, e.target.checked)}
            />
            <span className="param-label-text">{key}</span>
            <HintIcon hint={hint} />
          </label>
        </div>
      )
    }

    if (paramDef.type === 'text') {
      return (
        <div key={key} className="param-input">
          <label className="param-label">
            <span className="param-label-text">{key}</span>
            <HintIcon hint={hint} />
          </label>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleParamChange(key, e.target.value)}
            placeholder={paramDef.placeholder || ''}
          />
        </div>
      )
    }

    return null
  }

  const handleGuideClick = () => {
    setGuideModalOpen(true)
  }

  const handleCloseGuide = () => {
    setGuideModalOpen(false)
  }

  return (
    <div className="node-panel">
      <div className="panel-header">
        <div className="panel-header-title">
          <h4>تنظیمات گره</h4>
          <button 
            className="node-guide-icon-header" 
            onClick={handleGuideClick}
            title="راهنمای جامع"
          >
            <BookOpen size={18} />
          </button>
        </div>
        <button onClick={onDelete} className="btn-delete-node">حذف</button>
      </div>
      
      <NodeGuideModal
        isOpen={guideModalOpen}
        onClose={handleCloseGuide}
        nodeType={node.data?.indicatorType}
        indicator={indicator}
      />

      <div className="node-info">
        <div className="info-item">
          <span className="info-label">نوع:</span>
          <span className="info-value">{node.data.label}</span>
        </div>
        <div className="info-item">
          <span className="info-label">ID:</span>
          <span className="info-value">{node.id}</span>
        </div>
      </div>

      {indicator && indicator.params && Object.keys(indicator.params).length > 0 && (
        <div className="params-section">
          <h5>پارامترها</h5>
          {indicator.type === 'pinescript' ? (
            // Special handling for Pine Script node
            <div className="pinescript-editor">
              <div className="param-input">
                <label className="param-label">
                  <span className="param-label-text">کد Pine Script</span>
                </label>
                <textarea
                  value={params.code || ''}
                  onChange={(e) => handleParamChange('code', e.target.value)}
                  rows={15}
                  style={{
                    width: '100%',
                    fontFamily: 'monospace',
                    direction: 'ltr',
                    fontSize: '12px',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    resize: 'vertical'
                  }}
                  placeholder="//@version=5
indicator('My Indicator', overlay=true)
period = input.int(14, title='Period')
sma_value = ta.sma(close, period)
plot(sma_value, title='SMA')"
                />
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                  <p>کد Pine Script خود را اینجا وارد کنید. از توابع رایج مانند ta.sma, ta.ema, ta.rsi استفاده کنید.</p>
                </div>
              </div>
              {Object.entries(indicator.params)
                .filter(([key]) => key !== 'code')
                .map(([key, paramDef]) => renderParamInput(key, paramDef))}
            </div>
          ) : (
            Object.entries(indicator.params).map(([key, paramDef]) =>
              renderParamInput(key, paramDef)
            )
          )}
        </div>
      )}
    </div>
  )
}

export default NodePanel

