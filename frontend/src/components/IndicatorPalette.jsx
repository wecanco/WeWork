import React, { useState } from 'react'
import './IndicatorPalette.css'

function IndicatorPalette({ indicators, onAddNode }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = ['all', 'momentum', 'trend', 'volatility', 'volume', 'price', 'math', 'condition', 'logic', 'risk', 'output', 'custom']
  const categoryNames = {
    all: 'همه',
    momentum: 'مومنتوم',
    trend: 'روند',
    volatility: 'نوسان',
    volume: 'حجم',
    price: 'قیمت',
    math: 'ریاضی',
    condition: 'شرط',
    logic: 'منطق',
    risk: 'مدیریت ریسک',
    output: 'خروجی',
    custom: 'سفارشی'
  }

  const filteredIndicators = indicators.filter(indicator => {
    const matchesSearch = indicator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         indicator.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || indicator.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const groupedIndicators = filteredIndicators.reduce((acc, indicator) => {
    const category = indicator.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(indicator)
    return acc
  }, {})

  return (
    <div className="indicator-palette">
      <div className="palette-header">
        <h3>اندیکاتورها</h3>
        <input
          type="text"
          placeholder="جستجو..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="palette-search"
        />
      </div>

      <div className="category-filters">
        {categories.map(cat => (
          <button
            key={cat}
            className={`category-filter ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {categoryNames[cat]}
          </button>
        ))}
      </div>

      <div className="indicators-list">
        {Object.entries(groupedIndicators).map(([category, items]) => (
          <div key={category} className="indicator-group">
            <div className="group-header">{categoryNames[category] || category}</div>
            {items.map((indicator) => (
              <div
                key={indicator.type}
                className="indicator-item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'copy'
                  e.dataTransfer.setData('application/reactflow', JSON.stringify(indicator))
                }}
                onClick={() => onAddNode(indicator)}
                title={indicator.description}
              >
                <div className="indicator-name">{indicator.name}</div>
                <div className="indicator-desc">{indicator.description}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default IndicatorPalette

