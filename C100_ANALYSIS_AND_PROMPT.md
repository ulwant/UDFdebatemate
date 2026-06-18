# 📋 DEBATE MATE - Analisis Project & Prompt Pembuat C100

**Tanggal Analisis**: Juni 13, 2026  
**Project**: Debate Mate - Platform Manajemen Tim Debat UDF  
**Status**: Ready untuk Capstone Document

---

## 📊 ANALISIS PROJECT DEBATE MATE

### 1. IDENTITAS PROJECT

| Aspek | Detail |
|-------|--------|
| **Nama Project** | Debate Mate 🎯 |
| **Nama Lengkap** | Platform Manajemen Tim Debat Berbasis Web untuk Union Debating Federation (UDF) |
| **Institusi** | Undip (Universitas Diponegoro) - Debate Team/Club |
| **Tujuan** | Menyediakan platform all-in-one untuk koordinasi training, tracking kehadiran, manajemen achievement, shared timer, dan transcription berbantuan AI |
| **Tahun Implementasi** | 2025-2026 |
| **Target Pengguna** | Anggota tim debat UDF, Executive Board, Admin |

---

### 2. ANALISIS TEKNIS PROJECT

#### 2.1 Tech Stack

```
FRONTEND:
├── Framework: Next.js 16.2.4
├── UI Library: React 19.2.4
├── Language: TypeScript 5
├── Styling: CSS Modules + CSS Variables
├── State Management: React Context API (UserContext, ToastContext)
├── QR Code Generator: qrcode.react 4.2.0
├── PWA: @ducanh2912/next-pwa 10.2.9
└── Build Tool: Webpack (Next.js default) + Turbopack

BACKEND/DATABASE:
├── Database: Supabase (PostgreSQL)
├── Authentication: Supabase Auth
├── API: Supabase REST API via supabase-js
├── ORM: None (Direct SQL queries)
├── Real-time: Supabase Realtime
└── Storage: Supabase Storage

DEVELOPMENT TOOLS:
├── IDE: VS Code
├── Linting: ESLint 9 + eslint-config-next
├── Package Manager: npm/yarn
├── Version Control: Git
└── Testing: (Perlu ditambahkan)

DEPLOYMENT:
├── Platform: Vercel (rekomendasi untuk Next.js)
├── Database Hosting: Supabase Cloud
├── Environment: production/development
└── CI/CD: Belum ada (rekomendasi: GitHub Actions)
```

#### 2.2 Arsitektur Project

```
┌─────────────────────────────────────────────────────────────┐
│                    DEBATE MATE ARCHITECTURE                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐      ┌──────────────┐      ┌──────────┐   │
│  │  Frontend   │◄───► │   Supabase   │◄────►│PostgreSQL│   │
│  │  (Next.js)  │      │   (Backend)  │      │          │   │
│  └─────────────┘      └──────────────┘      └──────────┘   │
│       │                      │                              │
│       │                      │                              │
│  ┌────────────────┐   ┌──────────────────┐                 │
│  │ React Pages    │   │ SQL Triggers &   │                 │
│  │ Components     │   │ RLS Policies     │                 │
│  │ (17 pages)     │   │ (Keamanan)       │                 │
│  └────────────────┘   └──────────────────┘                 │
│       │                                                      │
│  ┌────────────────────────────────────────┐                │
│  │   Context & State Management           │                │
│  │   - UserContext (Auth & Profile)       │                │
│  │   - ToastContext (Notifications)       │                │
│  └────────────────────────────────────────┘                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 2.3 File Structure

```
debate-mate/
├── src/app/
│   ├── components/              # Reusable UI components
│   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   ├── Topbar.tsx           # Header bar
│   │   ├── ApprovalGate.tsx      # Auth protection
│   │   ├── ThemeProvider.tsx     # Dark/Light mode
│   │   ├── Toast.tsx            # Notifications
│   │   ├── DevServiceWorkerReset.tsx
│   │   └── [other components]
│   │
│   ├── achievements/            # Achievement dashboard
│   │   └── page.tsx
│   │
│   ├── audit-log/              # Admin audit tracking
│   │   └── page.tsx
│   │
│   ├── calendar/               # Event scheduling
│   │   └── page.tsx
│   │
│   ├── eb-area/                # Executive Board area
│   │   └── page.tsx
│   │
│   ├── library/                # Knowledge base
│   │   └── page.tsx
│   │
│   ├── login/                  # Authentication
│   │   └── page.tsx
│   │
│   ├── my-profile/             # User profile management
│   │   ├── AccountSettings.tsx
│   │   └── page.tsx
│   │
│   ├── notifications/          # Notification center
│   │   └── page.tsx
│   │
│   ├── presensi/               # QR-based attendance
│   │   └── page.tsx
│   │
│   ├── profile/                # Member directory
│   │   └── page.tsx
│   │
│   ├── timer/                  # Debate timer
│   │   └── page.tsx
│   │
│   ├── transcript/             # AI transcript analysis
│   │   └── page.tsx
│   │
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Dashboard home
│   ├── globals.css             # Global styles
│   ├── page.module.css         # Dashboard styles
│   ├── manifest.ts             # PWA manifest
│   └── [other files]
│
├── lib/
│   ├── supabaseClient.ts       # Supabase initialization
│   ├── UserContext.tsx         # User authentication context
│   ├── constants.ts            # App constants
│   ├── lazy.ts                 # Lazy loading utilities
│   ├── notifications.ts        # Notification system
│   ├── profileUtils.ts         # Profile utilities
│   └── [other utilities]
│
├── public/
│   ├── sw.js                   # Service worker
│   ├── workbox-*.js            # Workbox files
│   └── [static assets]
│
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
└── [config files]
```

---

### 3. FITUR & FUNGSIONALITAS

#### 3.1 Core Features (8 Module Utama)

```
1. 📊 DASHBOARD
   ├── Overview metrics (attendance rate, active members, motions, achievements)
   ├── Timeline agenda (past, current, next training)
   ├── Recent achievements display
   ├── Next training info
   └── Quick action buttons

