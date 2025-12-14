import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { X } from 'lucide-react'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Handle,
  Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import axios from 'axios'
import NodePanel from './NodePanel'
import IndicatorPalette from './IndicatorPalette'
import StrategyConfig from './StrategyConfig'
import StrategySettings from './StrategySettings'
import { useHistory } from '../hooks/useHistory'
import { useToast } from './Toast'
import { useConfirm } from './ConfirmModal'
import './StrategyBuilder.css'
import { STRATEGIES_API_BASE_URL, API_BASE_URL } from '../config'

const API_BASE = STRATEGIES_API_BASE_URL
const MARKET_API = `${API_BASE_URL}/strategy-market`

// Helper function to generate comprehensive node guide
export function getNodeGuide(indicatorType, indicator) {
  const guides = {
    // Momentum Indicators
    rsi: {
      title: 'RSI (Relative Strength Index)',
      description: 'اندیکاتور RSI قدرت نسبی بازار را اندازه‌گیری می‌کند و مقادیر بین 0 تا 100 دارد.',
      category: 'مومنتوم',
      usage: 'RSI برای شناسایی مناطق اشباع خرید (بالای 70) و اشباع فروش (زیر 30) استفاده می‌شود.',
      inputs: 'ورودی: هیچ (از داده‌های قیمت استفاده می‌کند)',
      outputs: 'خروجی: عدد بین 0 تا 100',
      examples: [
        {
          title: 'سیگنال خرید: RSI < 30',
          description: 'وقتی RSI زیر 30 باشد، نشان‌دهنده اشباع فروش و احتمال بازگشت قیمت به بالا است.'
        },
        {
          title: 'سیگنال فروش: RSI > 70',
          description: 'وقتی RSI بالای 70 باشد، نشان‌دهنده اشباع خرید و احتمال بازگشت قیمت به پایین است.'
        },
        {
          title: 'واگرایی',
          description: 'واگرایی بین RSI و قیمت می‌تواند نشان‌دهنده تغییر روند باشد. مثلاً اگر قیمت در حال افزایش باشد اما RSI کاهش یابد، ممکن است روند صعودی ضعیف شود.'
        }
      ],
      parameters: {
        period: 'دوره محاسبه (پیش‌فرض: 14). مقادیر کوچکتر حساس‌تر هستند.',
        source: 'منبع قیمت (پیش‌فرض: close). می‌تواند open, high, low, close, hl2, hlc3, ohlc4 باشد.',
        lookback: 'نگاه به عقب (پیش‌فرض: 0). 0 یعنی کندل فعلی، 1 یعنی کندل قبلی.'
      },
      tips: [
        'RSI با period=14 برای تایم‌فریم‌های روزانه مناسب است.',
        'برای تایم‌فریم‌های کوتاه‌تر (1h, 4h) می‌توانید period=9 استفاده کنید.',
        'برای تایم‌فریم‌های بلندمدت (weekly) می‌توانید period=21 استفاده کنید.',
        'RSI در روندهای قوی ممکن است برای مدت طولانی در مناطق اشباع باقی بماند.'
      ]
    },
    rsi_ma: {
      title: 'RSI MA (Moving Average of RSI)',
      description: 'میانگین متحرک RSI که نوسانات RSI را هموار می‌کند و سیگنال‌های پایدارتری می‌دهد.',
      category: 'مومنتوم',
      usage: 'RSI MA برای فیلتر کردن نویز RSI و شناسایی روندهای پایدارتر استفاده می‌شود.',
      inputs: 'ورودی: هیچ',
      outputs: 'خروجی: عدد بین 0 تا 100',
      examples: [
        {
          title: 'کراس RSI و RSI MA',
          description: 'وقتی RSI از بالا RSI MA را قطع کند، سیگنال خرید است. وقتی از پایین قطع کند، سیگنال فروش است.'
        },
        {
          title: 'روند صعودی',
          description: 'وقتی RSI MA در حال افزایش باشد و بالای 50 باشد، نشان‌دهنده روند صعودی است.'
        }
      ],
      parameters: {
        rsi_period: 'دوره RSI (پیش‌فرض: 14)',
        ma_period: 'دوره میانگین متحرک (پیش‌فرض: 21)',
        ma_type: 'نوع MA: EMA (سریع‌تر) یا SMA (پایدارتر)',
        source: 'منبع قیمت',
        lookback: 'نگاه به عقب'
      },
      tips: [
        'ma_period معمولاً 1.5 تا 2 برابر rsi_period است.',
        'EMA برای واکنش سریع‌تر، SMA برای پایدارتر بودن.'
      ]
    },
    macd: {
      title: 'MACD (Moving Average Convergence Divergence)',
      description: 'اندیکاتور MACD از تفاوت دو میانگین متحرک نمایی (EMA) برای شناسایی تغییرات روند استفاده می‌کند.',
      category: 'مومنتوم',
      usage: 'MACD برای شناسایی تغییرات روند و قدرت حرکت قیمت استفاده می‌شود.',
      inputs: 'ورودی: هیچ',
      outputs: 'خروجی: مقدار MACD (می‌تواند مثبت یا منفی باشد)',
      examples: [
        {
          title: 'کراس خط صفر',
          description: 'وقتی MACD از زیر صفر به بالای صفر برود، سیگنال خرید است. برعکس آن سیگنال فروش است.'
        },
        {
          title: 'کراس خط سیگنال',
          description: 'وقتی MACD از پایین خط سیگنال را قطع کند، سیگنال خرید است. برعکس آن سیگنال فروش است.'
        },
        {
          title: 'واگرایی',
          description: 'واگرایی بین MACD و قیمت می‌تواند نشان‌دهنده تغییر روند باشد.'
        }
      ],
      parameters: {
        fast_period: 'دوره EMA سریع (پیش‌فرض: 12)',
        slow_period: 'دوره EMA کند (پیش‌فرض: 26)',
        signal_period: 'دوره خط سیگنال (پیش‌فرض: 9)',
        lookback: 'نگاه به عقب'
      },
      tips: [
        'fast_period معمولاً نصف slow_period است.',
        'signal_period معمولاً 9 است و برای فیلتر کردن نویز استفاده می‌شود.',
        'MACD در روندهای قوی بهتر کار می‌کند.'
      ]
    },
    ema: {
      title: 'EMA (Exponential Moving Average)',
      description: 'میانگین متحرک نمایی که وزن بیشتری به قیمت‌های اخیر می‌دهد و سریع‌تر به تغییرات واکنش نشان می‌دهد.',
      category: 'روند',
      usage: 'EMA برای شناسایی روند و نقاط حمایت/مقاومت استفاده می‌شود.',
      inputs: 'ورودی: هیچ (یا می‌تواند به منبع قیمت دیگری متصل شود)',
      outputs: 'خروجی: مقدار EMA',
      examples: [
        {
          title: 'روند صعودی',
          description: 'وقتی قیمت بالای EMA باشد، روند صعودی است. EMA به عنوان حمایت عمل می‌کند.'
        },
        {
          title: 'روند نزولی',
          description: 'وقتی قیمت زیر EMA باشد، روند نزولی است. EMA به عنوان مقاومت عمل می‌کند.'
        },
        {
          title: 'کراس قیمت و EMA',
          description: 'وقتی قیمت از پایین EMA را قطع کند و بالای آن برود، سیگنال خرید است. برعکس آن سیگنال فروش است.'
        }
      ],
      parameters: {
        period: 'دوره محاسبه (پیش‌فرض: 20). مقادیر کوچکتر حساس‌تر هستند.',
        source: 'منبع قیمت (پیش‌فرض: close)',
        lookback: 'نگاه به عقب'
      },
      tips: [
        'EMA با period=20 برای روندهای کوتاه‌مدت مناسب است.',
        'EMA با period=50 برای روندهای میان‌مدت مناسب است.',
        'EMA با period=200 برای روندهای بلندمدت مناسب است.',
        'EMA سریع‌تر از SMA به تغییرات واکنش نشان می‌دهد.'
      ]
    },
    golden_cross: {
      title: 'Golden Cross',
      description: 'تشخیص کراس EMA سریع و کند (Golden/Death Cross) برای سیگنال‌های روندی.',
      category: 'روند',
      usage: 'وقتی EMA سریع از پایین EMA کند عبور کند سیگنال صعودی (Golden Cross) و برعکس آن سیگنال نزولی (Death Cross) است.',
      inputs: 'ورودی: داده قیمت (می‌توانید منبع هر EMA را جداگانه انتخاب کنید).',
      outputs: 'خروجی: در حالت both اعداد 1 (کراس صعودی)، -1 (کراس نزولی)، 0 (بدون کراس). در حالت bullish/bearish خروجی بولین است.',
      examples: [
        {
          title: 'Golden Cross کلاسیک',
          description: 'EMA-50 به عنوان سریع و EMA-200 به عنوان کند؛ عبور EMA-50 از EMA-200 نشانه تغییر روند به صعود است.'
        },
        {
          title: 'Death Cross',
          description: 'وقتی EMA سریع زیر EMA کند برود، می‌تواند هشدار پایان روند صعودی باشد.'
        }
      ],
      parameters: {
        fast_period: 'دوره EMA سریع (پیش‌فرض: 13)',
        slow_period: 'دوره EMA کند (پیش‌فرض: 49)',
        fast_source: 'منبع قیمت برای EMA سریع (پیش‌فرض: close)',
        slow_source: 'منبع قیمت برای EMA کند (پیش‌فرض: close)',
        signal: 'نوع سیگنال: both (1/-1/0)، فقط bullish یا فقط bearish',
        lookback: 'نگاه به عقب'
      },
      tips: [
        'برای روندهای بلندمدت از ترکیب 50/200 استفاده کنید.',
        'در تایم‌فریم‌های کوتاه‌تر می‌توانید از مقادیر سریع‌تر مثل 9/21 بهره ببرید.',
        'برای تأیید، می‌توانید خروجی را با volume یا ADX ترکیب کنید.'
      ]
    },
    sma: {
      title: 'SMA (Simple Moving Average)',
      description: 'میانگین متحرک ساده که میانگین قیمت در دوره مشخص را محاسبه می‌کند.',
      category: 'روند',
      usage: 'SMA برای شناسایی روند و نقاط حمایت/مقاومت استفاده می‌شود.',
      inputs: 'ورودی: هیچ',
      outputs: 'خروجی: مقدار SMA',
      examples: [
        {
          title: 'روند صعودی',
          description: 'وقتی قیمت بالای SMA باشد، روند صعودی است.'
        },
        {
          title: 'کراس دو SMA',
          description: 'وقتی SMA کوتاه‌مدت (مثلاً 20) از پایین SMA بلندمدت (مثلاً 50) را قطع کند، سیگنال خرید است.'
        }
      ],
      parameters: {
        period: 'دوره محاسبه (پیش‌فرض: 20)',
        source: 'منبع قیمت',
        lookback: 'نگاه به عقب'
      },
      tips: [
        'SMA پایدارتر از EMA است اما کندتر واکنش نشان می‌دهد.',
        'برای روندهای بلندمدت SMA مناسب‌تر است.'
      ]
    },
    bollinger_bands: {
      title: 'Bollinger Bands (Middle)',
      description: 'باند میانی بولینگر که همان میانگین متحرک ساده (SMA) است.',
      category: 'روند',
      usage: 'برای شناسایی روند و مرکز نوسانات استفاده می‌شود.',
      inputs: 'ورودی: هیچ',
      outputs: 'خروجی: باند میانی (SMA)',
      examples: [
        {
          title: 'شناسایی روند',
          description: 'وقتی قیمت بالای باند میانی باشد، روند صعودی است.'
        },
        {
          title: 'تماس با باند بالا',
          description: 'وقتی قیمت به باند بالا برسد، ممکن است نشان‌دهنده اشباع خرید باشد.'
        },
        {
          title: 'فشردگی باندها',
          description: 'وقتی باندها به هم نزدیک شوند (فشردگی)، ممکن است نشان‌دهنده حرکت قوی بعدی باشد.'
        }
      ],
      parameters: {
        period: 'دوره میانگین متحرک (پیش‌فرض: 20)',
        std_dev: 'تعداد انحراف معیار (پیش‌فرض: 2.0)',
        lookback: 'نگاه به عقب'
      },
      tips: [
        'برای روندهای کوتاه‌مدت از دوره 10-15 استفاده کنید.',
        'برای روندهای بلندمدت از دوره 20-30 استفاده کنید.',
        'ضریب انحراف معیار 2.0 استاندارد است، اما می‌توانید آن را تنظیم کنید.'
      ]
    },
    bollinger_bands_upper: {
      title: 'Bollinger Bands (Upper)',
      description: 'باند بالایی بولینگر که از SMA + (انحراف معیار × ضریب) محاسبه می‌شود.',
      category: 'روند',
      usage: 'برای شناسایی مقاومت و مناطق اشباع خرید استفاده می‌شود.',
      inputs: 'ورودی: هیچ',
      outputs: 'خروجی: باند بالایی',
      examples: [
        {
          title: 'اشباع خرید',
          description: 'وقتی قیمت به باند بالایی برسد، ممکن است نشان‌دهنده اشباع خرید باشد.'
        },
        {
          title: 'نقاط مقاومت',
          description: 'باند بالایی می‌تواند به عنوان سطح مقاومت عمل کند.'
        }
      ],
      parameters: {
        period: 'دوره میانگین متحرک (پیش‌فرض: 20)',
        std_dev: 'تعداد انحراف معیار (پیش‌فرض: 2.0)',
        lookback: 'نگاه به عقب'
      },
      tips: [
        'از باند بالایی برای شناسایی نقاط ورود به پوزیشن فروش استفاده کنید.',
        'عبور قیمت از باند بالایی ممکن است نشان‌دهنده حرکت قوی صعودی باشد.'
      ]
    },
    bollinger_bands_lower: {
      title: 'Bollinger Bands (Lower)',
      description: 'باند پایینی بولینگر که از SMA - (انحراف معیار × ضریب) محاسبه می‌شود.',
      category: 'روند',
      usage: 'برای شناسایی حمایت و مناطق اشباع فروش استفاده می‌شود.',
      inputs: 'ورودی: هیچ',
      outputs: 'خروجی: باند پایینی',
      examples: [
        {
          title: 'اشباع فروش',
          description: 'وقتی قیمت به باند پایینی برسد، ممکن است نشان‌دهنده اشباع فروش باشد.'
        },
        {
          title: 'نقاط حمایت',
          description: 'باند پایینی می‌تواند به عنوان سطح حمایت عمل کند.'
        }
      ],
      parameters: {
        period: 'دوره میانگین متحرک (پیش‌فرض: 20)',
        std_dev: 'تعداد انحراف معیار (پیش‌فرض: 2.0)',
        lookback: 'نگاه به عقب'
      },
      tips: [
        'از باند پایینی برای شناسایی نقاط ورود به پوزیشن خرید استفاده کنید.',
        'عبور قیمت از باند پایینی ممکن است نشان‌دهنده حرکت قوی نزولی باشد.',
        'std_dev=2.0 برای بیشتر بازارها مناسب است.',
        'std_dev کوچکتر (1.5) باندهای باریک‌تر و سیگنال‌های بیشتر می‌دهد.',
        'std_dev بزرگتر (2.5-3) باندهای پهن‌تر و سیگنال‌های کمتر اما قابل اعتمادتر می‌دهد.'
      ]
    },
    atr: {
      title: 'ATR (Average True Range)',
      description: 'میانگین محدوده واقعی که نوسانات بازار را اندازه‌گیری می‌کند.',
      category: 'نوسان',
      usage: 'ATR برای محاسبه فاصله استاپ لاس و تیک پروفیت بر اساس نوسانات واقعی بازار استفاده می‌شود.',
      inputs: 'ورودی: هیچ',
      outputs: 'خروجی: مقدار ATR',
      examples: [
        {
          title: 'محاسبه استاپ لاس',
          description: 'استاپ لاس = قیمت ورود ± (ATR × ضریب). مثلاً اگر ATR=100 و ضریب=2 باشد، استاپ لاس 200 واحد از قیمت ورود فاصله دارد.'
        },
        {
          title: 'اندازه‌گیری نوسانات',
          description: 'ATR بالا نشان‌دهنده نوسانات زیاد و ATR پایین نشان‌دهنده نوسانات کم است.'
        }
      ],
      parameters: {
        period: 'دوره محاسبه (پیش‌فرض: 14)',
        lookback: 'نگاه به عقب'
      },
      tips: [
        'ATR برای محاسبه استاپ لاس و تیک پروفیت بسیار مفید است.',
        'در بازارهای پرنوسان، ATR بزرگتر می‌شود و باید استاپ لاس بزرگتری تنظیم کنید.',
        'ضریب ATR معمولاً بین 1.5 تا 3 است.'
      ]
    },
    // Conditions
    greater_than: {
      title: 'Greater Than (>)',
      description: 'بررسی می‌کند که آیا ورودی a بزرگتر از ورودی b است یا نه.',
      category: 'شرط',
      usage: 'برای مقایسه دو مقدار و ایجاد شرط استفاده می‌شود.',
      inputs: 'ورودی a: مقدار اول، ورودی b: مقدار دوم',
      outputs: 'خروجی: true اگر a > b، در غیر این صورت false',
      examples: [
        {
          title: 'RSI > 70',
          description: 'بررسی می‌کند که آیا RSI بزرگتر از 70 است (اشباع خرید).'
        },
        {
          title: 'قیمت > EMA',
          description: 'بررسی می‌کند که آیا قیمت بالای EMA است (روند صعودی).'
        }
      ],
      parameters: {
        lookback: 'نگاه به عقب برای بررسی در کندل‌های قبلی'
      },
      tips: [
        'می‌توانید از Constant node برای مقدار ثابت استفاده کنید.',
        'می‌توانید دو اندیکاتور را با هم مقایسه کنید.'
      ]
    },
    less_than: {
      title: 'Less Than (<)',
      description: 'بررسی می‌کند که آیا ورودی a کوچکتر از ورودی b است یا نه.',
      category: 'شرط',
      usage: 'برای مقایسه دو مقدار و ایجاد شرط استفاده می‌شود.',
      inputs: 'ورودی a: مقدار اول، ورودی b: مقدار دوم',
      outputs: 'خروجی: true اگر a < b، در غیر این صورت false',
      examples: [
        {
          title: 'RSI < 30',
          description: 'بررسی می‌کند که آیا RSI کوچکتر از 30 است (اشباع فروش).'
        }
      ],
      parameters: {
        lookback: 'نگاه به عقب'
      },
      tips: []
    },
    between: {
      title: 'Between',
      description: 'بررسی می‌کند که آیا ورودی a بین ورودی b و ورودی c قرار دارد یا نه.',
      category: 'شرط',
      usage: 'برای بررسی قرارگیری یک مقدار در بازه مشخص استفاده می‌شود.',
      inputs: 'ورودی a: مقدار مورد بررسی، ورودی b: حد پایین، ورودی c: حد بالا',
      outputs: 'خروجی: true اگر b ≤ a ≤ c، در غیر این صورت false',
      examples: [
        {
          title: 'RSI بین 40 و 60',
          description: 'بررسی می‌کند که آیا RSI در بازه نرمال (40-60) قرار دارد.'
        }
      ],
      parameters: {
        lookback: 'نگاه به عقب'
      },
      tips: []
    },
    cross_above: {
      title: 'Cross Above',
      description: 'بررسی می‌کند که آیا ورودی a از پایین ورودی b را قطع کرده و بالای آن رفته است.',
      category: 'شرط',
      usage: 'برای شناسایی کراس صعودی دو خط استفاده می‌شود.',
      inputs: 'ورودی a: خط اول، ورودی b: خط دوم',
      outputs: 'خروجی: true اگر a از پایین b را قطع کرده باشد',
      examples: [
        {
          title: 'کراس قیمت و EMA',
          description: 'وقتی قیمت از پایین EMA را قطع کند و بالای آن برود، سیگنال خرید است.'
        },
        {
          title: 'کراس MACD و خط سیگنال',
          description: 'وقتی MACD از پایین خط سیگنال را قطع کند، سیگنال خرید است.'
        }
      ],
      parameters: {
        lookback: 'نگاه به عقب',
        check_previous_candle: 'بررسی کراس در کندل قبلی (برای تایید)'
      },
      tips: [
        'check_previous_candle=true برای تایید سیگنال و کاهش سیگنال‌های نادرست مفید است.'
      ]
    },
    cross_below: {
      title: 'Cross Below',
      description: 'بررسی می‌کند که آیا ورودی a از بالا ورودی b را قطع کرده و زیر آن رفته است.',
      category: 'شرط',
      usage: 'برای شناسایی کراس نزولی دو خط استفاده می‌شود.',
      inputs: 'ورودی a: خط اول، ورودی b: خط دوم',
      outputs: 'خروجی: true اگر a از بالا b را قطع کرده باشد',
      examples: [
        {
          title: 'کراس قیمت و EMA',
          description: 'وقتی قیمت از بالا EMA را قطع کند و زیر آن برود، سیگنال فروش است.'
        }
      ],
      parameters: {
        lookback: 'نگاه به عقب',
        check_previous_candle: 'بررسی کراس در کندل قبلی'
      },
      tips: []
    },
    // Logic
    and: {
      title: 'AND (و منطقی)',
      description: 'نتیجه true برمی‌گرداند اگر هر دو ورودی true باشند.',
      category: 'منطق',
      usage: 'برای ترکیب چند شرط و نیاز به برقراری همه آن‌ها.',
      inputs: 'ورودی 1: شرط اول، ورودی 2: شرط دوم',
      outputs: 'خروجی: true اگر هر دو ورودی true باشند',
      examples: [
        {
          title: 'RSI < 30 AND قیمت > EMA',
          description: 'هم RSI باید زیر 30 باشد و هم قیمت باید بالای EMA باشد.'
        }
      ],
      parameters: {},
      tips: [
        'می‌توانید چند AND را به هم متصل کنید برای شرط‌های بیشتر.',
        'AND برای فیلتر کردن سیگنال‌ها و کاهش نویز مفید است.'
      ]
    },
    or: {
      title: 'OR (یا منطقی)',
      description: 'نتیجه true برمی‌گرداند اگر حداقل یکی از ورودی‌ها true باشد.',
      category: 'منطق',
      usage: 'برای ترکیب چند شرط و نیاز به برقراری حداقل یکی از آن‌ها.',
      inputs: 'ورودی 1: شرط اول، ورودی 2: شرط دوم',
      outputs: 'خروجی: true اگر حداقل یکی از ورودی‌ها true باشد',
      examples: [
        {
          title: 'RSI < 30 OR RSI > 70',
          description: 'یا RSI زیر 30 است یا بالای 70 (هر دو حالت اشباع).'
        }
      ],
      parameters: {},
      tips: [
        'OR برای افزایش تعداد سیگنال‌ها استفاده می‌شود.',
        'می‌توانید OR و AND را ترکیب کنید.'
      ]
    },
    not: {
      title: 'NOT (نقیض منطقی)',
      description: 'نتیجه معکوس ورودی را برمی‌گرداند.',
      category: 'منطق',
      usage: 'برای معکوس کردن نتیجه یک شرط.',
      inputs: 'ورودی: شرط',
      outputs: 'خروجی: true اگر ورودی false باشد و برعکس',
      examples: [
        {
          title: 'NOT (قیمت > EMA)',
          description: 'بررسی می‌کند که آیا قیمت زیر EMA است.'
        }
      ],
      parameters: {},
      tips: []
    },
    // Math Operations
    percent_change: {
      title: 'Percent Change (درصد تغییر)',
      description: 'محاسبه درصد تغییر از مقدار اولیه. فرمول: ((B - A) / A) × 100. مقدار مثبت = افزایش، مقدار منفی = کاهش.',
      category: 'ریاضی',
      usage: 'برای محاسبه درصد تغییر بین دو مقدار. مثلاً درصد تغییر قیمت از کندل قبلی به کندل فعلی، یا درصد تغییر RSI در یک بازه زمانی.',
      inputs: 'ورودی a: مقدار اولیه (مقدار مرجع)، ورودی b: مقدار فعلی (مقدار جدید)',
      outputs: 'خروجی: درصد تغییر به صورت عدد (مثبت = افزایش، منفی = کاهش). اگر a = 0 باشد، خروجی 0 است.',
      examples: [
        {
          title: 'درصد تغییر قیمت',
          description: 'برای محاسبه درصد تغییر قیمت: یک نود Price Source (source=close) با lookback=1 به ورودی a متصل کنید (قیمت کندل قبلی) و یک نود Price Source (source=close) با lookback=0 به ورودی b متصل کنید (قیمت کندل فعلی). خروجی درصد تغییر قیمت از کندل قبلی به کندل فعلی است.'
        },
        {
          title: 'درصد تغییر RSI',
          description: 'برای محاسبه درصد تغییر RSI: یک نود RSI با lookback=5 به ورودی a و یک نود RSI با lookback=0 به ورودی b متصل کنید. خروجی درصد تغییر RSI در 5 کندل گذشته است.'
        },
        {
          title: 'مقایسه قیمت با EMA',
          description: 'برای محاسبه فاصله درصدی قیمت از EMA: یک نود EMA به ورودی a و یک نود Price Source به ورودی b متصل کنید. خروجی نشان می‌دهد قیمت چند درصد از EMA فاصله دارد (مثبت = بالای EMA، منفی = زیر EMA).'
        },
        {
          title: 'درصد تغییر حجم',
          description: 'برای محاسبه درصد تغییر حجم: یک نود Volume SMA با lookback=1 به ورودی a و یک نود Volume SMA با lookback=0 به ورودی b متصل کنید. خروجی درصد تغییر حجم از کندل قبلی است.'
        }
      ],
      parameters: {},
      tips: [
        'فرمول محاسبه: ((b - a) / a) × 100',
        'اگر a = 0 باشد، خروجی 0 است (برای جلوگیری از تقسیم بر صفر)',
        'مقدار مثبت = افزایش (b > a)',
        'مقدار منفی = کاهش (b < a)',
        'می‌توانید از Constant node برای مقدار مرجع ثابت استفاده کنید',
        'برای محاسبه درصد تغییر در بازه زمانی، از lookback استفاده کنید',
        'مثال: اگر a=100 و b=110 باشد، خروجی 10.0 است (10% افزایش)',
        'مثال: اگر a=100 و b=90 باشد، خروجی -10.0 است (10% کاهش)',
        'این نود برای شناسایی حرکات قوی قیمت و واگرایی‌ها مفید است'
      ]
    },
    // Risk Management
    stop_loss_calculator: {
      title: 'Stop Loss Calculator',
      description: 'محاسبه قیمت استاپ لاس بر اساس روش انتخابی. می‌توانید یک شرط به آن متصل کنید تا استاپ لاس فقط زمانی محاسبه شود که شرط برقرار باشد.',
      category: 'مدیریت ریسک',
      usage: 'برای محاسبه خودکار قیمت استاپ لاس بر اساس نوسانات بازار. می‌توانید یک نود شرطی (مثلاً RSI > 70) را به Handle "شرط" متصل کنید.',
      inputs: 'ورودی: قیمت ورود (اختیاری، اگر نباشد از قیمت فعلی استفاده می‌شود) | شرط: نود شرطی (اختیاری، برای فعال‌سازی شرطی استاپ لاس)',
      outputs: 'خروجی: قیمت استاپ لاس',
      examples: [
        {
          title: 'روش ATR',
          description: 'استاپ لاس = قیمت ورود ± (ATR × ضریب). برای خرید: قیمت - (ATR × 2)، برای فروش: قیمت + (ATR × 2).'
        },
        {
          title: 'روش Percentage',
          description: 'استاپ لاس = قیمت ورود ± (قیمت × درصد). مثلاً 2% یعنی استاپ لاس 2% از قیمت ورود فاصله دارد.'
        },
        {
          title: 'روش Swing',
          description: 'استاپ لاس در قله/دره قبلی قرار می‌گیرد. برای خرید: دره قبلی، برای فروش: قله قبلی.'
        },
        {
          title: 'استاپ لاس شرطی با RSI',
          description: 'یک نود RSI و یک نود Greater Than بسازید (مثلاً RSI > 70). سپس نود Greater Than را به Handle "شرط" نود Stop Loss متصل کنید. در این صورت استاپ لاس فقط زمانی محاسبه می‌شود که RSI بالای 70 باشد. اگر شرط False باشد، استاپ لاس تنظیم نمی‌شود (از fallback استفاده نمی‌شود).'
        },
        {
          title: 'استاپ لاس شرطی با اندیکاتور',
          description: 'می‌توانید هر شرطی را به Handle "شرط" متصل کنید. وقتی شرط متصل شود، استاپ لاس فقط بر اساس شرط عمل می‌کند: اگر شرط True باشد، استاپ لاس محاسبه می‌شود. اگر شرط False باشد، استاپ لاس تنظیم نمی‌شود (از fallback استفاده نمی‌شود).'
        },
        {
          title: 'استاپ لاس با بولینگر بند میدل',
          description: 'می‌توانید از بولینگر بند میدل برای استاپ لاس شرطی استفاده کنید. یک نود Price Source و یک نود Bollinger Bands Middle بسازید. سپس یک نود Less Than (برای لانگ) یا Greater Than (برای شورت) بسازید و شرط را به Handle "شرط" نود Stop Loss متصل کنید.'
        }
      ],
      parameters: {
        signal_type: 'نوع سیگنال: long (فقط برای لانگ), short (فقط برای شورت), both (برای هر دو). این پارامتر به شما امکان می‌دهد SL جداگانه برای لانگ و شورت داشته باشید.',
        method: 'روش محاسبه: fixed, percentage, pip, atr, swing, indicator',
        value: 'مقدار بر اساس روش (قیمت، درصد، پیپ، ضریب ATR)',
        atr_period: 'دوره ATR (برای روش atr)',
        atr_multiplier: 'ضریب ATR (برای روش atr)',
        swing_lookback: 'بازه نگاه به عقب (برای روش swing)',
        pip_size: 'اندازه پیپ (برای روش pip)'
      },
      tips: [
        'روش ATR برای بازارهای پرنوسان مناسب‌تر است.',
        'روش Swing برای روندهای قوی مناسب است.',
        'ضریب ATR معمولاً بین 1.5 تا 3 است.',
        'می‌توانید یک نود شرطی (مثلاً Greater Than, Less Than, AND, OR) را به Handle "شرط" متصل کنید.',
        'وقتی شرط متصل شود، استاپ لاس فقط بر اساس شرط عمل می‌کند: اگر شرط True باشد، استاپ لاس محاسبه می‌شود. اگر شرط False باشد، استاپ لاس تنظیم نمی‌شود (از fallback استفاده نمی‌شود).',
        'اگر شرط متصل نشده باشد، استاپ لاس به صورت عادی محاسبه می‌شود و در صورت نیاز از fallback استفاده می‌شود.',
        'این قابلیت برای استراتژی‌های پیشرفته که نیاز به استاپ لاس شرطی دارند بسیار مفید است.'
      ]
    },
    take_profit_calculator: {
      title: 'Take Profit Calculator',
      description: 'محاسبه قیمت تیک پروفیت بر اساس روش انتخابی. می‌توانید یک شرط به آن متصل کنید تا تیک پروفیت فقط زمانی محاسبه شود که شرط برقرار باشد.',
      category: 'مدیریت ریسک',
      usage: 'برای محاسبه خودکار قیمت تیک پروفیت. می‌توانید یک نود شرطی (مثلاً RSI > 70) را به Handle "شرط" متصل کنید.',
      inputs: 'ورودی: قیمت ورود | شرط: نود شرطی (اختیاری، برای فعال‌سازی شرطی تیک پروفیت)',
      outputs: 'خروجی: قیمت تیک پروفیت',
      examples: [
        {
          title: 'روش Risk/Reward',
          description: 'تیک پروفیت = قیمت ورود ± (فاصله استاپ × نسبت). مثلاً اگر استاپ 100 واحد فاصله داشته باشد و نسبت 1.5 باشد، تیک پروفیت 150 واحد فاصله دارد.'
        },
        {
          title: 'تیک پروفیت شرطی با RSI',
          description: 'یک نود RSI و یک نود Greater Than بسازید (مثلاً RSI > 70). سپس نود Greater Than را به Handle "شرط" نود Take Profit متصل کنید. در این صورت تیک پروفیت فقط زمانی محاسبه می‌شود که RSI بالای 70 باشد. اگر شرط False باشد، تیک پروفیت تنظیم نمی‌شود (از fallback استفاده نمی‌شود).'
        },
        {
          title: 'تیک پروفیت شرطی با اندیکاتور',
          description: 'می‌توانید هر شرطی را به Handle "شرط" متصل کنید. وقتی شرط متصل شود، تیک پروفیت فقط بر اساس شرط عمل می‌کند: اگر شرط True باشد، تیک پروفیت محاسبه می‌شود. اگر شرط False باشد، تیک پروفیت تنظیم نمی‌شود (از fallback استفاده نمی‌شود).'
        },
        {
          title: 'تیک پروفیت شرطی برای خروج زودهنگام',
          description: 'می‌توانید از این قابلیت برای خروج زودهنگام استفاده کنید. مثلاً اگر RSI به 80 برسد، تیک پروفیت فعال می‌شود و پوزیشن بسته می‌شود.'
        },
        {
          title: 'تیک پروفیت با بولینگر بند میدل (لانگ)',
          description: 'برای سیگنال‌های لانگ: یک نود Take Profit اضافه کنید و پارامتر signal_type را روی "long" تنظیم کنید. سپس یک نود Price Source (source=close) و یک نود Bollinger Bands Middle بسازید. یک نود Greater Equal بسازید و Price Source را به ورودی a و Bollinger Bands Middle را به ورودی b متصل کنید. حالا نود Greater Equal را به Handle "شرط" نود Take Profit متصل کنید. در این صورت وقتی سیگنال لانگ باشد و قیمت به میدل بولینگر بند برسد یا بالاتر برود، TP فعال می‌شود.'
        },
        {
          title: 'تیک پروفیت با بولینگر بند میدل (شورت)',
          description: 'برای سیگنال‌های شورت: یک نود Take Profit اضافه کنید و پارامتر signal_type را روی "short" تنظیم کنید. سپس یک نود Price Source (source=close) و یک نود Bollinger Bands Middle بسازید. یک نود Less Equal بسازید و Price Source را به ورودی a و Bollinger Bands Middle را به ورودی b متصل کنید. حالا نود Less Equal را به Handle "شرط" نود Take Profit متصل کنید. در این صورت وقتی سیگنال شورت باشد و قیمت به میدل بولینگر بند برسد یا پایین‌تر برود، TP فعال می‌شود.'
        }
      ],
      parameters: {
        signal_type: 'نوع سیگنال: long (فقط برای لانگ), short (فقط برای شورت), both (برای هر دو). این پارامتر به شما امکان می‌دهد TP جداگانه برای لانگ و شورت داشته باشید.',
        method: 'روش محاسبه: fixed, percentage, pip, atr, risk_reward, indicator',
        value: 'مقدار بر اساس روش',
        risk_reward_ratio: 'نسبت ریسک به ریوارد (برای روش risk_reward)',
        atr_period: 'دوره ATR',
        atr_multiplier: 'ضریب ATR',
        pip_size: 'اندازه پیپ'
      },
      tips: [
        'نسبت Risk/Reward معمولاً بین 1.5 تا 3 است.',
        'نسبت بالاتر محافظه‌کارانه‌تر است اما احتمال رسیدن کمتر است.',
        'می‌توانید یک نود شرطی (مثلاً Greater Than, Less Than, AND, OR) را به Handle "شرط" متصل کنید.',
        'وقتی شرط متصل شود، تیک پروفیت فقط بر اساس شرط عمل می‌کند: اگر شرط True باشد، تیک پروفیت محاسبه می‌شود. اگر شرط False باشد، تیک پروفیت تنظیم نمی‌شود (از fallback استفاده نمی‌شود).',
        'اگر شرط متصل نشده باشد، تیک پروفیت به صورت عادی محاسبه می‌شود و در صورت نیاز از fallback استفاده می‌شود.',
        'این قابلیت برای استراتژی‌های پیشرفته که نیاز به تیک پروفیت شرطی دارند بسیار مفید است.',
        'مثال: اگر RSI > 70 را به TP متصل کنید، TP فقط زمانی فعال می‌شود که RSI بالای 70 باشد. اگر RSI زیر 70 باشد، TP تنظیم نمی‌شود.',
        'پارامتر signal_type به شما امکان می‌دهد TP جداگانه برای لانگ و شورت داشته باشید. مثلاً یک TP برای لانگ با شرط بولینگر و یک TP برای شورت با شرط دیگر.'
      ]
    },
    trailing_stop: {
      title: 'Trailing Stop',
      description: 'استاپ لاس متحرک که با حرکت قیمت به نفع شما، استاپ را جابجا می‌کند.',
      category: 'مدیریت ریسک',
      usage: 'برای قفل کردن سود و اجازه دادن به سود برای رشد بیشتر.',
      inputs: 'ورودی: قیمت فعلی',
      outputs: 'خروجی: قیمت استاپ لاس به‌روز شده',
      examples: [
        {
          title: 'تریلینگ با Percentage',
          description: 'وقتی قیمت 1% سود کند، تریلینگ فعال می‌شود و استاپ همیشه 0.5% از بالاترین قیمت فاصله دارد.'
        }
      ],
      parameters: {
        enabled: 'فعال/غیرفعال کردن تریلینگ',
        method: 'روش: percentage, atr, fixed',
        trigger_profit: 'درصد سود برای فعال شدن تریلینگ',
        trail_distance: 'فاصله تریلینگ (برای percentage)',
        atr_period: 'دوره ATR (برای atr)',
        atr_multiplier: 'ضریب ATR (برای atr)',
        fixed_distance: 'فاصله ثابت (برای fixed)'
      },
      tips: [
        'trigger_profit کوچکتر (0.005) زودتر فعال می‌شود.',
        'trail_distance کوچکتر استاپ تنگ‌تر و بزرگتر استاپ بازتر است.'
      ]
    },
    // Output
    signal_output: {
      title: 'Signal Output',
      description: 'خروجی نهایی استراتژی که سیگنال خرید یا فروش را تولید می‌کند.',
      category: 'خروجی',
      usage: 'این node باید در انتهای استراتژی قرار گیرد و به آن شرط نهایی متصل شود.',
      inputs: 'ورودی: نتیجه شرط نهایی (true/false)',
      outputs: 'خروجی: سیگنال خرید/فروش',
      examples: [
        {
          title: 'سیگنال خرید',
          description: 'وقتی ورودی true باشد، سیگنال خرید تولید می‌شود.'
        },
        {
          title: 'سیگنال فروش',
          description: 'وقتی ورودی true باشد، سیگنال فروش تولید می‌شود.'
        }
      ],
      parameters: {
        type: 'نوع سیگنال: long (خرید), short (فروش), both (هر دو)'
      },
      tips: [
        'هر استراتژی باید حداقل یک Signal Output داشته باشد.',
        'type=both برای استراتژی‌هایی که هم خرید و هم فروش دارند.'
      ]
    }
  }
  
  // Return specific guide or generate generic one
  if (guides[indicatorType]) {
    return guides[indicatorType]
  }
  
  // Generate generic guide from indicator data
  if (indicator) {
    return {
      title: indicator.name || indicatorType,
      description: indicator.description || 'اندیکاتور یا node',
      category: indicator.category || 'عمومی',
      usage: 'استفاده از این node در استراتژی',
      inputs: 'ورودی: بستگی به نوع node دارد',
      outputs: 'خروجی: بستگی به نوع node دارد',
      examples: [],
      parameters: Object.keys(indicator.params || {}).reduce((acc, key) => {
        acc[key] = indicator.params[key].description || `پارامتر ${key}`
        return acc
      }, {}),
      tips: []
    }
  }
  
  return {
    title: indicatorType,
    description: 'راهنمای node',
    category: 'عمومی',
    usage: '',
    inputs: '',
    outputs: '',
    examples: [],
    parameters: {},
    tips: []
  }
}

