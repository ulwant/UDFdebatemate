# Debate Mate 🎯

**Debate Mate** adalah platform all-in-one untuk mengelola tim debat. Dirancang khusus untuk alur kerja UDF (Union Debating Federation), aplikasi ini membantu koordinasi training, kehadiran, pencapaian anggota, timer bersama, dan transkrip berbantuan AI.

## 🌟 Fitur Utama

### 📊 Dashboard
- Manajemen training mingguan
- Metrik attendance rate tim
- Monitoring anggota aktif
- Informasi training berikutnya
- Command center untuk koordinasi

### 📋 Presensi (Attendance)
- Tracking kehadiran training dengan QR code
- Scan attendance untuk member presensi
- Dashboard statistik attendance real-time
- History kehadiran anggota per member
- RBAC (Role-Based Access Control)

### 📅 Kalender
- Jadwal training dan event debat
- Manajemen event lengkap
- Integrasi dengan database Supabase
- Penjadwalan kolaboratif tim

### ⏱️ Timer
- Shared timer untuk debat rounds
- Timer rooms untuk sesi debat terpisah
- Kontrol real-time dengan multiple participants
- Tracking waktu speaking otomatis
- Room management untuk berbagai sesi

### 📚 Library
- Kumpulan motion dan resources debat
- Knowledge base tim terorganisir
- Sharing materials antar member
- Bookmarks dan favorites system

### 👥 Profile & Direktori
- Profil anggota tim detail
- Directory profesional member
- Tracking pencapaian dan achievement
- Integrasi Discord roles untuk identitas tim

### 📝 Transcript
- AI-assisted transcription debat
- Analisis debat otomatis
- Recording management
- Performance review berbasis data