2. 📋 ATTENDANCE/PRESENSI
   ├── QR code-based attendance scanning
   ├── Real-time attendance status
   ├── Per-member attendance history
   ├── Attendance statistics & charts
   ├── RBAC for scanning permission
   └── Mobile-responsive scanning interface

3. 📅 CALENDAR
   ├── Training schedule management
   ├── Event creation & editing
   ├── Collision detection
   ├── Calendar view (month, week, day)
   ├── Event notifications
   └── Supabase real-time sync

4. ⏱️ TIMER
   ├── Shared debate timer (rounds, speeches)
   ├── Multiple timer rooms (concurrent sessions)
   ├── Real-time synchronization
   ├── Auto-tracking speaking time
   ├── Pause/resume/reset controls
   ├── Sound alerts
   └── Room management interface

5. 📚 LIBRARY/KNOWLEDGE BASE
   ├── Motion storage & organization
   ├── Resource sharing (PDFs, notes)
   ├── Search & filtering
   ├── Bookmarks/favorites system
   ├── Category tagging
   └── Member contributions

6. 👥 PROFILE & DIRECTORY
   ├── Member profile cards
   ├── Achievement tracking
   ├── Contact information
   ├── Discord role integration
   ├── Skill badges
   └── Team member directory

7. 📝 AI TRANSCRIPT
   ├── Recording upload
   ├── AI-powered transcription
   ├── Speech analysis
   ├── Performance metrics
   ├── Downloadable transcripts
   └── Historical records

8. 📊 EB AREA (Executive Board)
   ├── Admin dashboard
   ├── User management
   ├── Event creation/approval
   ├── Analytics & reporting
   ├── Team metrics
   ├── Announcements
   └── Settings management
