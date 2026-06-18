# 📋 QUICK GUIDE - DEBATE MATE C100 PREPARATION

**Dibuat**: Juni 13, 2026  
**Untuk**: Capstone Proposal C100 (Undip)  
**Status**: Ready to use ✅

---

## 🎯 RINGKASAN EKSEKUTIF PROJECT

### Project Name
**Debate Mate** - Platform Manajemen Tim Debat Berbasis Web dengan Real-time Synchronization, RBAC, dan AI Integration

### Institusi & Lokasi
- **Universitas**: Diponegoro (Undip)
- **Departemen**: Teknik Komputer
- **Target User**: UDF (Union Debating Federation) Tim Debat Undip
- **Tahun**: 2025-2026

### Problem Statement (8 Masalah Utama)
1. ❌ Attendance tracking manual → QR system
2. ❌ Training schedule tersebar → Centralized calendar
3. ❌ Timer debate manual → Shared real-time timer
4. ❌ Motion library tidak organized → Searchable library
5. ❌ Achievement tracking tidak sistematis → Achievement DB
6. ❌ Komunikasi tim tidak efisien → Notification center
7. ❌ RBAC tidak ada → Multi-tier permission system
8. ❌ Tidak ada offline capability → PWA implementation

### Key Statistics
```
Users: 25-30 active members
Sessions/Week: 2-3 training sessions
Annual Competitions: 10+ events
Motion Library: 100+ motions
Achievement Records: 40+ records
Expected Users (2 years): 50+
```

### Tech Stack Summary
```
Frontend:     Next.js 16 + React 19 + TypeScript 5 + CSS Modules
Backend:      Supabase (PostgreSQL)
Real-time:    Supabase Realtime
Auth:         Supabase Auth
PWA:          @ducanh2912/next-pwa
Features:     QR code, Timer, Calendar, Library, Profiles, Analytics
Deployment:   Vercel + Supabase Cloud
```

### 8 Core Features/Modules
1. **Dashboard** - Overview & metrics
2. **Attendance** - QR-based tracking
3. **Calendar** - Event scheduling
4. **Timer** - Real-time debate timer
5. **Library** - Motion & resources
6. **Profiles** - Member directory
7. **AI Transcript** - Performance analysis (future-ready)
8. **EB Area** - Admin dashboard

### User Roles (RBAC)
- **Admin**: Full system access
- **EB (Executive Board)**: Team management
- **Member**: Standard features
- **Guest**: Limited access (Timer + Attendance only)

### Development Effort
```
Timeline:     13-18 weeks (~3-4 months)
Team Size:    4-5 people
Man-Months:   6-8 man-months
Hours/Day:    6 hours effective work
```

### Cost Estimation (3 Years)
```
Vercel:       $0-50/month
Supabase:     $25-100/month
Domain:       $12/year
Total:        ~$1,000-3,000/year
```

---

## 📋 C100 DOCUMENT STRUCTURE CHECKLIST

Gunakan checklist ini untuk memastikan semua section lengkap:

### 1. COVER PAGE & ADMINISTRATIVE ✓
- [ ] Title: Debate Mate - Platform Manajemen Tim Debat...
- [ ] Document Number: C100.[NIMs]Rev01
- [ ] Revision Number & Date
- [ ] Team member names & NIMs (4 orang)
- [ ] Advisor names & NPPU (2 orang)
- [ ] Signatures on approved sections

### 2. DAFTAR ISI ✓
- [ ] Table of contents lengkap
- [ ] Page numbers accurate
- [ ] Includes all sections & subsections

### 3. PENDAHULUAN (Intro Section) ✓
**3.1 Ringkasan Isi Dokumen**
- [ ] Jelaskan tujuan dokumen (1 paragraph)
- [ ] Overview dari semua bagian (1 page)

**3.2 Aplikasi Dokumen**
- [ ] Untuk gambaran teknis & non-teknis TA
- [ ] Memastikan kelayakan (teknik, waktu, biaya, strategis)
- [ ] Catatan proses pengerjaan
- [ ] Approval dari pembimbing & tim capstone

**3.3 Referensi**
- [ ] Minimal 20 referensi
- [ ] Format IEEE standard
- [ ] Mix: Research papers, books, online resources
- [ ] Include: [1] Supabase docs, [2] Next.js docs, [3] React docs, [4] Academic papers on RBAC, [5] Real-time systems papers, etc.

**3.4 Daftar Singkatan**
- [ ] PWA, RBAC, REST API, JWT, RLS, CI/CD, QR, EB, UDF, etc.
- [ ] Format tabel dengan 2 kolom (Akronim | Definisi)

