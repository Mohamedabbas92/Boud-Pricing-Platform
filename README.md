# BOUD AI Platform — Local Setup

## متطلبات
- **Node.js** — حمّله من [nodejs.org](https://nodejs.org) (اختر LTS)
- **Terminal** (Command Prompt أو PowerShell على Windows)

---

## تشغيل المشروع

### الخطوة 1 — افتح الـ Terminal في مجلد المشروع
```
على Mac: انقر بالزر الأيمن على المجلد → New Terminal at Folder
على Windows: ادخل المجلد → اكتب cmd في شريط العنوان → Enter
```

### الخطوة 2 — تثبيت المكتبات (مرة واحدة فقط)
```bash
npm install
```

### الخطوة 3 — تشغيل المشروع
```bash
npm run dev
```

### الخطوة 4 — افتح المتصفح
```
http://localhost:3000
```

---

## ملاحظات
- البيانات محفوظة في الـ localStorage (المتصفح)
- الـ API Key لـ Claude يحتاج مرة واحدة فقط
- لإيقاف السيرفر: اضغط **Ctrl+C** في الـ Terminal