```

#### 3.2 Secondary Features

```
- AUDIT LOG: Activity tracking & monitoring
- NOTIFICATIONS: Real-time notification center
- APPROVAL GATE: Member approval workflow
- THEME SUPPORT: Dark/Light mode
- PWA: Offline capability & installable
- RESPONSIVE DESIGN: Mobile-first approach
```

---

### 4. USER ROLES & PERMISSIONS (RBAC)

```
┌──────────────────────────────────────────────────────┐
│           ROLE-BASED ACCESS CONTROL (RBAC)           │
├──────────────────────────────────────────────────────┤
│
│  1. ADMIN (system_role = 'admin')
│     ├── Full system access
│     ├── User management
│     ├── Audit log viewing
│     ├── Settings modification
│     └── All EB Area features
│
│  2. EXECUTIVE BOARD (system_role = 'eb')
│     ├── EB Area access
│     ├── Team analytics
│     ├── Event creation
│     ├── User approval
│     └── Announcements
│
│  3. REGULAR MEMBER (system_role = 'user')
│     ├── Dashboard access
│     ├── Attendance marking
│     ├── Timer usage
│     ├── Library access
│     ├── Profile viewing
│     └── Calendar viewing
│
│  4. GUEST (member_type = 'guest')
│     ├── Limited features
│     ├── Timer & Presensi only
│     ├── No admin access
│     └── No EB area access
│
│  STATUS LAYERS:
│  ├── approval_status: 'pending' | 'approved' | 'rejected'
│  ├── member_type: 'regular' | 'guest' | 'alumni'
│  └── system_role: 'user' | 'eb' | 'admin'
```

---

### 5. DATABASE SCHEMA (Supabase PostgreSQL)

```
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE TABLES OVERVIEW                    │
├─────────────────────────────────────────────────────────────┤
│
│  CORE TABLES:
│  ├── auth.users (Supabase managed)
│  │   └── id, email, created_at, last_sign_in_at
│  │
│  ├── public.profiles
│  │   ├── user_id (FK)
│  │   ├── full_name, bio, avatar_url
│  │   ├── approval_status (pending/approved/rejected)
│  │   ├── member_type (regular/guest/alumni)
│  │   ├── system_role (user/eb/admin)
│  │   ├── discord_id, discord_roles
│  │   ├── phone, address, batch
│  │   └── created_at, updated_at
│  │
│  OPERATIONAL TABLES:
│  ├── public.profiles (user profiles & roles)
│  ├── public.weekly_sessions (training schedules)
│  ├── public.attendance_records (attendance logs)
│  ├── public.competition_results (achievements)
│  ├── public.motions (debate motions library)
│  ├── public.bookmarks (user favorites)
│  ├── public.notifications (notification history)
│  ├── public.audit_logs (activity tracking)
│  │
│  RELATIONSHIP TABLES:
│  ├── public.competition_teams (team participation)
│  └── public.discord_roles (role mapping)
│
│  SECURITY:
│  ├── RLS (Row Level Security) policies
│  ├── Authentication checks
│  ├── Authorization rules per role
│  └── Audit triggers on sensitive tables
│
└─────────────────────────────────────────────────────────────┘
```

---

### 6. KEY ALGORITHMS & FEATURES

#### 6.1 Real-time Synchronization
- Supabase Realtime subscriptions untuk timer rooms
- Live attendance status updates
- Instant notifications

#### 6.2 Attendance Calculation
```
attendance_rate = (present_records / total_sessions) * 100
```

#### 6.3 QR Code Generation
- Dynamic QR generation untuk setiap session
- URL-encoded attendance endpoints
- Mobile scanning capability

#### 6.4 AI Integration Points
- Transcript processing (placeholder untuk future AI)
- Performance analysis
- Recommendation engine (future)

---

### 7. PERFORMANCE & SCALABILITY

#### 7.1 Performance Optimizations
- Next.js Image optimization
- CSS Module scoping
- Lazy component loading
- Service Worker caching (PWA)
- Database indexing
- Turbopack build optimization

#### 7.2 Scalability Considerations
- Supabase auto-scaling
- Serverless architecture (Vercel)
- Connection pooling (Supabase)
- CDN distribution
- Response caching

---

### 8. SECURITY MEASURES

```
AUTHENTICATION & AUTHORIZATION:
├── Supabase Auth (JWT tokens)
├── Password hashing (bcrypt via Supabase)
├── Session management
├── RBAC enforcement
└── Row Level Security (RLS) policies

INPUT VALIDATION:
├── Client-side form validation
├── Server-side input sanitization
├── SQL injection prevention (Supabase prepared statements)
├── XSS protection via React escaping
└── CSRF tokens (handled by Supabase)

DATA PROTECTION:
├── HTTPS/TLS encryption
├── At-rest encryption (Supabase)
├── Sensitive data masking
├── PII protection
└── Audit logging

DEPLOYMENT SECURITY:
├── Environment variables for secrets
├── No hardcoded credentials
├── API key rotation capability
└── Rate limiting (cloud provider level)
```

---

### 9. TESTING STRATEGY

```
CURRENT STATE:
└── No automated tests implemented

RECOMMENDED TESTING:
├── Unit Tests (Jest)
│   ├── Utility functions
│   ├── Context providers
│   └── Component logic
│
├── Integration Tests (React Testing Library)
│   ├── Component interactions
│   ├── Form submissions
│   ├── Navigation flows
│   └── API calls
│
├── E2E Tests (Cypress/Playwright)
│   ├── User workflows
│   ├── Attendance scanning
│   ├── Timer synchronization
│   └── Calendar management
│
└── Performance Tests (Lighthouse, WebPageTest)
    ├── Core Web Vitals
    ├── Load time
    ├── Mobile performance
    └── SEO metrics
```

---

### 10. DEPLOYMENT & HOSTING

```
CURRENT SETUP:
├── Frontend: Next.js (ready for Vercel)
├── Backend: Supabase
├── Database: PostgreSQL (Supabase hosted)
└── Storage: Supabase Storage