### 4. PROPOSAL PENGEMBANGAN PRODUK ✓

**4.1 Latar Belakang Masalah (Background)**
- [ ] **Paragraph 1**: General industry context (Tim debat menghadapi tantangan operasional...)
- [ ] **8 Sub-problems dengan detail**:
  
  Problem 1: Attendance Tracking Manual
  ├── Status quo: Paper/manual system
  ├── Impact: Error-prone, no real-time monitoring
  ├── Current solution: None/ineffective
  └── Proposed: QR code system
  
  Problem 2: Training Schedule Tersebar
  ├── Status quo: Multiple platforms (WA, Discord, Email)
  ├── Impact: Info loss, confusion
  └── Proposed: Centralized calendar
  
  [Continue untuk 6 problems lainnya]

- [ ] **Statistics**: 25+ members, 2-3 training/week, 100+ motions, etc.
- [ ] Justifikasi teknologi: Next.js, Supabase, React
- [ ] **Paragraph akhir**: Kesimpulan problem statement

**4.2 Rumusan Masalah (Problem Statement)**
- [ ] **5 Research Questions** (numbered):
  1. Bagaimana merancang sistem manajemen tim debat berbasis web yang terintegrasi?
  2. Bagaimana mengimplementasikan real-time synchronization?
  3. Bagaimana menerapkan RBAC yang efektif?
  4. Bagaimana memastikan scalability & sustainability?
  5. Bagaimana mengintegrasikan multiple features dalam satu platform?

**4.3 Tujuan (Objectives)**
- [ ] **8 Tujuan Project** (numbered):
  1. Mengembangkan platform all-in-one...
  2. Mengimplementasikan sistem attendance QR...
  3. Membangun shared timer dengan sync...
  [dst]

**4.4 Pemilihan Solusi & Teknis (Solution Selection)**
- [ ] **3 Alternative Solutions**:
  
  Option 1: Desktop Application + Card-based Attendance
  ├── Pros: Fast local access
  └── Cons: Limited mobility, manual data management
  
  Option 2: Web App with CodeIgniter + Fingerprint
  ├── Pros: Web-based, biometric secure
  └── Cons: Expensive hardware, slow framework
  
  Option 3: Next.js Web App + Supabase + QR System (PILIHAN)
  ├── Pros: Modern, scalable, cost-effective, real-time
  └── Cons: Requires internet

- [ ] **Justifikasi pilihan**: Kenapa Option 3 terbaik
- [ ] **Tech stack detail**: Next.js 16, React 19, TypeScript 5, Supabase, PostgreSQL, etc.

**4.5 Analisis Aspek Terkait (Aspect Analysis)**

**A. Analisis Ekonomis (Economic Analysis)**
- [ ] **Biaya Infrastruktur** (tabel):
  | Item | Harga/Tahun |
  |------|-------------|
  | Vercel Hosting | Rp 0-600,000 |
  | Supabase Cloud | Rp 300-1,200,000 |
  | Domain | Rp 144,000 |
  | Total 1 Tahun | Rp 444,000-2,044,000 |
  | Total 3 Tahun | Rp 1,200,000-6,000,000 |

- [ ] **ROI Analysis**: Efficiency gains, cost savings untuk UDF
- [ ] **Sustainability**: Operating cost feasibility

**B. Analisis Manufakturabilitas (Manufacturability)**
- [ ] **Design Tools**: Figma untuk UI/UX
- [ ] **Development**: Laravel vs Next.js comparison → Next.js pilihan
- [ ] **Framework Ecosystem**: Maturity, community support
- [ ] **Technology Selection Justification**
- [ ] **AI/ML Component**: Google Colab readiness

**C. Analisis Sustainability (Long-term Viability)**
- [ ] **Technology Stack Longevity**: 
  - Next.js 16 (Long-term support)
  - React 19 (Actively maintained)
  - PostgreSQL 15 (Stable, well-supported)
  - Supabase (Young but growing)

- [ ] **Maintenance Plan**: Routine updates, bug fixes
- [ ] **Support System**: Documentation, training modules
- [ ] **Upgrade Path**: Future feature additions
- [ ] **2-3 year projection**: Expected usage, growth

**4.6 Skenario Pemanfaatan oleh Stakeholder**
- [ ] **Problem dengan sistem POS konvensional** (analogi)
- [ ] **5 Fitur Utama & Keunggulan**:
  1. Personal Website untuk Branding
  2. Dynamic Table Management
  3. Loyal Customer Identification (Profile tracking)
  4. Employee Attendance (biometric-like)
  5. Professional POS Features
  
  *Disesuaikan dengan Debate Mate features*

