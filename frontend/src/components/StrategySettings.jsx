import React from 'react'
import { Upload, Download } from 'lucide-react'
import './StrategySettings.css'

function StrategySettings({ 
  strategyName, 
  strategyDescription, 
  strategyConfig,
  isPublic,
  onStrategyNameChange,
  onStrategyDescriptionChange,
  onUpdateConfig,
  onIsPublicChange,
  onImportClick,
  onExportClick,
  fileInputRef,
  strategyNameInputRef 
}) {
  const updateConfig = (key, value) => {
    onUpdateConfig({ ...strategyConfig, [key]: value })
  }

  return (
    <div className="strategy-settings">
      <div className="settings-header">
        <h4>تنظیمات کلی استراتژی</h4>
      </div>

      <div className="settings-content">
        {/* Strategy Name */}
        <div className="setting-item">
          <label>
            <span>نام استراتژی</span>
            <input
              ref={strategyNameInputRef}
              type="text"
              placeholder="نام استراتژی"
              value={strategyName}
              onChange={(e) => onStrategyNameChange(e.target.value)}
              className="strategy-name-input"
            />
          </label>
        </div>

        {/* Strategy Description */}
        <div className="setting-item">
          <label>
            <span>توضیحات</span>
            <textarea
              placeholder="توضیحات استراتژی (اختیاری)"
              value={strategyDescription}
              onChange={(e) => onStrategyDescriptionChange(e.target.value)}
              className="strategy-description-input"
              rows="3"
            />
          </label>
        </div>

        {/* Public Strategy Toggle */}
        <div className="setting-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isPublic || false}
              onChange={(e) => onIsPublicChange(e.target.checked)}
              className="strategy-public-checkbox"
            />
            <span className="checkbox-text">
              استراتژی عمومی
              <small className="checkbox-description">
                با فعال کردن این گزینه، استراتژی شما برای سایر کاربران قابل مشاهده خواهد بود
              </small>
            </span>
          </label>
        </div>

        {/* Import/Export Section */}
        <div className="setting-item">
          <div className="import-export-section">
            <div className="import-export-buttons">
              <button 
                onClick={onImportClick} 
                className="btn-import"
                title="Import استراتژی از فایل JSON"
              >
                <Upload size={16} />
                Import JSON
              </button>
              <button 
                onClick={onExportClick} 
                className="btn-export"
                title="Export استراتژی به فایل JSON"
              >
                <Download size={16} />
                Export JSON
              </button>
            </div>
          </div>
        </div>

        {/* Strategy Configuration */}
        <div className="setting-item">
          <h5>تنظیمات پیشرفته</h5>
          <div className="config-items">
            <div className="config-item">
              <label>Risk/Reward Ratio</label>
              <input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={strategyConfig.risk_reward_ratio || 1.5}
                onChange={(e) => updateConfig('risk_reward_ratio', parseFloat(e.target.value) || 1.5)}
              />
            </div>

            <div className="config-item">
              <label>Swing Lookback</label>
              <input
                type="number"
                min="1"
                max="50"
                value={strategyConfig.swing_lookback || 5}
                onChange={(e) => updateConfig('swing_lookback', parseInt(e.target.value) || 5)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StrategySettings