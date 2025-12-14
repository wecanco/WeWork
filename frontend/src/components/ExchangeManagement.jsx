import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmModal';
import './ExchangeManagement.css';
import { API_BASE_URL } from '../config';

const ExchangeManagement = () => {
  const [exchanges, setExchanges] = useState([]);
  const [supportedExchanges, setSupportedExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExchange, setEditingExchange] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    exchange_type: '',
    api_key: '',
    api_secret: '',
    passphrase: '',
    sandbox: false,
    trading_type: 'spot', // 'spot' or 'future'
  });
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    loadSupportedExchanges();
    loadExchanges();
  }, []);

  const loadSupportedExchanges = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/exchanges/supported`);
      setSupportedExchanges(response.data.exchanges || []);
    } catch (err) {
      console.error('Error loading supported exchanges:', err);
    }
  };

  const loadExchanges = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/exchanges`);
      setExchanges(response.data);
    } catch (err) {
      console.error('Error loading exchanges:', err);
      toast.error('خطا در بارگذاری صرافی‌ها');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingExchange(null);
    setFormData({
      name: '',
      exchange_type: '',
      api_key: '',
      api_secret: '',
      passphrase: '',
      sandbox: false,
      trading_type: 'spot',
    });
    setShowAddModal(true);
  };

  const handleEdit = (exchange) => {
    setEditingExchange(exchange);
    // Extract trading type from extra_params, default to 'spot'
    const tradingType = exchange.extra_params?.use_futures ? 'future' : 'spot';
    setFormData({
      name: exchange.name,
      exchange_type: exchange.exchange_type,
      api_key: '', // Don't show existing keys
      api_secret: '',
      passphrase: '',
      sandbox: exchange.sandbox,
      trading_type: tradingType,
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      
      // Prepare data with trading type in extra_params
      const submitData = {
        ...formData,
        extra_params: {
          use_futures: formData.trading_type === 'future'
        }
      };
      
      // Remove trading_type from the main data as it's stored in extra_params
      delete submitData.trading_type;

      if (editingExchange) {
        await axios.put(`${API_BASE_URL}/exchanges/${editingExchange.id}`, submitData);
        toast.success('صرافی با موفقیت به‌روزرسانی شد');
      } else {
        await axios.post(`${API_BASE_URL}/exchanges`, submitData);
        toast.success('صرافی با موفقیت اضافه شد');
      }
      setShowAddModal(false);
      loadExchanges();
    } catch (err) {
      const msg = err?.response?.data?.detail || 'خطا در ذخیره صرافی';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (exchangeId) => {
    try {
      setVerifying(prev => ({ ...prev, [exchangeId]: true }));
      await axios.post(`${API_BASE_URL}/exchanges/${exchangeId}/verify`);
      toast.success('صرافی با موفقیت تأیید شد');
      loadExchanges();
    } catch (err) {
      const msg = err?.response?.data?.detail || 'خطا در تأیید صرافی';
      toast.error(msg);
    } finally {
      setVerifying(prev => ({ ...prev, [exchangeId]: false }));
    }
  };

  const handleDelete = async (exchangeId, name) => {
    const confirmed = await confirm(
      `آیا مطمئن هستید که می‌خواهید اتصال "${name}" را حذف کنید؟`,
      { title: 'حذف اتصال صرافی', type: 'danger' }
    );
    if (!confirmed) return;

    try {
      await axios.delete(`${API_BASE_URL}/exchanges/${exchangeId}`);
      toast.success('اتصال صرافی با موفقیت حذف شد');
      loadExchanges();
    } catch (err) {
      const msg = err?.response?.data?.detail || 'خطا در حذف صرافی';
      toast.error(msg);
    }
  };

  if (loading) {
    return <div className="exchange-management">Loading...</div>;
  }

  return (
    <div className="exchange-management">
      <div className="exchange-header">
        <h2>اتصالات صرافی</h2>
        <button onClick={handleAdd} className="btn btn-primary">
          افزودن صرافی
        </button>
      </div>


      <div className="exchange-list">
        {exchanges.length === 0 ? (
          <div className="empty-state">
            <p>هیچ اتصال صرافی وجود ندارد. روی "افزودن صرافی" کلیک کنید تا اولین اتصال را ایجاد کنید.</p>
          </div>
        ) : (
          exchanges.map((exchange) => (
            <div key={exchange.id} className="exchange-card">
              <div className="exchange-card-header">
                <h3>{exchange.name}</h3>
                <span className={`status-badge ${exchange.is_active ? 'active' : 'inactive'}`}>
                  {exchange.is_active ? 'فعال' : 'غیرفعال'}
                </span>
              </div>
              <div className="exchange-card-body">
                <p><strong>صرافی:</strong> {exchange.exchange_type.toUpperCase()}</p>
                <p><strong>نوع معاملات:</strong> {exchange.extra_params?.use_futures ? 'Future (آتی)' : 'Spot (نقدی)'}</p>
                <p><strong>Sandbox:</strong> {exchange.sandbox ? 'بله' : 'خیر'}</p>
                {exchange.account_info && (
                  <div className="account-info">
                    <p><strong>موجودی:</strong> {exchange.account_info.total_balance_usdt?.toFixed(2) || 0} USDT</p>
                    {exchange.account_info.balances && Object.keys(exchange.account_info.balances).length > 0 && (
                      <div className="tokens-info">
                        <p><strong>توکن‌ها:</strong></p>
                        <div className="tokens-list">
                          {Object.entries(exchange.account_info.balances)
                            .slice(0, 5) // Show first 5 tokens
                            .map(([token, data]) => (
                              <span key={token} className="token-badge">
                                {token}: {data.total?.toFixed(4) || 0}
                              </span>
                            ))}
                          {Object.keys(exchange.account_info.balances).length > 5 && (
                            <span className="token-more">+{Object.keys(exchange.account_info.balances).length - 5} مورد دیگر</span>
                          )}
                        </div>
                      </div>
                    )}
                    <p><strong>آخرین تأیید:</strong> {
                      exchange.last_verified_at
                        ? new Date(exchange.last_verified_at).toLocaleString('fa-IR')
                        : 'هرگز'
                    }</p>
                  </div>
                )}
                {exchange.verification_error && (
                  <div className="verification-error">
                    <p><strong>خطا:</strong> {exchange.verification_error}</p>
                  </div>
                )}
              </div>
              <div className="exchange-card-actions">
                <button 
                  onClick={() => handleVerify(exchange.id)} 
                  className="btn btn-sm"
                  disabled={verifying[exchange.id]}
                >
                  {verifying[exchange.id] ? 'در حال تأیید...' : 'تأیید'}
                </button>
                <button onClick={() => handleEdit(exchange)} className="btn btn-sm">
                  ویرایش
                </button>
                <button onClick={() => handleDelete(exchange.id, exchange.name)} className="btn btn-sm btn-danger">
                  حذف
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingExchange ? 'ویرایش صرافی' : 'افزودن صرافی'}</h3>
              <button onClick={() => setShowAddModal(false)} className="modal-close">×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>نام</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="حساب Binance من"
                />
              </div>
              <div className="form-group">
                <label>نوع صرافی</label>
                <select
                  value={formData.exchange_type}
                  onChange={(e) => setFormData({ ...formData, exchange_type: e.target.value })}
                  required
                >
                  <option value="">انتخاب صرافی</option>
                  {supportedExchanges.map((ex) => (
                    <option key={ex} value={ex}>
                      {ex.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>نوع معاملات</label>
                <select
                  value={formData.trading_type}
                  onChange={(e) => setFormData({ ...formData, trading_type: e.target.value })}
                  required
                >
                  <option value="spot">Spot (نقدی)</option>
                  <option value="future">Future (آتی)</option>
                </select>
              </div>
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  required={!editingExchange}
                  placeholder="وارد کردن API Key"
                />
              </div>
              <div className="form-group">
                <label>API Secret</label>
                <input
                  type="password"
                  value={formData.api_secret}
                  onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                  required={!editingExchange}
                  placeholder="وارد کردن API Secret"
                />
              </div>
              <div className="form-group">
                <label>Passphrase (اختیاری)</label>
                <input
                  type="password"
                  value={formData.passphrase}
                  onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                  placeholder="برای صرافی‌هایی مثل OKX"
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.sandbox}
                    onChange={(e) => setFormData({ ...formData, sandbox: e.target.checked })}
                  />
                  استفاده از Sandbox/Testnet
                </label>
              </div>
              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="btn"
                  disabled={submitting}
                >
                  انصراف
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'در حال ذخیره...' : (editingExchange ? 'به‌روزرسانی' : 'افزودن')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExchangeManagement;