DEPLOYMENT FLOW:
├── Development: local npm run dev
├── Staging: Vercel preview branch
├── Production: Vercel main branch
└── Database: Supabase managed

CI/CD RECOMMENDATIONS:
├── GitHub Actions for automation
├── Automated testing on PR
├── Build optimization checks
├── Deployment automation
└── Status monitoring
```

---

## 📝 PROMPT UNTUK PEMBUAT C100

Gunakan prompt berikut untuk memberikan instruksi kepada AI Agent untuk membuat C100 Capstone:

```markdown
TASK: Buatkan saya dokumen C100 (Capstone Proposal Document) untuk project Debate Mate

PROJECT DETAILS:
─────────────────────────────────────────────────────────────

NAMA PROJECT:
"Debate Mate - Platform Manajemen Tim Debat Berbasis Web dengan 
Fitur Real-time Synchronization dan RBAC untuk Union Debating 
Federation (UDF) Universitas Diponegoro"

LATAR BELAKANG MASALAH:
Tim debat UDF Undip menghadapi beberapa tantangan operasional:

1. MANAJEMEN KEHADIRAN MANUAL
   Problem: Sistem attendance tracking masih manual/paper-based
   Impact: 
   - Rentan kesalahan pencatatan
   - Sulit tracking attendance rate tim
   - Tidak ada real-time monitoring
   Solution: QR code-based automated attendance system

2. KOORDINASI TRAINING TIDAK TERSTRUKTUR
   Problem: Jadwal training tersebar, tidak ter-sentralisasi
   Impact:
   - Kesulitan member mengikuti schedule
   - Inkonsistensi informasi event
   - Tidak ada reminder otomatis
   Solution: Centralized calendar with notifications

3. MANAJEMEN TIMER & ROUNDS MANUAL
   Problem: Timer untuk debate rounds masih manual (stopwatch, hp)
   Impact:
   - Tidak akurat
   - Sulit sinkronisasi antar participant
   - Tidak ada tracking speaking time
   Solution: Shared real-time debate timer dengan multiple rooms

4. KNOWLEDGE BASE TERSEBAR
   Problem: Kumpulan motion & resources tidak ter-organize
   Impact:
   - Sulit mencari reference motion
   - Duplikasi data
   - Knowledge loss saat member keluar
   Solution: Centralized library dengan search & tagging

5. TRACKING ACHIEVEMENT TIDAK SISTEMATIS
   Problem: Pencapaian member tidak tercatat terstruktur
   Impact:
   - Sulit evaluate member performance
   - Tidak ada historical data
   - Unfair recognition
   Solution: Achievement database dengan analytics

6. KOMUNIKASI TIM TIDAK EFISIEN
   Problem: Informasi tersebar di Discord, WA, Email
   Impact:
   - Info penting terlewat
   - Confusion & miscommunication
   - Sulit audit trail
   Solution: Centralized notification & announcement system

STATISTIK PROBLEM:
- 25+ anggota tim aktif
- 2-3 training session per minggu
- 10+ kompetisi per tahun
- 100+ motions dalam library
- 40+ achievement records

RUMUSAN MASALAH:
1. Bagaimana merancang sistem manajemen tim debat berbasis web 
   yang terintegrasi?

2. Bagaimana mengimplementasikan real-time synchronization untuk 
   fitur timer & attendance?

3. Bagaimana menerapkan Role-Based Access Control (RBAC) untuk 
   membedakan akses antar user roles?

4. Bagaimana memastikan sistem scalable & sustainable untuk 
   pengembangan jangka panjang?

5. Bagaimana mengintegrasikan multiple features (attendance, 
   calendar, timer, library, achievement) dalam satu platform 
   yang user-friendly?

TUJUAN PROJECT:
─────────────────────────────────────────────────────────────
1. Mengembangkan platform web all-in-one untuk manajemen tim debat 
   yang efisien & terintegrasi

2. Mengimplementasikan sistem attendance QR code untuk tracking 
   kehadiran real-time

3. Membangun shared timer dengan real-time synchronization untuk 
   debate rounds

4. Menyediakan centralized knowledge base untuk motion & resources

5. Membuat analytics dashboard untuk performance tracking & 
   achievement monitoring

6. Menerapkan RBAC untuk different user permissions (Admin, EB, 
   Member, Guest)

7. Memastikan aplikasi PWA-ready untuk offline capability & 
   mobile accessibility

8. Menyediakan scalable architecture untuk future features (AI 
   transcript, advanced analytics, etc)