### 📊 EB Area
- Area khusus Executive Board
- Management tools administratif
- Team analytics dan reporting

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org) 16.2.4
- **Frontend**: React 19.2.4 dengan TypeScript 5
- **Backend/Database**: [Supabase](https://supabase.com) (PostgreSQL + Auth)
- **PWA**: @ducanh2912/next-pwa (Progressive Web App support)
- **QR Code**: qrcode.react 4.2.0
- **Styling**: CSS Modules
- **Linting**: ESLint 9
- **Build**: Webpack (Next.js default)

## 📦 Prerequisites

- Node.js 18+
- npm atau yarn
- Akun Supabase (gratis di supabase.com)
- Git

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/ulwant/UDFdebatemate.git
cd UDFdebatemate
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Buat file `.env.local` di root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Dapatkan credentials dari Supabase Dashboard > Settings > API.

### 4. Setup Database
Jalankan semua SQL files di Supabase SQL Editor:
```bash
# Di Supabase dashboard, run setiap file dalam urutan:
supabase_attendance_dashboard_update.sql
supabase_bookmarks_update.sql
supabase_calendar_events.sql
supabase_discord_roles.sql
supabase_header_update.sql
supabase_rbac_presensi.sql
supabase_timer_rooms.sql
```

### 5. Run Development Server
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

## 📚 Available Scripts

```bash
# Development server dengan hot reload
npm run dev

# Build untuk production
npm run build

# Start production server (setelah build)
npm start

# Linting dan code quality check
npm run lint
```

## 📁 Project Structure

```
debate-mate/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout
│   │   ├── page.tsx                      # Dashboard homepage
│   │   ├── globals.css                   # Global styles
│   │   ├── manifest.ts                   # PWA manifest
│   │   │
│   │   ├── calendar/
│   │   │   ├── page.tsx                  # Calendar page
│   │   │   └── Calendar.module.css       # Calendar styles
│   │   │
│   │   ├── presensi/
│   │   │   ├── page.tsx                  # Attendance dashboard
│   │   │   ├── Presensi.module.css
│   │   │   └── scan/
│   │   │       └── page.tsx              # QR scan page
│   │   │
│   │   ├── timer/
│   │   │   ├── page.tsx                  # Timer main page
│   │   │   ├── Timer.module.css
│   │   │   └── room/
│   │   │       ├── page.tsx              # Timer room page
│   │   │       ├── RoomTimer.module.css
│   │   │       └── loading.tsx
│   │   │
│   │   ├── profile/
│   │   │   ├── page.tsx                  # Profile view
│   │   │   ├── ProfileDirectory.tsx      # Member directory
│   │   │   ├── Profile.module.css
│   │   │   └── ProfileDirectory.module.css
│   │   │
│   │   ├── my-profile/
│   │   │   ├── page.tsx                  # User profile
│   │   │   └── MyProfile.module.css
│   │   │
│   │   ├── library/
│   │   │   └── page.tsx                  # Motion library
│   │   │
│   │   ├── transcript/
│   │   │   └── page.tsx                  # Transcript page
│   │   │
│   │   ├── eb-area/
│   │   │   └── page.tsx                  # EB dashboard
│   │   │
│   │   ├── login/
│   │   │   └── page.tsx                  # Login page
│   │   │
│   │   └── components/
│   │       ├── Sidebar.tsx               # Navigation sidebar
│   │       ├── Sidebar.module.css
│   │       ├── Topbar.tsx                # Top navigation
│   │       └── DevServiceWorkerReset.tsx # SW reset utility
│   │
│   ├── lib/
│   │   ├── supabaseClient.ts             # Supabase initialization
│   │   └── constants.ts                  # App constants
│   │
│   └── styles.css                        # Additional styles
│
├── public/
│   ├── sw.js                             # Service Worker
│   ├── workbox-*.js                      # PWA workbox
│   └── icon-*.png                        # PWA icons
│
├── supabase_*.sql                        # Database schemas
├── next.config.ts                        # Next.js configuration
├── tsconfig.json                         # TypeScript config
├── eslint.config.mjs                     # ESLint config
└── package.json                          # Dependencies
```

## 🗄️ Database Schema

### Tables Overview

**supabase_attendance_dashboard_update.sql**
- Attendance tracking table
- Member presensi records
- Attendance statistics

**supabase_presensi_rbac.sql**
- Role-based access control
- Permission management
- User roles (admin, moderator, member)

**supabase_calendar_events.sql**
- Event scheduling table
- Training dates
- Event details dan descriptions

**supabase_timer_rooms.sql**
- Timer room management
- Active timer sessions
- Room metadata

**supabase_bookmarks_update.sql**
- User bookmarks
- Favorite motions
- Resource bookmarking

**supabase_discord_roles.sql**
- Discord integration
- Role mapping
- Member verification

**supabase_header_update.sql**
- Header configurations
- UI settings
- Navigation setup

## 🔐 Security Features

- ✅ Supabase Authentication built-in
- ✅ RBAC (Role-Based Access Control)
- ✅ Row-Level Security (RLS) di database
- ✅ Environment variables untuk sensitive data
- ✅ API key protection
- ✅ Secure QR code generation

## 🌐 PWA Features

Aplikasi dapat diakses sebagai Progressive Web App:
- 📱 Installable di mobile dan desktop
- 🔄 Service Worker untuk offline support
- 💾 Caching strategy dengan workbox
- 🔄 Background sync capabilities
- 📲 App-like experience

## 🚀 Deployment

### Deploy ke Vercel (Recommended)

Vercel adalah creator Next.js, paling optimal:

```bash
# Install vercel CLI
npm i -g vercel

# Login dan deploy
vercel
```

Environment variables di Vercel Dashboard > Settings > Environment Variables.

### Deploy ke Platform Lain

#### Self-hosted / VPS
```bash
npm run build
npm start          # Runs on port 3000
```

#### Docker (jika ada Dockerfile)
```bash
docker build -t debate-mate .
docker run -p 3000:3000 debate-mate
```

## 🛠️ Development

### Code Style
- TypeScript strict mode
- ESLint configuration included
- CSS Modules untuk scoped styling

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/YourFeatureName

# Make changes dan commit
git add .
git commit -m "feat: Description of changes"

# Push to GitHub
git push origin feature/YourFeatureName

# Create Pull Request di GitHub
```

## 🐛 Troubleshooting

### Service Worker Issues
```bash
# Clear service worker cache
# Gunakan DevServiceWorkerReset component atau:
# - Chrome DevTools > Application > Storage > Clear site data
# - Refresh page
```

### Database Connection Error
- Verifikasi `.env.local` memiliki Supabase credentials yang benar
- Pastikan Supabase project aktif dan accessible
- Check Supabase project Status di dashboard

### Build Errors
```bash
npm run lint        # Check ESLint errors
npm run build       # Full build test
rm -rf .next        # Clear Next.js cache
npm install         # Reinstall dependencies
```

### Port 3000 Already in Use
```bash
npm run dev -- -p 3001  # Run di port 3001
```

## 📖 Resources & Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [PWA Guide](https://web.dev/progressive-web-apps/)

## 🤝 Contributing

1. Fork repository
2. Create feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'feat: Add AmazingFeature'`
4. Push branch: `git push origin feature/AmazingFeature`
5. Create Pull Request

### Commit Message Convention
- `feat:` untuk fitur baru
- `fix:` untuk bug fixes
- `refactor:` untuk code refactoring
- `docs:` untuk dokumentasi
- `style:` untuk styling changes

## 📝 License

Proprietary software untuk UDF (Union Debating Federation).

## 👥 Team & Support

Dikembangkan untuk dan oleh UDF Community.

**Support Contact**: [Hubungi tim development]

---

## 🔗 Links

- **Repository**: https://github.com/ulwant/UDFdebatemate
- **Live Demo**: [TBA]
- **Issues**: https://github.com/ulwant/UDFdebatemate/issues
- **Discussions**: https://github.com/ulwant/UDFdebatemate/discussions

---

**Version**: 0.1.0  
**Last Updated**: May 2026  
**Status**: 🚀 Active Development
