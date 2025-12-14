# 🚀 راه‌اندازی سریع WeWork Framework

این راهنما شما را در **5 دقیقه** راه‌اندازی می‌کند.

## ⚡ روش سریع (با Docker)

```bash
# 1. کلون کردن پروژه
git clone https://github.com/yourusername/wework-framework.git
cd wework-framework

# 2. ایجاد فایل .env
cp .env.example .env
# فایل .env را ویرایش کنید (حداقل Database و JWT را تنظیم کنید)

# 3. راه‌اندازی همه سرویس‌ها
docker-compose up -d

# 4. ایجاد جداول دیتابیس
docker-compose exec api python -m src.db.create_tables

# 5. ایجاد کاربر ادمین (اختیاری)
docker-compose exec api python -c "
from src.db.base import AsyncSessionLocal
from src.db.models import User
from src.api.auth_api import get_password_hash
import asyncio

async def create_admin():
    async with AsyncSessionLocal() as session:
        admin = User(
            email='admin@example.com',
            hashed_password=get_password_hash('admin123'),
            role='super_admin',
            is_active=True
        )
        session.add(admin)
        await session.commit()
        print('✅ Admin created: admin@example.com / admin123')

asyncio.run(create_admin())
"
```

✅ **تمام!** حالا می‌توانید به آدرس‌های زیر دسترسی داشته باشید:
- **Backend API**: http://localhost:8000/docs
- **Frontend**: http://localhost:5173

## 📝 روش دستی (بدون Docker)

### 1. نصب وابستگی‌ها

```bash
# Python
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Node.js
cd frontend
npm install
cd ..
```

### 2. راه‌اندازی PostgreSQL و Redis

PostgreSQL و Redis باید نصب و در حال اجرا باشند.

### 3. تنظیمات

```bash
# ایجاد فایل .env
cp .env.example .env
# فایل .env را ویرایش کنید
```

حداقل این مقادیر را تنظیم کنید:
```env
POSTGRES_HOST=localhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=wework
JWT_SECRET_KEY=your-secret-key
REDIS_URL=redis://localhost:6379/0
```

### 4. راه‌اندازی

```bash
# Terminal 1: بک‌اند
python -m src.db.create_tables
uvicorn src.api.app:app --reload --port 8000

# Terminal 2: فرانت‌اند
cd frontend
npm run dev
```

## 🎯 ساخت اولین API

```bash
# 1. ساخت API
wework make:api products

# 2. ساخت Model
wework make:model Product

# 3. اضافه کردن API به app.py
# فایل src/api/app.py را باز کنید و اضافه کنید:
# from src.api.products_api import router as products_router
# app.include_router(products_router)

# 4. ساخت Migration
wework make:migration add_products_table

# 5. اجرای Migration
python -m src.db.migrate_add_products_table
```

حالا به http://localhost:8000/docs بروید و API جدید را ببینید!

## 📚 مراحل بعدی

- [راهنمای کامل نصب](docs/01-getting-started/installation.md)
- [راهنمای سریع](docs/01-getting-started/quickstart.md)
- [CLI Commands](docs/CLI.md)

---

**مشکل دارید؟** به بخش [عیب‌یابی](docs/01-getting-started/installation.md#-عیب-یابی) مراجعه کنید.