TECH STACK DETAILS:
─────────────────────────────────────────────────────────────
FRONTEND:
- Framework: Next.js 16.2.4 (React 19.2.4)
- Language: TypeScript 5
- Styling: CSS Modules + CSS Variables
- State: React Context API (UserContext, ToastContext)
- PWA: @ducanh2912/next-pwa 10.2.9
- QR: qrcode.react 4.2.0
- Build: Next.js Turbopack
- Linting: ESLint 9

BACKEND & DATABASE:
- Backend Service: Supabase (Backend-as-Service)
- Database: PostgreSQL (Supabase managed)
- Authentication: Supabase Auth with JWT
- API: Supabase REST API via supabase-js 2.105.1
- Real-time: Supabase Realtime subscriptions
- Storage: Supabase Storage

DEPLOYMENT:
- Frontend Hosting: Vercel (recommended for Next.js)
- Backend Hosting: Supabase Cloud
- Database: PostgreSQL (Supabase managed)
- CDN: Vercel Edge Network

DEVELOPMENT:
- IDE: VS Code
- Version Control: Git/GitHub
- Package Manager: npm
- Testing: (To be implemented)
- CI/CD: GitHub Actions (recommended)

FITUR UTAMA (8 MODULES):
─────────────────────────────────────────────────────────────

1. 📊 DASHBOARD (Home/Overview)
   Metrics:
   - Attendance rate percentage
   - Active members count
   - Total motions in library
   - Achievement count
   
   Components:
   - Welcome hero section
   - Real-time metric cards
   - Upcoming agenda timeline (past/current/next)
   - Recent achievements list
   - Quick action buttons

2. 📋 ATTENDANCE SYSTEM
   Features:
   - QR code generation per session
   - Mobile QR scanning interface
   - Real-time attendance status
   - Member check-in history
   - Attendance rate calculation
   - RBAC-based access control
   
   Data Tracking:
   - Present/Absent/Late status
   - Check-in timestamp
   - Per-member attendance statistics

3. 📅 CALENDAR MANAGEMENT
   Capabilities:
   - Weekly training schedule
   - Event CRUD operations
   - Color-coded event types
   - Collision detection
   - Calendar views (month/week/day)
   - Push notifications
   
   Event Types:
   - Training sessions
   - Competitions
   - Discussions
   - Meetings

4. ⏱️ DEBATE TIMER
   Features:
   - Single shared timer (multiple users viewing same timer)
   - Multiple timer rooms (concurrent sessions)
   - Real-time synchronization across clients
   - Preset times for different round types
   - Pause/resume/reset controls
   - Sound alerts & notifications
   - Speaking time tracking
   
   Room Management:
   - Create/join timer rooms
   - Participant list per room
   - Room settings & permissions

5. 📚 LIBRARY & KNOWLEDGE BASE
   Contents:
   - Motion storage & organization
   - Research resources (PDFs, notes)
   - Topic categorization
   - Search & advanced filtering
   - User bookmarks/favorites
   - Sharing permissions
   
   Features:
   - Full-text search
   - Tag-based filtering
   - Upload new materials
   - Version control for documents
   - Access statistics

6. 👥 PROFILE & MEMBER DIRECTORY
   Profile Info:
   - Full member profile cards
   - Avatar & bio
   - Achievement badges
   - Contact information
   - Social links (Discord, etc)
   - Join date & activity status
   
   Directory Features:
   - Member search & filtering
   - Skill/role filtering
   - Batch grouping
   - Export member list

7. 📝 AI TRANSCRIPT (Future-ready)
   Current Placeholder:
   - Recording upload interface
   - Transcription processing
   - Performance analysis display
   - Historical records
   
   Architecture:
   - Ready for AI integration (Google Colab, Python backend)
   - Structured data storage
   - Analysis result caching

8. 📊 EB AREA (Executive Board Dashboard)
   Permissions:
   - Admin panel access
   - User management & approval
   - Event creation & publishing
   - Team analytics & KPI
   - Announcements & communications
   - System settings
   
   Analytics Provided:
   - Attendance trends
   - Member activity
   - Event participation rates
   - Team performance metrics

SECONDARY FEATURES:
─────────────────────────────────────────────────────────────
- Audit Log: Comprehensive activity logging
- Notifications: Real-time notification center
- Approval Gate: Member registration workflow
- Dark Mode: Light/Dark theme support
- PWA: Offline capability & installable app
- Responsive Design: Mobile-first approach
- RBAC: Role-based access control (Admin/EB/User/Guest)

USER ROLES & PERMISSIONS:
─────────────────────────────────────────────────────────────