- [ ] **Tabel Perbandingan dengan Kompetitor**:
  | Fitur | Debate Mate | Kompetitor A | Kompetitor B |
  |-------|-------------|-------------|-------------|
  | Real-time Timer | ✓ | ✗ | ✗ |
  | QR Attendance | ✓ | ✓ | ✗ |
  | Multi-room Timer | ✓ | ✗ | ✗ |
  | RBAC System | ✓ | ✓ | ✓ |
  | AI Transcript | ✓ | ✗ | ✗ |

- [ ] **3 Level User Table**:
  - Admin permissions
  - EB Board permissions
  - Member permissions
  - Guest permissions

### 5. USAHA PENGEMBANGAN (Development Effort) ✓

**5.1 Man-Month Calculation**
- [ ] **Tabel story point → jam kerja**:
  
  | Profesi | Pekerjaan | Story Point | Jam |
  |---------|----------|------------|-----|
  | Frontend Dev | UI/UX Implementation | 20 | 80 |
  | Frontend Dev | Component Development | 24 | 96 |
  | Backend Dev | Database Design | 6 | 24 |
  | Backend Dev | API Development | 18 | 72 |
  | QA | Testing | 15 | 60 |
  
  - [ ] Total jam kerja per role
  - [ ] Total story points: 83-100
  - [ ] Conversion factor: 1 story point = 4 jam

- [ ] **Man-Month Formula**: 
  ```
  Man-Month = (Total Jam × 24) / Jam Kerja dalam 1 Bulan
  Asumsi: 6 jam/hari, 20 hari kerja/bulan = 120 jam/bulan
  ```
  
- [ ] **Hasil Perhitungan**:
  - Frontend Developer: 1.8 man-month
  - Backend Developer: 1.6 man-month
  - QA: 0.8 man-month
  - **Total: 4.2 man-months**

**5.2 Machine-Month Calculation**
- [ ] **Tabel perangkat & jam usage**:
  
  | Role | Perangkat | Total Jam | Machine-Month |
  |------|----------|-----------|---------------|
  | Frontend | Laptop (8GB RAM) | 320 jam | 3.20 |
  | Backend | Laptop (16GB RAM) | 280 jam | 2.80 |
  | QA | Laptop (8GB RAM) | 200 jam | 2.00 |
  | Server | Cloud (24/7) | 720 jam | 7.20 |
  | **Total** | - | 1520 jam | 15.20 |
  
  - [ ] Machine-Month formula sama dengan Man-Month
  - [ ] Asumsi: 100 jam kerja efektif per bulan per machine

**5.3 Development Tools**
- [ ] **Visual Studio Code**: Justifikasi untuk PHP/JavaScript development
- [ ] **Bootstrap CSS / Tailwind**: UI framework selection
- [ ] **Laravel / Next.js**: Framework selection justification
- [ ] **Google Colab**: AI/ML development (Python)
- [ ] **Python**: Data processing language
- [ ] **Figma**: UI/UX design tool
- [ ] **Git/GitHub**: Version control

Untuk setiap tool, jelaskan:
- Purpose & usage
- Why selected over alternatives
- Integration dalam development workflow

**5.4 Test Equipment (Testing Methodology)**
- [ ] **Unit Testing**: Jest, React Testing Library
- [ ] **Integration Testing**: Selenium, Cypress
- [ ] **Performance Testing**: Lighthouse, k6
- [ ] **Security Testing**: OWASP, static analysis
- [ ] **Compatibility Testing**: BrowserStack, device testing
- [ ] **Usability Testing**: System Usability Scale (SUS)
  - SUS Score > 70 = acceptable
  - Target: 75+

**5.5 Perkiraan Biaya (Cost Estimation)**
- [ ] **Tabel Biaya Infrastruktur** (3 tahun):
  
  | Item | 1 Tahun | 2 Tahun | 3 Tahun |
  |------|---------|---------|---------|
  | Hosting (Vercel) | Rp 0-600K | Rp 0-1.2M | Rp 0-1.8M |
  | Database (Supabase) | Rp 300-1.2M | Rp 300-1.2M | Rp 300-1.2M |
  | Domain | Rp 144K | Rp 144K | Rp 144K |
  | **Total** | Rp 444K-1.9M | Rp 444K-2.5M | Rp 444K-3.1M |

- [ ] Cost breakdown & justification
- [ ] ROI analysis untuk UDF

