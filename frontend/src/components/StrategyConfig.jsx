import React from 'react'
import './StrategyConfig.css'

function StrategyConfig({ config, onUpdateConfig }) {
  const updateConfig = (key, value) => {
    onUpdateConfig({ ...config, [key]: value })
  }

  return (
    <div className="strategy-config">
      <div className="config-header">
        <h4>تنظیمات استراتژی</h4>
      </div>

      <div className="config-items">
        <div className="config-item">
          <label>Risk/Reward Ratio</label>
          <input
            type="number"
            min="0.1"
            max="10"
            step="0.1"
            value={config.risk_reward_ratio || 1.5}
            onChange={(e) => updateConfig('risk_reward_ratio', parseFloat(e.target.value) || 1.5)}
          />
        </div>

        <div className="config-item">
          <label>Swing Lookback</label>
          <input
            type="number"
            min="1"
            max="50"
            value={config.swing_lookback || 5}
            onChange={(e) => updateConfig('swing_lookback', parseInt(e.target.value) || 5)}
          />
        </div>
      </div>
    </div>
  )
}

export default StrategyConfig