ROLE HIERARCHY:
1. ADMIN (system_role='admin')
   - Full system access
   - User management
   - Audit log viewing
   - Settings modification
   - All EB Area features
   - Can modify any user data

2. EXECUTIVE BOARD (system_role='eb')
   - EB Area access
   - Team analytics viewing
   - Event creation & approval
   - User approval/rejection
   - Announcements publishing
   - Team reports generation

3. REGULAR MEMBER (system_role='user')
   - Dashboard access
   - Attendance marking
   - Timer participation
   - Calendar viewing
   - Library access
   - Profile viewing
   - Achievement tracking
   - Limited settings modification

4. GUEST (member_type='guest')
   - Limited feature access
   - Timer & Presensi only
   - No admin/EB access
   - Read-only mode for most features
   - No settings access

STATUS LAYERS:
- approval_status: pending/approved/rejected
- member_type: regular/guest/alumni
- system_role: user/eb/admin

DATABASE ARCHITECTURE:
─────────────────────────────────────────────────────────────

CORE TABLES:
1. auth.users (Supabase managed)
   - Unique user authentication

2. public.profiles
   - Extended user information
   - Role & permission data
   - Member metadata
   - Foreign key: user_id → auth.users

3. public.weekly_sessions
   - Training schedule
   - Event information
   - Metadata & notes

4. public.attendance_records
   - Attendance logs
   - Status tracking
   - Timestamps
   - Foreign key: user_id, session_id

5. public.competition_results
   - Achievement records
   - Competition metadata
   - Performance data

6. public.motions
   - Motion library
   - Categorization
   - Search indexing

7. public.notifications
   - Notification history
   - User preferences
   - Read/unread status

8. public.audit_logs
   - Activity tracking
   - User actions
   - Timestamps & metadata

9. public.bookmarks
   - User favorites
   - Quick access items
   - Foreign key: user_id

RELATIONSHIP TABLES:
- public.competition_teams
- public.discord_roles
- [other junction tables]

SECURITY:
- Row Level Security (RLS) policies
- Authentication checks on all tables
- Authorization rules per role
- Triggers for audit logging

ALGORITHMS & LOGIC:
─────────────────────────────────────────────────────────────

1. ATTENDANCE CALCULATION
   Formula: attendance_rate = (present_records / total_sessions) * 100
   
   Triggers:
   - Calculate after each session
   - Cache result for dashboard
   - Include in weekly reports

2. QR CODE GENERATION
   Process:
   - Generate unique code per session
   - Encode session_id + timestamp
   - Display as scannable QR
   - Validate on scan

3. REAL-TIME TIMER SYNC
   Technology: Supabase Realtime subscriptions
   Process:
   - Server maintains authoritative time
   - Clients subscribe to timer room
   - Broadcast updates via WebSocket
   - Fallback to polling if needed

4. RBAC ENFORCEMENT
   Process:
   - Check user.system_role on every action
   - RLS policies on database queries
   - Server-side validation
   - Error handling for unauthorized access

5. NOTIFICATION SYSTEM
   Triggers:
   - Member approval/rejection
   - Attendance reminder
   - Event announcements
   - Achievement earned
   - System alerts

PERFORMANCE REQUIREMENTS:
─────────────────────────────────────────────────────────────
- Dashboard load time: < 2 seconds
- QR scan processing: < 1 second
- Timer sync delay: < 100ms
- Database queries: < 500ms (95th percentile)
- PWA offline: Full functionality for core features
- Mobile performance: Lighthouse score > 90
- API response time: < 200ms average

SCALABILITY CONSIDERATIONS:
─────────────────────────────────────────────────────────────
- Current users: 25-30 active members
- Expected growth: 50+ members (2 years)
- Concurrent users: 5-10 during training
- Peak load: 15+ during competition events
- Database size: ~500MB current, 1GB projected (2 years)

Architecture choices for scaling:
- Supabase auto-scaling database
- Vercel serverless functions
- CDN for static assets
- Connection pooling (Supabase)
- Caching strategies (Redis-ready)

TESTING STRATEGY:
─────────────────────────────────────────────────────────────

CURRENT: No automated tests

RECOMMENDED PLAN:

Unit Tests (Jest):
- Utility functions (40+ test cases)
- Context providers (20+ test cases)
- Custom hooks (15+ test cases)
- Component logic (30+ test cases)
Target: 80%+ coverage

Integration Tests (React Testing Library):
- Component interactions (25+ test cases)
- Form submissions & validation (20+ test cases)
- Navigation flows (15+ test cases)
- API mocking & data fetching (25+ test cases)
Target: 70%+ coverage