**5.6 Peluang Keberhasilan (Success Probability)**
- [ ] **Faktor Pendukung**:
  - Small team (easier communication)
  - Clear project scope
  - Modern tech stack
  - Real user adoption potential
  - Experienced team members

- [ ] **Faktor Penghambat**:
  - Limited development time
  - Integrating multiple features
  - Real-time sync complexity
  - User adoption curve

- [ ] **Probability Assessment**: 
  - Development Success: 85%
  - User Adoption: 90%
  - Long-term Sustainability: 80%
  - **Overall: 85%**

- [ ] Mitigation strategies untuk risks

**5.7 Jadwal & Waktu Pengembangan (Development Schedule)**
- [ ] **Gantt Chart** (13-18 minggu):
  
  Week 1-2: Requirements Analysis & Design
  Week 3-4: Database Design & Setup
  Week 5-10: Frontend Development (6 minggu)
  Week 7-10: Backend Development (4 minggu)
  Week 11-14: Integration & Testing (4 minggu)
  Week 15-16: Deployment & Documentation (2 minggu)
  Week 17-18: Buffer & Final Adjustments (2 minggu)
  
- [ ] Milestone definitions
- [ ] Dependency management
- [ ] Risk buffers

### 6. KESIMPULAN (Conclusion) ✓
- [ ] **Summary of solution**: Debate Mate solves 8 key problems
- [ ] **Key innovations**: Real-time timer, QR attendance, RBAC, PWA
- [ ] **Expected impact**: Improved efficiency, better data-driven decisions
- [ ] **Future potential**: AI integration, mobile app, advanced analytics
- [ ] **Closing statement**: Foundation untuk digital transformation UDF

---

## 🚀 LANGKAH-LANGKAH PEMBUATAN

### Phase 1: Preparation (1-2 hari)
```
☐ Kumpulkan informasi tim (4 mahasiswa + 2 pembimbing)
☐ Tentukan NIM & NPPU
☐ Siapkan 20+ referensi
☐ Kumpulkan semua project files & documentation
☐ Review dokumen C100 contoh (sudah diberikan)
```

### Phase 2: Drafting (3-5 hari)
```
☐ Tulis Latar Belakang Masalah (8 sub-problems detail)
☐ Rumusan Masalah (5 questions)
☐ Tujuan (8 objectives)
☐ Solusi & Teknis (3 options analysis)
☐ Analisis Aspek (Economic, Manufacturing, Sustainability)
```

### Phase 3: Technical Documentation (3-5 hari)
```
☐ Man-Month calculation
☐ Machine-Month calculation
☐ Development tools description
☐ Testing methodology
☐ Cost estimation detail
☐ Development schedule Gantt chart
```

### Phase 4: Finalization (2-3 hari)
```
☐ Kesimpulan & penutup
☐ Add diagrams & tables
☐ Format profesional Undip
☐ Referensi & bibliography
☐ Proof-reading & quality check
☐ Get advisor approval
```

### Phase 5: Submission
```
☐ Convert to PDF if needed
☐ Submit ke sistem capstone Undip
☐ Keep backup copies
```

---

## 📊 KEY METRICS UNTUK C100

### Problem Metrics
- 8 main problems identified
- 25-30 current users
- 2-3 training sessions/week
- 10+ competitions/year
- 100+ motions in library

### Solution Metrics
- 8 core features/modules
- 4 user roles with RBAC
- 4 alternative solutions evaluated
- 1 recommended solution (Next.js + Supabase)

### Development Metrics
- 4-5 team members
- 13-18 weeks development
- 6-8 man-months effort
- 15+ machine-months effort
- Rp 1.2M-6M total cost (3 years)

### Performance Targets
- Dashboard load: < 2 seconds
- Timer sync: < 100ms
- Database query: < 500ms
- Mobile Lighthouse: > 90
- Uptime: 99.9%

### Testing Targets
- Unit test coverage: 80%+
- Integration test coverage: 70%+
- All critical user journeys (E2E)
- SUS score: > 75

### Success Metrics
- Development success: 85%
- User adoption: 90%
- Long-term sustainability: 80%

---

## 📖 REFERENSI YANG HARUS DIWUJUDKAN

**Minimal 20 referensi dari kategori**:

### Academic Papers (5-7)
- Real-time systems & WebSocket
- Role-Based Access Control (RBAC)
- Database optimization
- Software architecture
- Agile development

### Technical Documentation (5-7)
- Next.js official docs
- React documentation
- Supabase documentation
- PostgreSQL documentation
- Material Design guidelines

### Books (2-3)
- Software Engineering (pressman)
- Database Design
- Web Development Best Practices