// Node Guide Modal Component
export function NodeGuideModal({ isOpen, onClose, nodeType, indicator }) {
  if (!isOpen) return null
  
  const guide = getNodeGuide(nodeType, indicator)
  
  return (
    <div className="node-guide-modal-overlay" onClick={onClose}>
      <div className="node-guide-modal" onClick={(e) => e.stopPropagation()}>
        <div className="node-guide-modal-header">
          <h2>{guide.title}</h2>
          <button className="node-guide-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="node-guide-modal-body">
          <div className="node-guide-section">
            <div className="node-guide-badge">{guide.category}</div>
            <p className="node-guide-description">{guide.description}</p>
          </div>
          
          {guide.usage && (
            <div className="node-guide-section">
              <h3>کاربرد</h3>
              <p>{guide.usage}</p>
            </div>
          )}
          
          <div className="node-guide-section">
            <h3>ورودی‌ها و خروجی‌ها</h3>
            <div className="node-guide-io">
              <div className="node-guide-io-item">
                <strong>ورودی:</strong> {guide.inputs}
              </div>
              <div className="node-guide-io-item">
                <strong>خروجی:</strong> {guide.outputs}
              </div>
            </div>
          </div>
          
          {guide.examples && guide.examples.length > 0 && (
            <div className="node-guide-section">
              <h3>مثال‌های کاربردی</h3>
              {guide.examples.map((example, index) => (
                <div key={index} className="node-guide-example">
                  <h4>{example.title}</h4>
                  <p>{example.description}</p>
                </div>
              ))}
            </div>
          )}
          
          {Object.keys(guide.parameters).length > 0 && (
            <div className="node-guide-section">
              <h3>پارامترها</h3>
              <div className="node-guide-parameters">
                {Object.entries(guide.parameters).map(([key, desc]) => (
                  <div key={key} className="node-guide-param">
                    <strong>{key}:</strong> {desc}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {guide.tips && guide.tips.length > 0 && (
            <div className="node-guide-section">
              <h3>نکات مهم</h3>
              <ul className="node-guide-tips">
                {guide.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
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

// Custom Node Components
function IndicatorNode({ data }) {
  const indicatorType = data?.indicatorType
  const params = data?.params || {}
  
  // For Pine Script nodes, extract title from code
  let label = data?.label || data?.indicatorType || 'Indicator'
  if (indicatorType === 'pinescript' && params.code) {
    const title = extractPineScriptTitle(params.code)
    if (title) {
      label = title
    }
  }
  
  // Check if this node can accept input from another node
  // pivot_low and pivot_high can accept input from another node (like RSI)
  const canAcceptInput = indicatorType === 'pivot_low' || indicatorType === 'pivot_high'
  
  return (
    <div className="custom-node indicator-node">
      {canAcceptInput && (
        <Handle type="target" position={Position.Top} id="input" style={{ left: '50%' }} />
      )}
      <div className="node-header">{label}</div>
      {Object.keys(params).length > 0 && (
        <div className="node-params">
          {Object.entries(params).slice(0, 2).map(([key, value]) => (
            (indicatorType == 'pinescript' && key == 'code') ? null : (
              <div key={key} className="param-item">
                {key}: {String(value)}
              </div>
            )
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

// Special node for value_when which needs 2 inputs: condition (a) and source (b)
function ValueWhenNode({ data }) {
  const label = data?.label || data?.indicatorType || 'Value When'
  
  return (
    <div className="custom-node indicator-node">
      <div className="condition-handles">
        <div className="handle-wrapper">
          <span className="handle-label">a</span>
          <Handle type="target" position={Position.Top} id="a" style={{ left: '25%' }} />
        </div>
        <div className="handle-wrapper">
          <span className="handle-label">b</span>
          <Handle type="target" position={Position.Top} id="b" style={{ left: '75%' }} />
        </div>
      </div>
      <div className="node-header">{label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

function MathNode({ data }) {
  const label = data?.label || data?.indicatorType || 'Math'
  const nodeType = data?.indicatorType || ''
  const isUnary = nodeType === 'abs'  // abs only needs one input
  
  return (
    <div className="custom-node indicator-node">
      <div className="condition-handles">
        <div className="handle-wrapper">
          <span className="handle-label">a</span>
          <Handle type="target" position={Position.Top} id="a" style={{ left: isUnary ? '50%' : '25%' }} />
        </div>
        {!isUnary && (
          <div className="handle-wrapper">
            <span className="handle-label">b</span>
            <Handle type="target" position={Position.Top} id="b" style={{ left: '75%' }} />
          </div>
        )}
      </div>
      <div className="node-header">{label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

function ConditionNode({ data }) {
  const label = data?.label || data?.indicatorType || 'Condition'
  const nodeType = data?.indicatorType || ''
  const isBetween = nodeType === 'between'
  
  return (
    <div className="custom-node condition-node">
      <div className="condition-handles">
        <div className="handle-wrapper">
          <span className="handle-label">a</span>
          <Handle type="target" position={Position.Top} id="a" style={{ left: isBetween ? '20%' : '25%' }} />
        </div>
        <div className="handle-wrapper">
          <span className="handle-label">b</span>
          <Handle type="target" position={Position.Top} id="b" style={{ left: isBetween ? '50%' : '75%' }} />
        </div>
        {isBetween && (
          <div className="handle-wrapper">
            <span className="handle-label">c</span>
            <Handle type="target" position={Position.Top} id="c" style={{ left: '80%' }} />
          </div>
        )}
      </div>
      <div className="node-header">{label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

function LogicNode({ data }) {
  const label = data?.label || data?.indicatorType || 'Logic'
  
  return (
    <div className="custom-node logic-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-header">{label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

function OutputNode({ data }) {
  const label = data?.label || data?.indicatorType || 'Output'
  
  return (
    <div className="custom-node output-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-header">{label}</div>
    </div>
  )
}

function RiskNode({ data }) {
  const label = data?.label || data?.indicatorType || 'Risk'
  const params = data?.params || {}
  const nodeType = data?.indicatorType || ''
  // TP and SL nodes can accept a condition input
  const isTPOrSL = nodeType === 'take_profit_calculator' || nodeType === 'stop_loss_calculator'
  
  return (
    <div className="custom-node risk-node">
      {/* Condition input handle for TP/SL nodes */}
      {isTPOrSL ? (
        <>
          <Handle type="target" position={Position.Top} id="condition" style={{ left: '50%' }} />
          <div className="node-handle-labels">
            <span className="handle-label-top" style={{ left: '50%' }}>شرط</span>
          </div>
        </>
      ) : (
        <>
          <Handle type="target" position={Position.Top} />
          <Handle type="source" position={Position.Bottom} />
        </>
      )}
      <div className="node-header">{label}</div>
      {Object.keys(params).length > 0 && (
        <div className="node-params">
          {Object.entries(params).slice(0, 2).map(([key, value]) => (
            <div key={key} className="param-item">
              {key}: {String(value)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Define nodeTypes outside component to avoid React Flow warning
const nodeTypes = {
  indicator: IndicatorNode,
  condition: ConditionNode,
  math: MathNode,
  logic: LogicNode,
  risk: RiskNode,
  output: OutputNode,
  value_when: ValueWhenNode,
}

function StrategyBuilder({ strategy, onBack }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const nodeTypesMemo = useMemo(() => nodeTypes, [])
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedEdge, setSelectedEdge] = useState(null)
  const [indicators, setIndicators] = useState([])
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('node')
  const [strategyName, setStrategyName] = useState(strategy?.name || '')
  const [strategyDescription, setStrategyDescription] = useState(strategy?.description || '')
  const [strategyConfig, setStrategyConfig] = useState(strategy?.config || {})
  const [isPublic, setIsPublic] = useState(strategy?.is_public || false)
  const [saving, setSaving] = useState(false)
  const [marketPurchase, setMarketPurchase] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [contextMenu, setContextMenu] = useState(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState(null)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [importFileData, setImportFileData] = useState(null)
  const reactFlowInstanceRef = useRef(null)
  const fileInputRef = useRef(null)
  const strategyNameInputRef = useRef(null)
  
  // Track initial state for unsaved changes detection
  const initialStateRef = useRef(null)
  
  // History management
  const history = useHistory({ nodes: [], edges: [] })
  const isHistoryUpdate = useRef(false)
  const lastStateRef = useRef({ nodes: [], edges: [] })
  const handleUndoRef = useRef(null)
  
  // Toast and Confirm hooks
  const toast = useToast()
  const confirm = useConfirm()
  const handleRedoRef = useRef(null)

  // Define undo/redo handlers first
  const handleUndo = useCallback(() => {
    if (!history.canUndo) return
    
    const previousState = history.undo()
    if (previousState) {
      isHistoryUpdate.current = true
      const stateToRestore = previousState.nodes ? previousState : history.currentState
      setNodes(stateToRestore.nodes || [])
      setEdges(stateToRestore.edges || [])
      lastStateRef.current = { 
        nodes: [...(stateToRestore.nodes || [])], 
        edges: [...(stateToRestore.edges || [])] 
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.canUndo, setNodes, setEdges])

  const handleRedo = useCallback(() => {
    if (!history.canRedo) return
    
    const nextState = history.redo()
    if (nextState) {
      isHistoryUpdate.current = true
      const stateToRestore = nextState.nodes ? nextState : history.currentState
      setNodes(stateToRestore.nodes || [])
      setEdges(stateToRestore.edges || [])
      lastStateRef.current = { 
        nodes: [...(stateToRestore.nodes || [])], 
        edges: [...(stateToRestore.edges || [])] 
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.canRedo, setNodes, setEdges])

  // Update refs
  handleUndoRef.current = handleUndo
  handleRedoRef.current = handleRedo

  // Save state to history when nodes or edges change
  useEffect(() => {
    if (isHistoryUpdate.current) {
      isHistoryUpdate.current = false
      return
    }

    const currentState = { nodes: [...nodes], edges: [...edges] }
    const lastState = lastStateRef.current

    // Only save if there's an actual change
    if (
      JSON.stringify(currentState.nodes) !== JSON.stringify(lastState.nodes) ||
      JSON.stringify(currentState.edges) !== JSON.stringify(lastState.edges)
    ) {
      history.push(currentState)
      lastStateRef.current = currentState
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check if we're in an input field
      const isInput = event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA'
      
      if ((event.ctrlKey || event.metaKey) && !isInput) {
        if (event.key === 'z' || event.key === 'Z') {
          event.preventDefault()
          if (event.shiftKey) {
            // Ctrl+Shift+Z or Cmd+Shift+Z for Redo
            handleRedoRef.current?.()
          } else {
            // Ctrl+Z or Cmd+Z for Undo
            handleUndoRef.current?.()
          }
        } else if (event.key === 'y' || event.key === 'Y') {
          event.preventDefault()
          // Ctrl+Y or Cmd+Y for Redo
          handleRedoRef.current?.()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    const initialize = async () => {
      await loadIndicators()
      if (strategy) {
        await loadStrategy(strategy)
      } else {
        // Initialize history with empty state
        history.push({ nodes: [], edges: [] })
        lastStateRef.current = { nodes: [], edges: [] }
        // Save initial state for new strategy
        saveInitialState([], [], '', '', {}, false)
      }
    }
    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategy])

  // Load marketplace purchase info for this strategy (to show update banner)
  useEffect(() => {
    const loadPurchase = async () => {
      if (!strategy?.id) return
      try {
        const res = await axios.get(`${MARKET_API}/purchases/me`)
        const purchases = res.data || []
        const found = purchases.find((p) => p.strategy_id === strategy.id)
        if (found) {
          setMarketPurchase(found)
        }
      } catch (err) {
        // silent fail؛ بخش مارکت نباید سازنده را بشکند
      }
    }
    loadPurchase()
  }, [strategy?.id])

  const loadIndicators = async () => {
    try {
      const response = await axios.get(`${API_BASE}/indicators`)
      setIndicators(response.data)
      return response.data
    } catch (err) {
      console.error('Error loading indicators:', err)
      return []
    }
  }

  const loadStrategy = async (strategyData) => {
    if (strategyData.strategy_graph) {
      const graph = strategyData.strategy_graph
      if (graph.nodes && graph.edges) {
        // Load indicators first to get full indicator data
        let indicatorsData = indicators
        if (indicators.length === 0) {
          indicatorsData = await loadIndicators()
        }
        
        const flowNodes = graph.nodes.map((node, index) => {
          // Find the indicator definition
          const indicatorDef = indicatorsData.find(ind => ind.type === node.type)
          
          // Determine node type for react-flow
          const nodeType = getNodeType(node.type)
          
          // Get params from saved node or use defaults
          const savedParams = node.data?.params || {}
          const defaultParams = indicatorDef ? getDefaultParams(indicatorDef) : {}
          const params = { ...defaultParams, ...savedParams }
          
          // Get label - prefer saved label from JSON, then indicator name, then type
          let label = node.data?.label || indicatorDef?.name || node.type || 'Unknown'
          // For Pine Script, extract from code if available (but prefer saved label if exists)
          if (node.type === 'pinescript' && params.code && !node.data?.label) {
            const title = extractPineScriptTitle(params.code)
            if (title) {
              label = title
            }
          }
          
          return {
            id: node.id,
            type: nodeType,
            position: node.position || { x: (index % 4) * 200 + 100, y: Math.floor(index / 4) * 150 + 100 },
            data: {
              label: label,
              indicatorType: node.type,
              params: params,
              indicator: indicatorDef,
            },
          }
        })
        
        const flowEdges = graph.edges.map(edge => ({
          ...edge,
          id: `edge-${edge.source}-${edge.target}${edge.targetHandle ? `-${edge.targetHandle}` : ''}`,
          sourceHandle: edge.sourceHandle || null,
          targetHandle: edge.targetHandle || null,
          markerEnd: { type: MarkerType.ArrowClosed },
          deletable: true,
          focusable: true,
        }))
        
        isHistoryUpdate.current = true
        setNodes(flowNodes)
        setEdges(flowEdges)
        lastStateRef.current = { nodes: [...flowNodes], edges: [...flowEdges] }
        
        // Initialize history with loaded state
        history.push({ nodes: flowNodes, edges: flowEdges })
        
        // Save initial state for unsaved changes detection
        saveInitialState(flowNodes, flowEdges, strategyData.name || '', strategyData.description || '', strategyData.config || {}, strategyData.is_public || false)
      }
    } else {
      // New strategy - initialize with empty state
      saveInitialState([], [], '', '', {}, false)
    }
  }
  
  // Save initial state for comparison
  const saveInitialState = (nodes, edges, name, description, config, isPublic = false) => {
    initialStateRef.current = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      name: name,
      description: description,
      config: JSON.parse(JSON.stringify(config)),
      isPublic: isPublic,
    }
  }
  
  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (!initialStateRef.current) return false
    
    const current = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      name: strategyName,
      description: strategyDescription,
      config: JSON.parse(JSON.stringify(strategyConfig)),
      isPublic: isPublic,
    }
    
    const initial = initialStateRef.current
    
    return (
      JSON.stringify(current.nodes) !== JSON.stringify(initial.nodes) ||
      JSON.stringify(current.edges) !== JSON.stringify(initial.edges) ||
      current.name !== initial.name ||
      current.description !== initial.description ||
      JSON.stringify(current.config) !== JSON.stringify(initial.config) ||
      current.isPublic !== initial.isPublic
    )
  }, [nodes, edges, strategyName, strategyDescription, strategyConfig, isPublic])
  
  // Handle navigation with unsaved changes check
  const handleBackClick = () => {
    if (hasUnsavedChanges()) {
      setPendingNavigation(() => onBack)
      setShowExitConfirm(true)
    } else {
      onBack()
    }
  }
  
  // Handle exit confirmation
  const handleExitConfirm = async (shouldSave) => {
    if (shouldSave) {
      // Save and then exit
      const success = await handleSave()
      if (success) {
        // Only exit if save was successful
        setShowExitConfirm(false)
        if (pendingNavigation) {
          // For new strategies, onBack is already called in handleSave
          // For existing strategies, we need to call it here
          if (strategy?.id && pendingNavigation) {
            pendingNavigation()
          }
          setPendingNavigation(null)
        }
      }
      // If save failed, dialog stays open so user can try again or exit without saving
    } else {
      // Exit without saving
      setShowExitConfirm(false)
      if (pendingNavigation) {
        pendingNavigation()
        setPendingNavigation(null)
      }
    }
  }
  
  // Handle browser navigation (close tab, etc.)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges()) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])


  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        id: `edge-${params.source}-${params.target}${params.targetHandle ? `-${params.targetHandle}` : ''}`,
        markerEnd: { type: MarkerType.ArrowClosed },
        deletable: true,
        focusable: true,
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges]
  )

  const onNodeClick = useCallback((event, node) => {
    // Close context menu if clicking on a node
    setContextMenu(null)
    setSelectedNode(node)
    setSelectedEdge(null)
    setRightSidebarOpen(true) // باز کردن سایدبار هنگام کلیک روی ماژول
    setActiveTab('node') // Switch to node settings tab
  }, [])

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node: node,
    })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdge(edge)
    setSelectedNode(null)
    setRightSidebarOpen(true) // باز کردن سایدبار هنگام کلیک روی اتصال
    setActiveTab('node') // Switch to node settings tab for edge info
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setSelectedEdge(null)
    setContextMenu(null)
    // Default to settings tab when no node is selected
    setActiveTab('settings')
  }, [])

  const deleteEdge = useCallback((edgeId) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId))
    if (selectedEdge?.id === edgeId) {
      setSelectedEdge(null)
    }
  }, [selectedEdge])

  const addNode = (indicator, position = null) => {
    // Calculate center of visible viewport
    let nodePosition
    if (position) {
      // Use provided position (from drag and drop)
      nodePosition = position
    } else {
      // Calculate center of current viewport
      const instance = reactFlowInstanceRef.current
      if (instance) {
        const flowElement = document.querySelector('.react-flow')
        if (flowElement) {
          const rect = flowElement.getBoundingClientRect()
          const centerX = rect.width / 2
          const centerY = rect.height / 2
          
          // Convert screen coordinates to flow coordinates
          const flowPosition = instance.screenToFlowPosition({
            x: centerX,
            y: centerY,
          })
          nodePosition = flowPosition
        } else {
          // Fallback to viewport center calculation
          const centerX = (window.innerWidth - 700) / 2 // Account for sidebars
          const centerY = window.innerHeight / 2
          nodePosition = instance.screenToFlowPosition({
            x: centerX,
            y: centerY,
          })
        }
      } else {
        // Fallback if instance not available
        nodePosition = { x: 400, y: 300 }
      }
    }
    
    // For Pine Script nodes, try to extract title from default code
    let label = indicator.name
    if (indicator.type === 'pinescript') {
      const defaultCode = indicator.params?.code?.default || ''
      const title = extractPineScriptTitle(defaultCode)
      if (title) {
        label = title
      }
    }
    
    const newNode = {
      id: `node-${Date.now()}-${Math.random()}`,
      type: getNodeType(indicator.type),
      position: nodePosition,
      data: {
        label: label,
        indicatorType: indicator.type,
        params: getDefaultParams(indicator),
        indicator: indicator,
      },
      draggable: true,
    }
    setNodes((nds) => [...nds, newNode])
  }

  const getNodeType = (type) => {
    const indicatorTypes = [
      'rsi', 'rsi_ma', 'ema', 'golden_cross', 'sma', 'swing_high', 'swing_low', 'price_source', 'constant',
      'macd', 'stochastic', 'cci', 'williams_r', 'adx',
      'bollinger_bands', 'bollinger_bands_upper', 'bollinger_bands_lower', 'atr',
      'volume_sma', 'obv',
      'higher_high', 'lower_low', 'pivot_low', 'pivot_high',
      'pinescript'
    ]
    const conditionTypes = [
      'greater_than', 'less_than', 'greater_equal', 'less_equal',
      'equals', 'not_equals', 'between',
      'cross_above', 'cross_below'
    ]
    const mathTypes = ['add', 'subtract', 'multiply', 'divide', 'max', 'min', 'abs', 'percent_change']
    const logicTypes = ['and', 'or', 'not']
    const riskTypes = ['stop_loss_calculator', 'take_profit_calculator', 'trailing_stop', 'risk_free_condition']
    
    // value_when needs special handling with 2 inputs
    if (type === 'value_when') {
      return 'value_when'
    }
    
    if (mathTypes.includes(type)) {
      return 'math'
    }
    if (indicatorTypes.includes(type)) {
      return 'indicator'
    }
    if (conditionTypes.includes(type)) {
      return 'condition'
    }
    if (logicTypes.includes(type)) {
      return 'logic'
    }
    if (riskTypes.includes(type)) {
      return 'risk'
    }
    if (type === 'signal_output') {
      return 'output'
    }
    return 'indicator'
  }

  const getDefaultParams = (indicator) => {
    const params = {}
    if (indicator.params) {
      Object.keys(indicator.params).forEach(key => {
        const paramDef = indicator.params[key]
        if (paramDef.default !== undefined) {
          params[key] = paramDef.default
        }
      })
    }
    return params
  }

  const updateNodeParams = (nodeId, params) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id !== nodeId) return node
        
        const updatedParams = { ...node.data.params, ...params }
        let updatedLabel = node.data.label
        
        // For Pine Script nodes, update label from code title
        if (node.data.indicatorType === 'pinescript' && params.code !== undefined) {
          const title = extractPineScriptTitle(params.code)
          if (title) {
            updatedLabel = title
          } else if (!params.code) {
            // If code is empty, use default name
            updatedLabel = node.data.indicator?.name || 'Pine Script'
          }
        }
        
        return {
          ...node,
          data: {
            ...node.data,
            params: updatedParams,
            label: updatedLabel
          }
        }
      })
    )
  }

  const deleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId))
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null)
    }
    setContextMenu(null)
  }

  const handleContextMenuAction = useCallback((action) => {
    if (!contextMenu?.node) return
    
    const node = contextMenu.node
    switch (action) {
      case 'delete':
        deleteNode(node.id)
        break
      case 'settings':
        setSelectedNode(node)
        setSelectedEdge(null)
        setRightSidebarOpen(true)
        setContextMenu(null)
        break
      case 'duplicate':
        const newNode = {
          ...node,
          id: `node-${Date.now()}-${Math.random()}`,
          position: {
            x: node.position.x + 50,
            y: node.position.y + 50,
          },
        }
        setNodes((nds) => [...nds, newNode])
        setContextMenu(null)
        break
      default:
        break
    }
  }, [contextMenu, deleteNode, setNodes])

  const handleSave = async () => {
    if (!strategyName.trim()) {
      toast.warning('لطفا نام استراتژی را وارد کنید')
      // Focus on strategy name field and switch to settings tab
      setActiveTab('settings')
      setRightSidebarOpen(true)
      setTimeout(() => {
        strategyNameInputRef.current?.focus()
      }, 100)
      return false
    }

    // Check for output node
    const hasOutput = nodes.some(node => node.type === 'output')
    if (!hasOutput) {
      toast.warning('لطفا یک گره خروجی (Signal Output) به استراتژی اضافه کنید')
      // Focus on settings tab to show the requirement
      setActiveTab('settings')
      setRightSidebarOpen(true)
      return false
    }

    setSaving(true)
    try {
      const strategyGraph = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.data.indicatorType || node.type,
          data: {
            params: node.data.params || {},
            label: node.data.label || '',
          },
          position: node.position,
        })),
        edges: edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle || null,
          targetHandle: edge.targetHandle || null,
        })),
      }

      const payload = {
        name: strategyName,
        description: strategyDescription,
        strategy_graph: strategyGraph,
        config: strategyConfig,
        is_public: isPublic,
      }

      if (strategy?.id) {
        await axios.put(`${API_BASE}/${strategy.id}`, payload)
        toast.success('استراتژی با موفقیت بروزرسانی شد')
        // Update initial state after successful save
        saveInitialState(nodes, edges, strategyName, strategyDescription, strategyConfig, isPublic)
        return true
      } else {
        await axios.post(API_BASE, payload)
        toast.success('استراتژی با موفقیت ذخیره شد')
        // Update initial state after successful save
        saveInitialState(nodes, edges, strategyName, strategyDescription, strategyConfig, isPublic)
        // For new strategies, onBack is called after save
        return true
      }
    } catch (err) {
      toast.error('خطا در ذخیره استراتژی: ' + (err.response?.data?.detail || err.message))
      console.error(err)
      return false
    } finally {
      setSaving(false)
    }
  }

  // Export strategy to JSON file
  const handleExport = () => {
    try {
      const strategyGraph = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.data.indicatorType || node.type,
          data: {
            params: node.data.params || {},
            label: node.data.label || '',
          },
          position: node.position,
        })),
        edges: edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle || null,
          targetHandle: edge.targetHandle || null,
        })),
      }

      const exportData = {
        name: strategyName || 'Untitled Strategy',
        description: strategyDescription || '',
        strategy_graph: strategyGraph,
        config: strategyConfig || {},
      }

      const jsonString = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      // Sanitize filename: remove special characters and replace spaces with underscores
      const sanitizedName = (strategyName || 'strategy')
        .replace(/[^a-zA-Z0-9\u0600-\u06FF\s_-]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50) // Limit length
      link.download = `${sanitizedName}_${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('استراتژی با موفقیت به فایل JSON ذخیره شد')
    } catch (err) {
      toast.error('خطا در ذخیره فایل JSON: ' + err.message)
      console.error(err)
    }
  }

  // Handle file input change for import
  const handleFileInputChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.name.endsWith('.json')) {
      toast.error('لطفا یک فایل JSON انتخاب کنید')
      event.target.value = '' // Reset input
      return
    }

    try {
      const text = await file.text()
      const jsonData = JSON.parse(text)

      // Validate JSON structure
      if (!jsonData.strategy_graph || !jsonData.strategy_graph.nodes || !Array.isArray(jsonData.strategy_graph.nodes)) {
        toast.error('فرمت فایل JSON نامعتبر است. فایل باید شامل strategy_graph با nodes باشد.')
        event.target.value = '' // Reset input
        return
      }

      // Check if there are unsaved changes
      if (hasUnsavedChanges()) {
        setImportFileData(jsonData)
        setShowImportConfirm(true)
      } else {
        await importStrategyFromJSON(jsonData)
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        toast.error('فایل JSON نامعتبر است. لطفا فایل را بررسی کنید.')
      } else {
        toast.error('خطا در خواندن فایل: ' + err.message)
      }
      console.error(err)
    } finally {
      // Reset input
      event.target.value = ''
    }
  }

  // Import strategy from JSON data
  const importStrategyFromJSON = async (jsonData) => {
    try {
      // Load indicators first
      let indicatorsData = indicators
      if (indicators.length === 0) {
        indicatorsData = await loadIndicators()
      }

      // Validate and convert nodes
      if (!jsonData.strategy_graph?.nodes || !Array.isArray(jsonData.strategy_graph.nodes)) {
        throw new Error('فرمت strategy_graph.nodes نامعتبر است')
      }

      const graph = jsonData.strategy_graph
      const flowNodes = graph.nodes.map((node, index) => {
        // Find the indicator definition
        const indicatorDef = indicatorsData.find(ind => ind.type === node.type)
        
        // Determine node type for react-flow
        const nodeType = getNodeType(node.type)
        
        // Get params from saved node or use defaults
        const savedParams = node.data?.params || {}
        const defaultParams = indicatorDef ? getDefaultParams(indicatorDef) : {}
        const params = { ...defaultParams, ...savedParams }
        
        // Get label - prefer saved label from JSON, then indicator name, then type
        let label = node.data?.label || indicatorDef?.name || node.type || 'Unknown'
        
        // For Pine Script, extract from code if available (but prefer saved label if exists)
        if (node.type === 'pinescript' && params.code && !node.data?.label) {
          const title = extractPineScriptTitle(params.code)
          if (title) {
            label = title
          }
        }
        
        return {
          id: node.id || `node-${Date.now()}-${index}`,
          type: nodeType,
          position: node.position || { x: (index % 4) * 200 + 100, y: Math.floor(index / 4) * 150 + 100 },
          data: {
            label: label,
            indicatorType: node.type,
            params: params,
            indicator: indicatorDef,
          },
        }
      })

      // Validate and convert edges
      const flowEdges = (graph.edges || []).map((edge, index) => {
        // Validate edge references
        const sourceExists = flowNodes.some(n => n.id === edge.source)
        const targetExists = flowNodes.some(n => n.id === edge.target)
        
        if (!sourceExists || !targetExists) {
          console.warn(`Edge ${index} references non-existent node:`, edge)
        }

        return {
          ...edge,
          id: edge.id || `edge-${edge.source}-${edge.target}${edge.targetHandle ? `-${edge.targetHandle}` : ''}`,
          sourceHandle: edge.sourceHandle || null,
          targetHandle: edge.targetHandle || null,
          markerEnd: { type: MarkerType.ArrowClosed },
          deletable: true,
          focusable: true,
        }
      }).filter(edge => {
        // Filter out edges with invalid references
        const sourceExists = flowNodes.some(n => n.id === edge.source)
        const targetExists = flowNodes.some(n => n.id === edge.target)
        return sourceExists && targetExists
      })

      // Update state
      isHistoryUpdate.current = true
      setNodes(flowNodes)
      setEdges(flowEdges)
      lastStateRef.current = { nodes: [...flowNodes], edges: [...flowEdges] }

      // Update name and description if provided
      if (jsonData.name) {
        setStrategyName(jsonData.name)
      }
      if (jsonData.description !== undefined) {
        setStrategyDescription(jsonData.description)
      }
      if (jsonData.config) {
        setStrategyConfig(jsonData.config)
      }

      // Initialize history with loaded state
      history.push({ nodes: flowNodes, edges: flowEdges })

      // Save initial state for unsaved changes detection
      saveInitialState(
        flowNodes,
        flowEdges,
        jsonData.name || strategyName || '',
        jsonData.description || strategyDescription || '',
        jsonData.config || strategyConfig || {},
        jsonData.is_public || false
      )

      toast.success('استراتژی با موفقیت از فایل JSON بارگذاری شد')
    } catch (err) {
      toast.error('خطا در بارگذاری استراتژی: ' + err.message)
      console.error(err)
      throw err
    }
  }

  // Handle import confirmation
  const handleImportConfirm = async (confirmed) => {
    setShowImportConfirm(false)
    if (confirmed && importFileData) {
      try {
        await importStrategyFromJSON(importFileData)
        setImportFileData(null)
      } catch (err) {
        // Error already shown in importStrategyFromJSON
      }
    } else {
      setImportFileData(null)
    }
  }

  // Trigger file input click
  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        setContextMenu(null)
      }
    }
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [contextMenu])

  return (
    <div className="strategy-builder" onClick={closeContextMenu}>
      {showExitConfirm && (
        <div className="exit-confirm-overlay" onClick={() => setShowExitConfirm(false)}>
          <div className="exit-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>تغییرات ذخیره نشده</h3>
            <p>شما تغییراتی دارید که ذخیره نشده‌اند. آیا می‌خواهید قبل از خروج آن‌ها را ذخیره کنید؟</p>
            <div className="exit-confirm-buttons">
              <button 
                onClick={() => handleExitConfirm(true)} 
                className="btn-save-confirm"
                disabled={saving}
              >
                {saving ? 'در حال ذخیره...' : 'ذخیره و خروج'}
              </button>
              <button 
                onClick={() => handleExitConfirm(false)} 
                className="btn-exit-without-save"
              >
                خروج بدون ذخیره
              </button>
              <button 
                onClick={() => {
                  setShowExitConfirm(false)
                  setPendingNavigation(null)
                }} 
                className="btn-cancel-exit"
              >
                لغو
              </button>
            </div>
          </div>
        </div>
      )}
      {showImportConfirm && (
        <div className="exit-confirm-overlay" onClick={() => handleImportConfirm(false)}>
          <div className="exit-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>تایید Import استراتژی</h3>
            <p>شما تغییراتی دارید که ذخیره نشده‌اند. با Import کردن فایل JSON، تمام تغییرات فعلی شما از بین خواهد رفت و با محتوای فایل جایگزین می‌شود. آیا مطمئن هستید؟</p>
            <div className="exit-confirm-buttons">
              <button 
                onClick={() => handleImportConfirm(true)} 
                className="btn-save-confirm"
              >
                بله، Import کن
              </button>
              <button 
                onClick={() => handleImportConfirm(false)} 
                className="btn-exit-without-save"
              >
                لغو
              </button>
            </div>
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
      <div className="builder-content">
        <div className="builder-sidebar builder-sidebar-left">
          <div className="builder-sidebar-controls">
            <div className="sidebar-control-row">
              <button onClick={handleBackClick} className="btn-back">بازگشت</button>

              <button onClick={handleSave} className="btn-save" disabled={saving}>
                {saving ? 'در حال ذخیره...' : 'ذخیره'}
              </button>

              <button
                onClick={handleUndo}
                disabled={!history.canUndo}
                className="btn-undo"
                title="Undo (Ctrl+Z)"
              >
                ↶
              </button>
              <button
                onClick={handleRedo}
                disabled={!history.canRedo}
                className="btn-redo"
                title="Redo (Ctrl+Y)"
              >
                ↷
              </button>

            </div>
            {/* <div className="sidebar-control-row">
              <button onClick={handleImportClick} className="btn-import" title="Import استراتژی از فایل JSON">
                📥 Import JSON
              </button>
              <button onClick={handleExport} className="btn-export" title="Export استراتژی به فایل JSON">
                📤 Export JSON
              </button>
            </div> */}
            {marketPurchase && (
              <div className="market-update-banner">
                <p>
                  این استراتژی نسخه خریداری‌شده از بازار استراتژی است.
                  {marketPurchase.has_update && ' نسخه جدیدی توسط سازنده منتشر شده است.'}
                </p>
                {marketPurchase.has_update && (
                  <button
                    className="btn-secondary"
                    disabled={syncing}
                    onClick={async () => {
                      const confirmed = await confirm(
                        'با دریافت آخرین آپدیت، منطق اصلی استراتژی شما با نسخه جدید جایگزین می‌شود. آیا مطمئن هستید؟',
                        {
                          title: 'تایید دریافت آپدیت',
                          type: 'warning'
                        }
                      )
                      if (!confirmed) {
                        return
                      }
                      try {
                        setSyncing(true)
                        const res = await axios.post(
                          `${MARKET_API}/purchases/${marketPurchase.id}/sync-latest`
                        )
                        setMarketPurchase(res.data)
                        toast.success('آخرین نسخه استراتژی با موفقیت دریافت شد.')
                      } catch (err) {
                        toast.error(
                          err?.response?.data?.detail ||
                            'خطا در دریافت آخرین نسخه استراتژی خریداری‌شده'
                        )
                      } finally {
                        setSyncing(false)
                      }
                    }}
                  >
                    {syncing ? 'در حال همگام‌سازی...' : 'دریافت آخرین آپدیت'}
                  </button>
                )}
              </div>
            )}

            <div className="sidebar-control-actions">
              <div className="undo-redo-buttons">
                {/* <button
                  onClick={handleUndo}
                  disabled={!history.canUndo}
                  className="btn-undo"
                  title="Undo (Ctrl+Z)"
                >
                  ↶ Undo
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!history.canRedo}
                  className="btn-redo"
                  title="Redo (Ctrl+Y)"
                >
                  ↷ Redo
                </button> */}
              </div>
            </div>
          </div>
          <div className="builder-sidebar-scroll">
            <IndicatorPalette indicators={indicators} onAddNode={addNode} />
          </div>
        </div>

        <div className="builder-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance
            }}
            onDrop={(event) => {
              event.preventDefault()
              const indicatorData = event.dataTransfer.getData('application/reactflow')
              if (indicatorData) {
                try {
                  const indicator = JSON.parse(indicatorData)
                  const position = reactFlowInstanceRef.current?.screenToFlowPosition({
                    x: event.clientX,
                    y: event.clientY,
                  }) || { x: 400, y: 300 }
                  addNode(indicator, position)
                } catch (e) {
                  console.error('Error parsing dropped indicator:', e)
                }
              }
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'copy'
            }}
            nodeTypes={nodeTypesMemo}
            edgesUpdatable={true}
            edgesFocusable={true}
            deleteKeyCode="Delete"
            fitView
            nodesDraggable={true}
            nodesConnectable={true}
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
          
          {contextMenu && (
            <div
              className="context-menu"
              style={{
                position: 'fixed',
                top: contextMenu.y,
                left: contextMenu.x,
                zIndex: 1000,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="context-menu-item" onClick={() => handleContextMenuAction('settings')}>
                ⚙️ تنظیمات
              </div>
              <div className="context-menu-item" onClick={() => handleContextMenuAction('duplicate')}>
                📋 کپی
              </div>
              <div className="context-menu-item context-menu-item-danger" onClick={() => handleContextMenuAction('delete')}>
                🗑️ حذف
              </div>
            </div>
          )}
        </div>

        <div className={`builder-sidebar builder-sidebar-right ${rightSidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <h3>تنظیمات</h3>
            <button 
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className="btn-toggle-sidebar"
              title={rightSidebarOpen ? 'بستن' : 'باز کردن'}
            >
              {rightSidebarOpen ? '◄' : '►'}
            </button>
          </div>
          
          {rightSidebarOpen && (
            <div className="sidebar-content" onClick={closeContextMenu}>
              {/* Tab Headers */}
              <div className="sidebar-tabs">
                <button 
                  className={`tab-button ${activeTab === 'node' ? 'active' : ''}`}
                  onClick={() => setActiveTab('node')}
                >
                  تنظیمات گره
                </button>
                <button 
                  className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('settings')}
                >
                  تنظیمات کلی
                </button>
              </div>

              {/* Tab Content */}
              <div className="tab-content">
                {activeTab === 'node' && (
                  <>
                    {selectedNode && (
                      <NodePanel
                        node={selectedNode}
                        onUpdateParams={(params) => updateNodeParams(selectedNode.id, params)}
                        onDelete={() => deleteNode(selectedNode.id)}
                      />
                    )}
                    {selectedEdge && (
                      <div className="edge-panel">
                        <div className="panel-header">
                          <h4>اتصال</h4>
                          <button onClick={() => deleteEdge(selectedEdge.id)} className="btn-delete-edge">
                            حذف اتصال
                          </button>
                        </div>
                        <div className="edge-info">
                          <div className="info-item">
                            <span className="info-label">از:</span>
                            <span className="info-value">
                              {nodes.find(n => n.id === selectedEdge.source)?.data?.label || selectedEdge.source}
                            </span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">به:</span>
                            <span className="info-value">
                              {nodes.find(n => n.id === selectedEdge.target)?.data?.label || selectedEdge.target}
                            </span>
                          </div>
                          {selectedEdge.targetHandle && (
                            <div className="info-item">
                              <span className="info-label">ورودی:</span>
                              <span className="info-value">{selectedEdge.targetHandle}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {!selectedNode && !selectedEdge && (
                      <div className="no-selection">
                        <p>برای تنظیمات گره، یک گره یا اتصال را انتخاب کنید</p>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'settings' && (
                  <StrategySettings
                    strategyName={strategyName}
                    strategyDescription={strategyDescription}
                    strategyConfig={strategyConfig}
                    isPublic={isPublic}
                    onStrategyNameChange={setStrategyName}
                    onStrategyDescriptionChange={setStrategyDescription}
                    onUpdateConfig={setStrategyConfig}
                    onIsPublicChange={setIsPublic}
                    onImportClick={handleImportClick}
                    onExportClick={handleExport}
                    fileInputRef={fileInputRef}
                    strategyNameInputRef={strategyNameInputRef}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StrategyBuilder