E2E Tests (Cypress):
- User authentication flow
- Attendance scanning workflow
- Timer room creation & sync
- Calendar event management
- Library search & filtering
- Member profile browsing
Target: All critical user journeys

Performance Tests:
- Lighthouse CI
- Core Web Vitals monitoring
- Load testing (k6)
- Bundle size tracking

DEPLOYMENT STRATEGY:
─────────────────────────────────────────────────────────────

DEVELOPMENT ENVIRONMENT:
- Local Next.js dev server
- Local Supabase (Docker or cloud dev project)
- Environment variables: .env.local

STAGING ENVIRONMENT:
- Vercel Preview Deployments (per PR)
- Supabase staging project
- Automated testing on preview
- Manual QA testing

PRODUCTION ENVIRONMENT:
- Vercel Main Branch Deployment
- Supabase Production Project
- Database backups (daily)
- Monitoring & alerting
- Performance tracking

CI/CD PIPELINE (GitHub Actions):
- Run tests on every PR
- Build optimization checks
- Lint & format verification
- Automatic deployment on merge
- Performance regression testing
- Security scanning

HOSTING DETAILS:
- Frontend: Vercel (Automatic scaling)
- Backend: Supabase (PostgreSQL managed)
- Database: Supabase Cloud (EU/US region)
- Storage: Supabase Storage (S3-compatible)

COST ESTIMATION (3-Year):
─────────────────────────────────────────────────────────────
- Vercel: $0-50/month (free tier + hobby)
- Supabase: $25-100/month (based on usage)
- Domain: $12/year
- SSL: Free (Vercel + Supabase)
- Storage: $0.023/GB (Supabase)

Total: ~$1,000-3,000 per year

DEVELOPMENT TEAM & EFFORT:
─────────────────────────────────────────────────────────────

ROLES NEEDED:
1. Frontend Developer (Lead): Next.js/React specialist
2. Backend Developer: Supabase/PostgreSQL specialist
3. UI/UX Designer: Interface & experience design
4. QA/Testing: Automated & manual testing
5. DevOps/Deployment: CI/CD & Infrastructure

ESTIMATED EFFORT (for Capstone):
- Requirement Analysis: 1 week
- Design & Architecture: 2 weeks
- Frontend Development: 4-6 weeks
- Backend Development: 3-4 weeks
- Integration & Testing: 2-3 weeks
- Deployment & Documentation: 1-2 weeks
Total: 13-18 weeks (~3-4 months)

MAN-MONTH CALCULATION:
- Assuming 4-5 person team
- 6 hours/day effective development
- 20 working days/month
- Total: ~6-8 man-months effort

RISK ANALYSIS & MITIGATION:
─────────────────────────────────────────────────────────────

HIGH RISKS:
1. Real-time synchronization complexity
   Mitigation: Use Supabase Realtime, implement fallback polling

2. RBAC implementation security
   Mitigation: RLS policies, server-side validation, security audit

3. Performance with large datasets
   Mitigation: Database indexing, pagination, caching strategy

MEDIUM RISKS:
1. User adoption of new system
   Mitigation: Training & onboarding, user feedback loop

2. Data migration from legacy system
   Mitigation: Backup strategy, parallel running period

3. Timer sync edge cases
   Mitigation: Comprehensive testing, fallback mechanisms

LOW RISKS:
1. Technology stack maturity
   (Next.js, React, Supabase are stable & well-supported)

2. Hosting reliability
   (Vercel & Supabase have 99.9%+ uptime SLAs)

FUTURE ENHANCEMENTS:
─────────────────────────────────────────────────────────────
Phase 2 (Post-Capstone):
- AI-powered transcript analysis (actual implementation)
- Advanced analytics dashboard
- Mobile native app (React Native)
- Integration with Discord bot
- Video recording & streaming
- Advanced member statistics
- Salary/incentive tracking
- Advanced scheduling (room/equipment allocation)

Phase 3:
- Machine learning recommendations
- Competitive analysis tools
- Integration with external debate platforms
- Multi-team federation support

COMPLIANCE & STANDARDS:
─────────────────────────────────────────────────────────────
- GDPR compliance for user data
- ISO 27001 security standards (baseline)
- Accessibility (WCAG 2.1 AA)
- Performance standards (Core Web Vitals)
- Code quality standards (ESLint/Prettier)
- API documentation (OpenAPI/Swagger)

DOCUMENTATION TO PROVIDE:
─────────────────────────────────────────────────────────────
1. Technical Architecture Document
   - System design diagrams
   - Data flow diagrams
   - Component architecture
   - API specifications

