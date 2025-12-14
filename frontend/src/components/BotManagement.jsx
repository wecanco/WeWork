import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmModal';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardActions,
  Badge,
  Modal,
  Input,
  Select,
  FormGroup,
  FormRow,
  FormActions,
  EmptyState,
  Loading,
} from '../ui';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import './BotManagement.css';
import { API_BASE_URL, STRATEGIES_API_BASE_URL } from '../config';

const PAGE_SIZE = 20;

const BotManagement = () => {
  const [bots, setBots] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBot, setEditingBot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    strategy_id: '',
    exchange_connection_id: '',
    symbol: 'BTC/USDT',
    timeframe: '5m',
    leverage: 1,
    margin_type: 'isolated',
    position_size_percent: 10.0,
    position_size_fixed: '',
    use_fixed_size: false,
    max_daily_trades: '',
    max_open_positions: 1,
    order_execution_type: 'market',
  });
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const refreshTimeoutRef = React.useRef(null);

  useEffect(() => {
    loadInitialData();
    // Auto-refresh from server every 30 seconds instead of simulating fake data
    const interval = setInterval(() => {
      refreshBots();
    }, 30000);
    
    return () => {
      clearInterval(interval);
      // Clean up any pending refresh timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load strategies and exchanges in parallel
      const [strategiesRes, exchangesRes, botsRes] = await Promise.all([
        axios.get(STRATEGIES_API_BASE_URL),
        axios.get(`${API_BASE_URL}/exchanges`),
        axios.get(`${API_BASE_URL}/bots?skip=0&limit=${PAGE_SIZE}`),
      ]);

      setStrategies(strategiesRes.data);
      setExchanges(exchangesRes.data.filter(ex => ex.is_active));
      
      const botsData = Array.isArray(botsRes.data) ? botsRes.data : (botsRes.data.items || []);
      const total = Array.isArray(botsRes.data) ? botsData.length : (botsRes.data.total || 0);
      
      setBots(botsData);
      setSkip(botsData.length);
      setHasMore(botsData.length < total);
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('خطا در بارگذاری اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (isInitialLoad = false) => {
    try {
      // Only show loading spinner on initial load
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const currentSkip = isInitialLoad ? 0 : skip;
      const response = await axios.get(`${API_BASE_URL}/bots?skip=${currentSkip}&limit=${PAGE_SIZE}`);
      
      const botsData = Array.isArray(response.data) ? response.data : (response.data.items || []);
      const total = Array.isArray(response.data) ? botsData.length : (response.data.total || 0);
      
      if (isInitialLoad) {
        setBots(botsData);
        setSkip(botsData.length);
      } else {
        // For incremental updates (auto-refresh), update existing items without recreating the list
        setBots(prevBots => {
          const updatedBots = [...prevBots];
          botsData.forEach(newBot => {
            const existingIndex = updatedBots.findIndex(bot => bot.id === newBot.id);
            if (existingIndex !== -1) {
              // Update existing bot with new data
              updatedBots[existingIndex] = { ...updatedBots[existingIndex], ...newBot };
            } else {
              // Add new bot if not found
              updatedBots.push(newBot);
            }
          });
          return updatedBots;
        });
        setSkip(prev => prev + botsData.length);
      }
      
      setHasMore(botsData.length === PAGE_SIZE && (isInitialLoad ? botsData.length : bots.length + botsData.length) < total);
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('خطا در بارگذاری اطلاعات');
    } finally {
      // Always hide loading indicators
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Dedicated refresh function for manual updates (doesn't reset pagination)
  const refreshBots = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/bots?skip=0&limit=${PAGE_SIZE}`);
      const botsData = Array.isArray(response.data) ? response.data : (response.data.items || []);
      
      // Update with minimal DOM impact - preserve existing elements
      setBots(botsData);
      setSkip(botsData.length);
      setHasMore(botsData.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error refreshing bots:', err);
      toast.error('خطا در بروزرسانی لیست');
    }
  };

  // Batch refresh requests to avoid multiple simultaneous API calls
  const scheduleRefresh = () => {
    if (refreshTimeoutRef.current) return;
    refreshTimeoutRef.current = setTimeout(() => {
      refreshBots();
      refreshTimeoutRef.current = null;
    }, 1000); // Batch refresh requests within 1 second
  };

  // Update bot status without API call (for immediate UI feedback)
  const updateBotInList = (botId, updates) => {
    setBots(prevBots => 
      prevBots.map(bot => 
        bot.id === botId ? { ...bot, ...updates } : bot
      )
    );
  };

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    await loadData(false);
  }, [hasMore, loadingMore, skip, bots.length]);

  const { lastElementRef } = useInfiniteScroll(loadMore, hasMore, loadingMore);

  const handleAdd = () => {
    setFormData({
      name: '',
      strategy_id: '',
      exchange_connection_id: '',
      symbol: 'BTC/USDT',
      timeframe: '5m',
      leverage: 1,
      margin_type: 'isolated',
      position_size_percent: 10.0,
      position_size_fixed: '',
      use_fixed_size: false,
      max_daily_trades: '',
      max_open_positions: 1,
      order_execution_type: 'market',
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        strategy_id: parseInt(formData.strategy_id),
        exchange_connection_id: parseInt(formData.exchange_connection_id),
        leverage: parseInt(formData.leverage),
        max_open_positions: parseInt(formData.max_open_positions),
        position_size_percent: parseFloat(formData.position_size_percent),
        order_execution_type: formData.order_execution_type,
      };

      if (formData.use_fixed_size && formData.position_size_fixed) {
        payload.position_size_fixed = parseFloat(formData.position_size_fixed);
      } else {
        payload.position_size_fixed = null;
      }

      if (formData.max_daily_trades) {
        payload.max_daily_trades = parseInt(formData.max_daily_trades);
      } else {
        payload.max_daily_trades = null;
      }

      await axios.post(`${API_BASE_URL}/bots`, payload);
      toast.success('ربات با موفقیت ایجاد شد');
      setShowAddModal(false);
      loadData(true); // Full refresh for new bot
    } catch (err) {
      const msg = err?.response?.data?.detail || 'خطا در ایجاد ربات';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStart = async (botId) => {
    try {
      setActionLoading(prev => ({ ...prev, [botId]: 'start' }));
      
      // Immediate UI update without API call
      updateBotInList(botId, { status: 'running' });
      
      // Background API call to sync with server
      await axios.post(`${API_BASE_URL}/bots/${botId}/start`);
      toast.success('ربات با موفقیت شروع شد');
      
      // Batch refresh with other potential operations
      scheduleRefresh();
    } catch (err) {
      const msg = err?.response?.data?.detail || 'خطا در شروع ربات';
      toast.error(msg);
      // Revert UI state on error
      updateBotInList(botId, { status: 'stopped' });
    } finally {
      setActionLoading(prev => ({ ...prev, [botId]: null }));
    }
  };

  const handleStop = async (botId) => {
    try {
      setActionLoading(prev => ({ ...prev, [botId]: 'stop' }));
      
      // Immediate UI update without API call
      updateBotInList(botId, { status: 'stopped' });
      
      // Background API call to sync with server
      await axios.post(`${API_BASE_URL}/bots/${botId}/stop`);
      toast.success('ربات با موفقیت متوقف شد');
      
      // Batch refresh with other potential operations
      scheduleRefresh();
    } catch (err) {
      const msg = err?.response?.data?.detail || 'خطا در توقف ربات';
      toast.error(msg);
      // Revert UI state on error
      updateBotInList(botId, { status: 'running' });
    } finally {
      setActionLoading(prev => ({ ...prev, [botId]: null }));
    }
  };

  const handleEdit = (bot) => {
    if (bot.status === 'running') {
      toast.error('برای ویرایش ربات ابتدا باید آن را متوقف کنید');
      return;
    }
    
    setEditingBot(bot);
    setFormData({
      name: bot.name,
      strategy_id: bot.strategy_id.toString(),
      exchange_connection_id: bot.exchange_connection_id.toString(),
      symbol: bot.symbol,
      timeframe: bot.timeframe,
      leverage: bot.leverage,
      margin_type: bot.margin_type,
      position_size_percent: bot.position_size_percent || 10.0,
      position_size_fixed: bot.position_size_fixed || '',
      use_fixed_size: bot.use_fixed_size || false,
      max_daily_trades: bot.max_daily_trades || '',
      max_open_positions: bot.max_open_positions || 1,
      order_execution_type: bot.order_execution_type || 'market',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name,
        symbol: formData.symbol,
        timeframe: formData.timeframe,
        leverage: parseInt(formData.leverage),
        margin_type: formData.margin_type,
        position_size_percent: parseFloat(formData.position_size_percent),
        order_execution_type: formData.order_execution_type,
        max_open_positions: parseInt(formData.max_open_positions),
      };

      if (formData.use_fixed_size && formData.position_size_fixed) {
        payload.position_size_fixed = parseFloat(formData.position_size_fixed);
      } else {
        payload.position_size_fixed = null;
      }

      if (formData.max_daily_trades) {
        payload.max_daily_trades = parseInt(formData.max_daily_trades);
      } else {
        payload.max_daily_trades = null;
      }

      payload.use_fixed_size = formData.use_fixed_size;

      await axios.put(`${API_BASE_URL}/bots/${editingBot.id}`, payload);
      toast.success('ربات با موفقیت ویرایش شد');
      setShowEditModal(false);
      setEditingBot(null);
      loadData(true); // Full refresh for updated bot
    } catch (err) {
      const msg = err?.response?.data?.detail || 'خطا در ویرایش ربات';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (botId, name) => {
    const confirmed = await confirm(
      `آیا مطمئن هستید که می‌خواهید ربات "${name}" را حذف کنید؟`,
      { title: 'حذف ربات', type: 'danger' }
    );
    if (!confirmed) return;

    try {
      // Immediate UI update - remove from list
      setBots(prevBots => prevBots.filter(bot => bot.id !== botId));
      
      // Background API call to sync with server
      await axios.delete(`${API_BASE_URL}/bots/${botId}`);
      toast.success('ربات با موفقیت حذف شد');
      
      // Batch refresh with other potential operations
      scheduleRefresh();
    } catch (err) {
      const msg = err?.response?.data?.detail || 'خطا در حذف ربات';
      toast.error(msg);
      // Revert UI state on error - refresh to restore deleted bot
      refreshBots();
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'running':
        return 'success';
      case 'stopped':
        return 'muted';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'running':
        return 'در حال اجرا';
      case 'stopped':
        return 'متوقف';
      case 'error':
        return 'خطا';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="bot-management">
        <Loading text="در حال بارگذاری..." />
      </div>
    );
  }

  return (
    <div className="bot-management">
      <div className="bot-header">
        <div>
          <h2>لیست ربات‌های معامله‌گری</h2>
        </div>
        <Button onClick={handleAdd} variant="primary">
          ایجاد ربات جدید
        </Button>
      </div>

      <div className="bot-list">
        {bots.length === 0 ? (
          <EmptyState
            title="هیچ ربات معامله‌گری وجود ندارد"
            description="روی دکمه 'ایجاد ربات جدید' کلیک کنید تا اولین ربات را ایجاد کنید."
            action={
              <Button onClick={handleAdd} variant="primary">
                ایجاد ربات جدید
              </Button>
            }
          />
        ) : (
          <>
            {bots.map((bot, index) => {
              const isLast = index === bots.length - 1;
              return (
                <Card
                  key={bot.id}
                  hover
                  ref={isLast ? lastElementRef : null}
                  className="bot-card"
                >
                  <CardHeader>
                    <h3>{bot.name}</h3>
                    <Badge variant={getStatusBadgeVariant(bot.status)}>
                      {getStatusLabel(bot.status)}
                    </Badge>
                  </CardHeader>
                  <CardBody>
                    <div className="bot-info-row">
                      <span><strong>استراتژی:</strong> {bot.strategy_name || 'N/A'}</span>
                      <span><strong>صرافی:</strong> {bot.exchange_name || 'N/A'}</span>
                    </div>
                    <div className="bot-info-row">
                      <span><strong>نماد:</strong> {bot.symbol}</span>
                      <span><strong>تایم‌فریم:</strong> {bot.timeframe}</span>
                    </div>
                    <div className="bot-info-row">
                      <span><strong>لوریج:</strong> {bot.leverage}x</span>
                      <span><strong>مارجین:</strong> {bot.margin_type === 'isolated' ? 'ایزوله' : 'کراس'}</span>
                    </div>
                    <div className="bot-stats">
                      <div className="stat-item">
                        <span className="stat-label">کل معاملات</span>
                        <span className="stat-value">{bot.total_trades}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">نرخ برد</span>
                        <span className="stat-value">
                          {bot.total_trades > 0
                            ? ((bot.winning_trades / bot.total_trades) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">سود/زیان کل</span>
                        <span className={`stat-value ${bot.total_pnl_usdt >= 0 ? 'positive' : 'negative'}`}>
                          {bot.total_pnl_usdt >= 0 ? '+' : ''}{bot.total_pnl_usdt.toFixed(2)} USDT
                        </span>
                      </div>
                    </div>
                    {bot.error_message && (
                      <div className="bot-error">
                        <strong>خطا:</strong> {bot.error_message}
                      </div>
                    )}
                  </CardBody>
                  <CardActions>
                    <Button
                      onClick={() => navigate(`/app/bots/${bot.id}`)}
                      variant="secondary"
                      size="sm"
                    >
                      جزئیات
                    </Button>
                    {bot.status === 'running' ? (
                      <Button
                        onClick={() => handleStop(bot.id)}
                        variant="warning"
                        size="sm"
                        loading={actionLoading[bot.id] === 'stop'}
                        disabled={actionLoading[bot.id] === 'stop'}
                      >
                        توقف
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleStart(bot.id)}
                          variant="success"
                          size="sm"
                          loading={actionLoading[bot.id] === 'start'}
                          disabled={actionLoading[bot.id] === 'start'}
                        >
                          شروع
                        </Button>
                        <Button
                          onClick={() => handleEdit(bot)}
                          variant="secondary"
                          size="sm"
                        >
                          ویرایش
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={() => handleDelete(bot.id, bot.name)}
                      variant="danger"
                      size="sm"
                    >
                      حذف
                    </Button>
                  </CardActions>
                </Card>
              );
            })}
            
            {loadingMore && (
              <div className="bot-loading-more">
                <Loading size="sm" text="در حال بارگذاری بیشتر..." />
              </div>
            )}
            
            {!hasMore && bots.length > 0 && (
              <div className="bot-end-of-list">
                <p>همه ربات‌ها نمایش داده شدند ({bots.length} مورد)</p>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingBot(null);
        }}
        title="ویرایش ربات معامله‌گری"
        size="md"
      >
        <form onSubmit={handleUpdate}>
          <FormGroup>
            <Input
              label="نام ربات"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="ربات معامله‌گری من"
              fullWidth
            />
          </FormGroup>
          
          <FormRow columns={2}>
            <Input
              label="نماد"
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              required
              placeholder="BTC/USDT"
              fullWidth
            />
            <Select
              label="تایم‌فریم"
              value={formData.timeframe}
              onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
              required
              fullWidth
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </Select>
          </FormRow>
          
          <FormRow columns={2}>
            <Input
              label="لوریج"
              type="number"
              value={formData.leverage}
              onChange={(e) => setFormData({ ...formData, leverage: e.target.value })}
              min="1"
              max="125"
              required
              fullWidth
            />
            <Select
              label="نوع مارجین"
              value={formData.margin_type}
              onChange={(e) => setFormData({ ...formData, margin_type: e.target.value })}
              required
              fullWidth
            >
              <option value="isolated">ایزوله</option>
              <option value="cross">کراس</option>
            </Select>
          </FormRow>
          
          <FormGroup>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.use_fixed_size}
                onChange={(e) => setFormData({ ...formData, use_fixed_size: e.target.checked })}
              />
              <span>استفاده از اندازه ثابت پوزیشن</span>
            </label>
          </FormGroup>
          
          {formData.use_fixed_size ? (
            <FormGroup>
              <Input
                label="اندازه پوزیشن (USDT)"
                type="number"
                value={formData.position_size_fixed}
                onChange={(e) => setFormData({ ...formData, position_size_fixed: e.target.value })}
                min="0"
                step="0.01"
                required
                fullWidth
              />
            </FormGroup>
          ) : (
            <FormGroup>
              <Input
                label="اندازه پوزیشن (%)"
                type="number"
                value={formData.position_size_percent}
                onChange={(e) => setFormData({ ...formData, position_size_percent: e.target.value })}
                min="0"
                max="100"
                step="0.1"
                required
                fullWidth
              />
            </FormGroup>
          )}
          
          <FormGroup>
            <Select
              label="نوع اجرای سفارش"
              value={formData.order_execution_type}
              onChange={(e) => setFormData({ ...formData, order_execution_type: e.target.value })}
              required
              fullWidth
            >
              <option value="market">قیمت مارکت (Market Price)</option>
              <option value="trigger_price">قیمت تریگر شده (Trigger Price)</option>
            </Select>
            <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
              {formData.order_execution_type === 'market' 
                ? 'معامله با قیمت فعلی بازار اجرا می‌شود'
                : 'معامله با قیمت مشخص شده در زمان تریگر اجرا می‌شود'}
            </small>
          </FormGroup>
          
          <FormRow columns={2}>
            <Input
              label="حداکثر معاملات روزانه (اختیاری)"
              type="number"
              value={formData.max_daily_trades}
              onChange={(e) => setFormData({ ...formData, max_daily_trades: e.target.value })}
              min="1"
              placeholder="نامحدود"
              fullWidth
            />
            <Input
              label="حداکثر پوزیشن‌های باز"
              type="number"
              value={formData.max_open_positions}
              onChange={(e) => setFormData({ ...formData, max_open_positions: e.target.value })}
              min="1"
              required
              fullWidth
            />
          </FormRow>
          
          <FormActions>
            <Button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setEditingBot(null);
              }}
              variant="secondary"
              disabled={submitting}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              disabled={submitting}
            >
              ذخیره تغییرات
            </Button>
          </FormActions>
        </form>
      </Modal>

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="ایجاد ربات معامله‌گری"
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Input
              label="نام ربات"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="ربات معامله‌گری من"
              fullWidth
            />
          </FormGroup>
          
          <FormGroup>
            <Select
              label="استراتژی"
              value={formData.strategy_id}
              onChange={(e) => setFormData({ ...formData, strategy_id: e.target.value })}
              required
              fullWidth
            >
              <option value="">انتخاب استراتژی</option>
              {strategies.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </option>
              ))}
            </Select>
          </FormGroup>
          
          <FormGroup>
            <Select
              label="اتصال صرافی"
              value={formData.exchange_connection_id}
              onChange={(e) => setFormData({ ...formData, exchange_connection_id: e.target.value })}
              required
              fullWidth
            >
              <option value="">انتخاب صرافی</option>
              {exchanges.map((exchange) => (
                <option key={exchange.id} value={exchange.id}>
                  {exchange.name} ({exchange.exchange_type.toUpperCase()})
                </option>
              ))}
            </Select>
          </FormGroup>
          
          <FormRow columns={2}>
            <Input
              label="نماد"
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              required
              placeholder="BTC/USDT"
              fullWidth
            />
            <Select
              label="تایم‌فریم"
              value={formData.timeframe}
              onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
              required
              fullWidth
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </Select>
          </FormRow>
          
          <FormRow columns={2}>
            <Input
              label="لوریج"
              type="number"
              value={formData.leverage}
              onChange={(e) => setFormData({ ...formData, leverage: e.target.value })}
              min="1"
              max="125"
              required
              fullWidth
            />
            <Select
              label="نوع مارجین"
              value={formData.margin_type}
              onChange={(e) => setFormData({ ...formData, margin_type: e.target.value })}
              required
              fullWidth
            >
              <option value="isolated">ایزوله</option>
              <option value="cross">کراس</option>
            </Select>
          </FormRow>
          
          <FormGroup>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.use_fixed_size}
                onChange={(e) => setFormData({ ...formData, use_fixed_size: e.target.checked })}
              />
              <span>استفاده از اندازه ثابت پوزیشن</span>
            </label>
          </FormGroup>
          
          {formData.use_fixed_size ? (
            <FormGroup>
              <Input
                label="اندازه پوزیشن (USDT)"
                type="number"
                value={formData.position_size_fixed}
                onChange={(e) => setFormData({ ...formData, position_size_fixed: e.target.value })}
                min="0"
                step="0.01"
                required
                fullWidth
              />
            </FormGroup>
          ) : (
            <FormGroup>
              <Input
                label="اندازه پوزیشن (%)"
                type="number"
                value={formData.position_size_percent}
                onChange={(e) => setFormData({ ...formData, position_size_percent: e.target.value })}
                min="0"
                max="100"
                step="0.1"
                required
                fullWidth
              />
            </FormGroup>
          )}
          
          <FormGroup>
            <Select
              label="نوع اجرای سفارش"
              value={formData.order_execution_type}
              onChange={(e) => setFormData({ ...formData, order_execution_type: e.target.value })}
              required
              fullWidth
            >
              <option value="market">قیمت مارکت (Market Price)</option>
              <option value="trigger_price">قیمت تریگر شده (Trigger Price)</option>
            </Select>
            <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
              {formData.order_execution_type === 'market' 
                ? 'معامله با قیمت فعلی بازار اجرا می‌شود'
                : 'معامله با قیمت مشخص شده در زمان تریگر اجرا می‌شود'}
            </small>
          </FormGroup>
          
          <FormRow columns={2}>
            <Input
              label="حداکثر معاملات روزانه (اختیاری)"
              type="number"
              value={formData.max_daily_trades}
              onChange={(e) => setFormData({ ...formData, max_daily_trades: e.target.value })}
              min="1"
              placeholder="نامحدود"
              fullWidth
            />
            <Input
              label="حداکثر پوزیشن‌های باز"
              type="number"
              value={formData.max_open_positions}
              onChange={(e) => setFormData({ ...formData, max_open_positions: e.target.value })}
              min="1"
              required
              fullWidth
            />
          </FormRow>
          
          <FormActions>
            <Button
              type="button"
              onClick={() => setShowAddModal(false)}
              variant="secondary"
              disabled={submitting}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              disabled={submitting}
            >
              ایجاد ربات
            </Button>
          </FormActions>
        </form>
      </Modal>
    </div>
  );
};

export default BotManagement;

