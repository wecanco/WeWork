import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from './Toast';
import { useAuth } from './AuthContext';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  FormGroup,
  FormActions,
  Loading,
} from '../ui';
import { API_BASE_URL } from '../config';
import './TelegramSettings.css';

const TelegramSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    telegram_enabled: false,
    telegram_bot_token: '',
    telegram_chat_id: '',
  });
  const toast = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // axios already has Authorization header from AuthContext
      // fallback to localStorage for SSR/misalignment cases
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const response = await axios.get(`${API_BASE_URL}/auth/me/telegram`, { headers });
      setSettings({
        telegram_enabled: response.data.telegram_enabled || false,
        telegram_bot_token: response.data.telegram_bot_token || '',
        telegram_chat_id: response.data.telegram_chat_id || '',
      });
    } catch (error) {
      console.error('Failed to load Telegram settings:', error);
      toast.error('خطا در بارگذاری تنظیمات تلگرام');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      await axios.patch(
        `${API_BASE_URL}/auth/me/telegram`,
        settings,
        { headers }
      );
      toast.success('تنظیمات تلگرام با موفقیت ذخیره شد');
    } catch (error) {
      console.error('Failed to save Telegram settings:', error);
      toast.error('خطا در ذخیره تنظیمات تلگرام');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <div className="telegram-settings-loading">
        <Loading />
      </div>
    );
  }

  return (
    <div className="telegram-settings">
      <Card>
        <CardHeader>
          <h2>تنظیمات اعلان‌های تلگرام</h2>
        </CardHeader>
        <CardBody>
          <div className="telegram-settings-content">
            <div className="telegram-info">
              <p>
                برای دریافت اعلان‌های معاملات در تلگرام، ابتدا یک ربات تلگرام ایجاد کنید و توکن آن را در اینجا وارد کنید.
              </p>
              <ol>
                <li>
                  با <strong>@BotFather</strong> در تلگرام صحبت کنید
                </li>
                <li>
                  دستور <code>/newbot</code> را ارسال کنید و نام ربات را انتخاب کنید
                </li>
                <li>
                  توکن ربات را کپی کرده و در فیلد زیر وارد کنید
                </li>
                <li>
                  برای دریافت Chat ID، ربات را به یک کانال یا گروه اضافه کنید و سپس با ربات{' '}
                  <strong>@userinfobot</strong> صحبت کنید یا از روش‌های دیگر استفاده کنید
                </li>
              </ol>
            </div>

            <FormGroup>
              <label>
                <input
                  type="checkbox"
                  checked={settings.telegram_enabled}
                  onChange={(e) => handleChange('telegram_enabled', e.target.checked)}
                />
                <span>فعال‌سازی اعلان‌های تلگرام</span>
              </label>
            </FormGroup>

            {settings.telegram_enabled && (
              <>
                <FormGroup>
                  <label>
                    <span>توکن ربات تلگرام</span>
                    <Input
                      type="text"
                      placeholder="مثال: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                      value={settings.telegram_bot_token}
                      onChange={(e) => handleChange('telegram_bot_token', e.target.value)}
                    />
                  </label>
                  <small>
                    توکن ربات خود را از BotFather دریافت کنید
                  </small>
                </FormGroup>

                <FormGroup>
                  <label>
                    <span>Chat ID یا Channel ID</span>
                    <Input
                      type="text"
                      placeholder="مثال: -1001234567890 یا 123456789"
                      value={settings.telegram_chat_id}
                      onChange={(e) => handleChange('telegram_chat_id', e.target.value)}
                    />
                  </label>
                  <small>
                    برای کانال: عدد منفی (مثل -1001234567890) | برای چت شخصی: عدد مثبت
                  </small>
                </FormGroup>
              </>
            )}

            <FormActions>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
              </Button>
            </FormActions>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default TelegramSettings;