2. Database Schema Documentation
   - Table descriptions
   - Entity-relationship diagrams
   - RLS policies explanation
   - Trigger logic

3. Development Guide
   - Setup instructions
   - Coding standards
   - Git workflow
   - Testing procedures

4. User Manual
   - Feature walkthroughs
   - Administrator guide
   - Troubleshooting guide
   - FAQ

5. Deployment Guide
   - Production setup
   - Environment configuration
   - Backup procedures
   - Monitoring setup

6. API Documentation
   - Endpoint descriptions
   - Request/response examples
   - Authentication details
   - Rate limiting

OUTPUT REQUIREMENT:
─────────────────────────────────────────────────────────────
Buatkan C100 document dengan struktur standar Undip:

1. JUDUL & COVER
2. DATA PENGUSUL (4 mahasiswa + 2 pembimbing)
3. DAFTAR ISI
4. PENDAHULUAN
   - Ringkasan isi dokumen
   - Aplikasi dokumen
   - Referensi
   - Daftar singkatan
5. PROPOSAL PENGEMBANGAN PRODUK
   - Latar belakang masalah (8 sub-problems dengan detail)
   - Rumusan masalah (5 research questions)
   - Tujuan
   - Pemilihan solusi & teknis (3 opsi, pilih yg terbaik)
   - Analisis aspek (ekonomis, manufakturabilitas, sustainability)
   - Skenario pemanfaatan produk oleh stakeholder
6. USAHA PENGEMBANGAN
   - Man-Month calculation
   - Machine-Month calculation
   - Development tools (dengan justifikasi)
   - Test equipment & methodology
   - Cost estimation
   - Success probability
   - Development schedule (Gantt chart)
7. KESIMPULAN

FORMATTING REQUIREMENTS:
- Font: Times New Roman, 12pt (body), 14pt (heading)
- Spacing: 1.5 line spacing
- Margin: 2.5cm (kiri), 2cm (kanan/atas/bawah)
- Page numbering: Bottom right
- References: IEEE format with 20+ sources
- Total pages: 30-35 pages
- Include tables, figures, diagrams
- Professional formatting per Undip standards

LANGUAGE:
- Bahasa Indonesia (formal/academic)
- Technical terms dapat menggunakan English (with explanation)
- Consistent terminology throughout
- Clear & structured writing

REQUEST FORMAT:
─────────────────────────────────────────────────────────────
Tolong buatkan file C100 format:
- Filename: [NIM_Team]_C100_DebateMate_Rev01.docx atau .pdf
- Dalam bahasa Indonesia formal
- Mengikuti standar Undip dengan sempurna
- Siap untuk disubmit ke prodi
- Include all sections, tables, diagrams, references
- Self-contained document (tidak perlu referensi eksternal)
```

---

## 📌 CATATAN PENTING

Ketika memberikan prompt ini ke AI Agent, pastikan:

✅ **Jelaskan bahwa:**
- Ini adalah project capstone untuk Universitas Diponegoro
- Harus mengikuti format standar Undip C100
- Harus mencakup semua 7 bagian utama dengan detail
- Harus profesional & siap disubmit

✅ **Sediakan:**
- Nama team & NIM member (untuk cover page)
- Nama 2 pembimbing (dosen)
- Target submission date
- Institusi & departemen (Teknik Komputer Undip)

✅ **Specify output:**
- Format file: DOCX atau PDF
- Ukuran dokumen: 30-35 halaman
- Bahasa: Bahasa Indonesia
- Include: All diagrams, tables, references

✅ **Quality checklist:**
- ✓ Struktur lengkap per Undip standards
- ✓ Referensi 20+ sources (IEEE format)
- ✓ Diagram & tabel berkualitas
- ✓ Analisis teknis mendalam
- ✓ Cost & effort estimation detail
- ✓ Risk analysis lengkap
- ✓ Gantt chart untuk schedule
- ✓ Professional writing & formatting

---

## 🎯 NEXT STEPS

1. **Copy prompt di atas** ke text editor
2. **Tambahkan informasi spesifik:**
   - Team member names & NIM
   - Advisor names & NPPU
   - University & department
   - Expected submission date

3. **Berikan ke AI Agent** dengan instruksi:
   - "Buatkan C100 Undip berdasarkan project Debate Mate"
   - "Mengikuti format standar & requirement di atas"
   - "Output: DOCX/PDF siap submit"

4. **Review hasil** untuk memastikan:
   - Semua section lengkap
   - Data akurat & relevan
   - Professional formatting
   - Referensi cukup & valid

5. **Submit ke advisor** untuk approval

---

**Siap gunakan prompt ini untuk membuat C100 Anda! 🚀**