### Online Resources (3-5)
- OWASP Security guidelines
- W3C Accessibility standards
- GitHub repositories
- Dev.to technical articles

### Standards (2-3)
- ISO/IEC 27001 (Security)
- WCAG (Accessibility)
- REST API best practices

---

## ⚠️ COMMON MISTAKES UNTUK DIHINDARI

❌ **JANGAN LAKUKAN**:
1. Copy-paste dari contoh C100 tanpa customize
2. Tidak detail dalam problem analysis
3. Tidak justifikasi pemilihan teknologi
4. Perhitungan Man-Month sembarangan
5. Referensi kurang atau tidak akurat
6. Format tidak sesuai Undip standard
7. Tidak ada diagram & tabel visual
8. Biaya tidak realistis
9. Risk analysis tidak lengkap
10. Gantt chart tidak detail

✅ **LAKUKAN INI**:
1. Customize semua informasi untuk Debate Mate
2. Analisis problem mendalam dengan data real
3. Justifikasi setiap keputusan teknis
4. Calculate effort dengan realistic assumptions
5. Gunakan 20+ referensi valid
6. Follow Undip formatting guide
7. Include high-quality diagrams
8. Research cost dari provider aktual
9. Identify & mitigate risks properly
10. Buat timeline realistis & achievable

---

## 📝 QUICK PROMPT UNTUK MEMBUAT C100

Jika ingin menggunakan AI untuk membuat C100, gunakan prompt berikut:

```
TASK: Buatkan dokumen C100 untuk project "Debate Mate"

REQUIREMENT:
- Format: Dokumen Undip C100 standar (30-35 halaman)
- Bahasa: Bahasa Indonesia formal
- Struktur: Pendahuluan → Problem → Solution → Development → Conclusion
- Content: Gunakan analisis di "C100_ANALYSIS_AND_PROMPT.md"
- Referensi: Include 20+ referensi dalam format IEEE
- Diagrams: Include architecture, database, workflow diagrams
- Tables: Include all calculations & comparisons

TEAM INFO:
- Nama: [Masukkan 4 nama mahasiswa]
- NIM: [Masukkan 4 NIM]
- Pembimbing 1: [Nama]
- Pembimbing 2: [Nama]
- Institusi: Teknik Komputer Undip
- Tahun: 2026

OUTPUT:
File .docx siap submit ke prodi
```

---

## 🎓 APPROVAL CHECKLIST

Sebelum submit ke advisor, pastikan:

### Content Checklist
- [ ] Semua 8 problems dijelaskan detail
- [ ] 5 research questions clear & focused
- [ ] 8 objectives specific & measurable
- [ ] 3 solution options evaluated properly
- [ ] Analisis aspek lengkap & mendalam
- [ ] Man-month & Machine-month calculated
- [ ] Cost estimation realistic
- [ ] Schedule feasible
- [ ] References 20+ valid

### Formatting Checklist
- [ ] Font: Times New Roman 12pt
- [ ] Spacing: 1.5 line spacing
- [ ] Margin: 2.5cm kiri, 2cm lain
- [ ] Page number: kanan bawah
- [ ] Gambar & table: labeled dengan caption
- [ ] Referensi: IEEE format
- [ ] Total halaman: 30-35 pages

### Document Quality
- [ ] No typos or grammatical errors
- [ ] Professional tone throughout
- [ ] Consistent terminology
- [ ] Clear structure & flow
- [ ] All sections present & complete
- [ ] Diagrams clear & informative
- [ ] Tables well-formatted

### Technical Accuracy
- [ ] Tech stack choices justified
- [ ] Architecture makes sense
- [ ] Calculations correct
- [ ] Schedule realistic
- [ ] Risks identified & mitigated

---

## 📧 TEMPLATE EMAIL UNTUK ADVISOR

```
Subyek: Submisi Draft C100 - Debate Mate [Revisi 01]

Yth. Bapak/Ibu [Nama Pembimbing],

Dengan hormat, kami mengajukan draft dokumen C100 untuk project 
"Debate Mate - Platform Manajemen Tim Debat Berbasis Web" untuk 
review dan feedback.

Dokumen ini telah kami siapkan dengan:
✓ 8 problem analysis detail
✓ Solution proposal lengkap
✓ Development effort calculation
✓ Cost & schedule estimation
✓ 20+ referensi valid
✓ Professional formatting

File: C100_DebateMate_Draft_Rev01.docx

Kami terbuka untuk feedback dan siap melakukan revisi sesuai 
masukan Bapak/Ibu.

Terimakasih,
[Team Names]
```

---

**Ready to create your C100? Use the prompt & checklist above! 🎓**
