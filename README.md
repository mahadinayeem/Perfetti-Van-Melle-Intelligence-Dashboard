# Perfetti Van Melle - Intelligence Dashboard

Enterprise Sales Force Automation (SFA) & Modern Trade (MT) Visit Status Intelligence Portal for **Perfetti Van Melle Bangladesh**, powered by **Sokrio SFA**.

## ✨ Features
- **Live Sokrio SFA API Integration**: Direct live synchronization with `https://pvm.core.sokrio.com/api/v1/checkin-report`.
- **Zero-Config Vercel Deployment**: Embedded self-healing credentials and token auto-refresh (no manual environment variable setup required on Vercel).
- **Infinite Self-Healing Auth**: Automatic Bearer token rotation every 4 hours and instant re-authentication on 401/403 errors so tokens never expire.
- **Excel (.xlsx) & CSV Export**: One-click download of all records matching the exact 14 columns of the official MT Visit Status sheet.
- **Excel-Style Header Filtering**: Dropdown filters on all 14 columns with Sort A-Z, Sort Z-A, and checkbox multi-selection.
- **Quick Date Presets**: Today, WTD (Saturday–Today sales week), and MTD presets with in-memory caching for lightning-fast responses (<50ms).
- **World-Class Branding**: Authentic Perfetti Van Melle and Sokrio Technologies Ltd. co-branded UI.

## 🚀 One-Click Vercel Deployment
Deploy directly to Vercel without configuring any environment variables!

```bash
# Local development
npm install
npm run dev

# Production build
npm run build
```

## 🔐 Credentials
- **Email**: `super@pvm.com`
- **Password**: `Pvm@2026@`
