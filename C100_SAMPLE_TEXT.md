# 📄 SAMPLE TEXT UNTUK C100 - SIAP COPY

**Template Text yang Sudah Siap Pakai untuk C100**  
**Customize sesuai kebutuhan, jangan langsung copy!**

---

## 1. RINGKASAN ISI DOKUMEN (Bab 1.1)

### Template:
```
Dokumen ini memaparkan informasi mengenai alasan pembuatan, analisis sistem, 
kebutuhan, dan usulan proses pengembangan dari Platform Manajemen Tim Debat 
Berbasis Web (Debate Mate) yang akan dibuat. Dokumen ini juga membahas seluruh 
aspek dari pembuatan sistem, mulai dari sudut pandang pihak pengguna (anggota 
tim debat UDF) hingga dari sudut pandang pihak developer.

Dokumen ini dapat membantu menjelaskan sistem manajemen yang dibuat kepada pengguna 
(dalam hal ini yaitu anggota tim debat dan Executive Board). Dengan demikian, 
pembaca diharapkan dapat mengerti proses pengembangan dari solusi yang ditawarkan. 
Selain dari itu, dokumen ini dapat digunakan sebagai dasar proses pengembangan 
sistem oleh tim developer. Di dalam pengembangan sebuah sistem manajemen sendiri 
terdapat sebuah pengevaluasian proses maupun hasil pengembangan dan dokumen ini 
dapat menjadi sebuah bahan acuan evaluasi dari pengembangan sistem yang dilakukan.
```

---

## 2. LATAR BELAKANG MASALAH (Bab 2.1)

### Paragraph Pembuka:
```
Persaingan dalam dunia perdagangan dan organisasi sosial saat ini semakin besar 
karena adanya teknologi yang memudahkan aktivitas. Dalam konteks organisasi tim 
debat, khususnya di Union Debating Federation (UDF) Universitas Diponegoro, 
terdapat tantangan signifikan dalam mengelola berbagai aspek operasional secara 
efisien.
```

### Problem #1 - Attendance Tracking:
```
1. MANAJEMEN KEHADIRAN KARYAWAN/ANGGOTA MANUAL
   Proses pencatatan kehadiran anggota tim debat masih dilakukan secara manual 
   melalui pendataan langsung atau simple checklist. Sistem ini rawan manipulasi, 
   tidak akurat, dan tidak mendukung pelacakan real-time serta menghasilkan data 
   yang tidak terstruktur dengan baik.
   
   DAMPAK:
   - Rentan kesalahan pencatatan
   - Sulit tracking attendance rate
   - Tidak ada validitas data
   - Proses manual memakan waktu
   
   SOLUSI YANG DIUSULKAN:
   QR code-based attendance system dengan real-time tracking dan database terstruktur.
```

### Problem #2 - Calendar & Scheduling:
```
2. SISTEM JADWAL DAN EVENT MANAGEMENT TIDAK TERPUSAT
   Informasi tentang jadwal training dan event debat tersebar di berbagai platform 
   (WhatsApp, Discord, Email). Hal ini menyebabkan informasi penting terlewat, 
   kesalahan komunikasi, dan kesulitan dalam tracking historical events.
   
   DAMPAK:
   - Informasi mudah terlewat
   - Confusion dan miscommunication
   - Tidak ada audit trail
   - Sulit koordinasi tim
   
   SOLUSI YANG DIUSULKAN:
   Centralized calendar system dengan notifications dan event management.
```

### Problem #3 - Debate Timer:
```
3. SISTEM TIMER UNTUK DEBATE ROUNDS MASIH MANUAL
   Pengaturan waktu untuk berbagai round debat masih menggunakan stopwatch manual 
   atau aplikasi timer sederhana. Hal ini tidak akurat, sulit sinkronisasi antar 
   participant, dan tidak ada tracking speaking time yang terstruktur.
   
   DAMPAK:
   - Tidak akurat
   - Tidak ter-sinkronisasi
   - Sulit untuk multiple participants
   - Tidak ada data tracking
   
   SOLUSI YANG DIUSULKAN:
   Real-time shared timer dengan multiple room support dan speaking time tracking.
```

### Problem #4 - Knowledge Base:
```
4. KUMPULAN MOTION DAN RESOURCES TIDAK TERORGANISIR
   Berbagai motion dan resource materials tersimpan di berbagai tempat tanpa 
   organisasi yang jelas. Hal ini menyulitkan anggota dalam mencari reference 
   motion, menyebabkan duplikasi data, dan hilangnya knowledge saat anggota keluar.
   
   DAMPAK:
   - Sulit mencari motion yang relevan
   - Duplikasi data
   - Kehilangan knowledge
   - Tidak ada version control
   
   SOLUSI YANG DIUSULKAN:
   Centralized library dengan search, filtering, dan tagging system.
```

### Problem #5 - Achievement Tracking:
```
5. PENCATATAN ACHIEVEMENT DAN PERFORMANCE TIDAK SISTEMATIS
   Pencapaian anggota dalam kompetisi tidak tercatat dengan terstruktur dalam 
   database terpusat. Hal ini menyulitkan evaluasi performance member, tidak ada 
   historical data yang reliable, dan recognition yang tidak fair.
   
   DAMPAK:
   - Tidak ada data terstruktur
   - Sulit evaluate performance
   - Unfair recognition
   - Tidak ada analytics
   
   SOLUSI YANG DIUSULKAN:
   Achievement database dengan analytics dan performance tracking.
```

### Problem #6 - Communication Inefficiency:
```
6. KOMUNIKASI TIM TIDAK EFISIEN DAN TERSENTRALISASI
   Pertukaran informasi antar tim tersebar di multiple channels (Discord, WA, 
   Email) yang menyebabkan informasi penting terlewat, confusion, dan kesulitan 
   dalam audit trail komunikasi.
   
   DAMPAK:
   - Info penting terlewat
   - Miscommunication
   - Tidak ada audit trail
   - Fragmented information
   
   SOLUSI YANG DIUSULKAN:
   Centralized notification dan announcement system.
```

### Problem #7 - RBAC Tidak Ada:
```
7. TIDAK ADA SISTEM PERMISSION MANAGEMENT YANG JELAS
   Belum ada sistem kontrol akses berbasis role (RBAC) yang jelas, sehingga 
   semua anggota memiliki akses yang sama ke semua fitur, tidak ada pembedaan 
   permission antara regular member, EB, dan admin.
   
   DAMPAK:
   - Tidak ada kontrol akses yang proper
   - Security risk
   - Tidak ada role differentiation
   - Data accessibility issues
   
   SOLUSI YANG DIUSULKAN:
   Role-based access control (RBAC) dengan tiered permissions.
```

### Problem #8 - PWA & Mobile:
```
8. TIDAK ADA MOBILE CAPABILITY DAN OFFLINE SUPPORT
   Aplikasi yang ada tidak responsive untuk mobile devices dan tidak memiliki 
   kemampuan offline, sehingga pengguna harus selalu online dan menggunakan 
   desktop/laptop untuk akses.
   
   DAMPAK:
   - Limited mobile access
   - Tidak ada offline capability
   - Poor mobile experience
   - Reduced accessibility
   
   SOLUSI YANG DIUSULKAN:
   Progressive Web App (PWA) dengan responsive design dan offline support.
```

### Statistik & Closing:
```
STATISTIK PROBLEM:
- Jumlah anggota tim aktif: 25-30 orang
- Frekuensi training: 2-3 sesi per minggu
- Jumlah kompetisi tahunan: 10+ events
- Jumlah motions dalam library: 100+ items
- Jumlah achievement records: 40+ records
- Proyeksi pengguna 2 tahun: 50+ users

Oleh karena itu, diperlukan solusi berbasis teknologi yang mampu mengintegrasikan 
seluruh aspek manajemen tim debat secara menyeluruh. Aplikasi manajemen pintar 
tim debat ini diharapkan dapat menyediakan sistem yang tidak hanya mempermudah 
koordinasi, tetapi juga meningkatkan pengalaman pengguna dan mendukung pertumbuhan 
tim secara berkelanjutan.
```

---

## 3. RUMUSAN MASALAH (Bab 2.2)

```
Berdasarkan permasalahan yang diuraikan pada Latar Belakang, tim pengembang 
merumuskan masalah yang akan dibahas dalam penelitian ini sebagai berikut:

(1) Bagaimana proses perancangan dan implementasi Platform Manajemen Tim Debat 
    berbasis web yang terintegrasi?

(2) Bagaimana mengimplementasikan real-time synchronization untuk fitur timer 
    debate dan attendance tracking?

(3) Bagaimana menerapkan Role-Based Access Control (RBAC) untuk membedakan akses 
    dan permission antar user roles secara efektif?

(4) Bagaimana memastikan sistem dapat scale dan sustainable untuk pengembangan 
    jangka panjang?

(5) Bagaimana mengintegrasikan multiple features (attendance, calendar, timer, 
    library, achievement, analytics) dalam satu platform yang user-friendly dan 
    kohesif?
```

---

## 4. TUJUAN (Bab 2.3)

```
Tujuan dari penelitian dan pengembangan ini adalah mengembangkan Platform Manajemen 
Tim Debat yang mampu mengintegrasikan berbagai aspek operasional dengan teknologi 
modern. Sistem ini dirancang agar dapat diimplementasikan dengan optimal, sehingga 
memberikan manfaat berikut:

1. Menghadirkan sistem manajemen tim debat yang efektif dan terstruktur dengan 
   dukungan teknologi modern, memudahkan pengelolaan kehadiran, jadwal, resources, 
   dan pencapaian secara terintegrasi.

2. Mengimplementasikan real-time synchronization untuk timer debate dan attendance 
   tracking yang memastikan akurasi dan konsistensi data across multiple users.

3. Menerapkan RBAC (Role-Based Access Control) yang efektif untuk memberikan akses 
   yang appropriate berdasarkan role pengguna (Admin, EB, Member, Guest).

4. Menyediakan centralized knowledge base dan achievement tracking untuk mendukung 
   data-driven decision making bagi tim leadership.

5. Memastikan aplikasi dapat diakses dari berbagai device dengan responsive design 
   dan PWA capability untuk offline functionality.

6. Menyediakan scalable architecture yang memungkinkan pengembangan fitur-fitur 
   advanced di masa depan (AI transcript analysis, advanced analytics, etc).

7. Menciptakan user experience yang intuitif dan engaging untuk meningkatkan adoption 
   rate among tim members.

8. Membangun sustainable platform yang dapat terus berkembang dan dipertahankan 
   dalam jangka panjang dengan minimal technical debt.
```

---

## 5. PEMILIHAN SOLUSI (Bab 2.4)

### Pendahuluan:
```
Dari permasalahan yang telah dirumuskan, terdapat 3 buah solusi yang diusulkan 
untuk menyelesaikan permasalahan tersebut. Solusi-solusi tersebut adalah sebagai 
berikut:
```

### Solusi 1: Desktop Application + Card-based Attendance
```
1. DESKTOP APPLICATION DENGAN CARD-BASED ATTENDANCE

Sistem informasi berbasis desktop memberikan efisiensi dalam pengelolaan data 
pemesanan dan manajemen attendance karena sistem dapat diakses dengan cepat tanpa 
memerlukan koneksi internet.

KELEBIHAN:
- Akses cepat tanpa delay
- Offline capability
- Performance tinggi di local machine

KEKURANGAN:
- Mobilitas rendah, hanya bisa akses di specific location
- Sulit synchronization antar user
- Maintenance kompleks (perlu update manual di setiap machine)
- Not scalable untuk multiple locations

SISTEM ATTENDANCE:
Card-based attendance memang meningkatkan efisiensi waktu, namun memiliki risiko 
penyalahgunaan seperti praktik titip absen dengan meminjamkan card ke anggota lain.

KESIMPULAN: Solusi ini kurang tepat karena limited mobility dan security concerns.
```

### Solusi 2: CodeIgniter Web App + Fingerprint Attendance
```
2. WEB APPLICATION BERBASIS CODEIGNITER DENGAN FINGERPRINT ATTENDANCE

Pembuatan sistem informasi berbasis web menggunakan kerangka kerja CodeIgniter 
memungkinkan akses sistem melalui jaringan internet dan mempermudah pengelolaan 
pemesanan serta data.

KELEBIHAN:
- Akses dari mana saja via internet
- Biometric security lebih kuat
- Web-based mudah di-maintain

KEKURANGAN:
- CodeIgniter adalah lightweight framework dengan fitur minimal
- Kurangnya fitur bawaan CodeIgniter membuat pengembangan fitur-fitur canggih 
  menjadi lebih sulit
- CodeIgniter cenderung lambat dalam mengikuti teknologi terbaru dibandingkan 
  dengan kerangka kerja lain seperti Laravel atau Next.js
- Biaya fingerprint scanner hardware yang mahal
- Maintenance teknologi fingerprint kompleks

KESIMPULAN: Solusi ini memiliki cost efficiency issue dan framework yang outdated.
```

### Solusi 3: Next.js + Supabase + QR Attendance (PILIHAN)
```
3. PLATFORM MANAJEMEN TIM DEBAT BERBASIS WEB NEXT.JS DENGAN QR ATTENDANCE 
   (RECOMMENDED - SELECTED)

Solusi ini merupakan solusi paling tepat untuk sistem manajemen tim debat yang 
dikembangkan. Sistem informasi berbasis web menggunakan kerangka kerja Next.js 
dikombinasikan dengan sistem real-time dari Supabase menawarkan berbagai keunggulan:

KEUNGGULAN:
a. Akses Fleksibel: Next.js memungkinkan sistem untuk diakses dari perangkat apa 
   pun, kapan saja, dan di mana saja melalui web browser atau perangkat mobile. 
   Responsive design memastikan UX optimal di semua device.

b. Real-time Synchronization: Supabase Realtime memungkinkan synchronization 
   instant antar multiple users untuk fitur seperti timer debate yang membutuhkan 
   precision timing dan instant updates.

c. Fitur Built-in yang Lengkap: Next.js dan Supabase memiliki ecosystem yang 
   mature dengan built-in features untuk authentication, database management, 
   real-time updates, dan deployment.

d. Struktur Kode Teratur: Dengan pola desain modern (App Router, SSR/SSG), Next.js 
   memisahkan concern dengan jelas dan memudahkan scalability dan maintenance.

e. Keamanan Tinggi: Next.js dan Supabase dilengkapi fitur keamanan modern seperti 
   JWT authentication, Row-Level Security (RLS) policies, dan protection dari 
   serangan OWASP top 10.

f. Cost Effective: Berbasis open-source dan serverless, tidak memerlukan investasi 
   hardware tambahan seperti fingerprint scanner.

g. Scalability: Vercel dan Supabase memiliki auto-scaling capability yang memudahkan 
   pertumbuhan pengguna tanpa perlu effort manual.

RINGKASAN PERBANDINGAN:

| Aspek | Desktop + Card | CodeIgniter + Fingerprint | Next.js + Supabase + QR |
|-------|---|---|---|
| Aksesibilitas | Rendah | Tinggi | Tinggi |
| Real-time Sync | Tidak ada | Limited | Excellent |
| Security | Sedang | Tinggi | Sangat Tinggi |
| Cost | Rendah | Tinggi | Sedang |
| Scalability | Buruk | Sedang | Excellent |
| Development Speed | Lambat | Sedang | Cepat |
| Maintenance | Kompleks | Sedang | Mudah |
| **SCORE** | **3/10** | **6/10** | **9/10** |

KESIMPULAN: Solusi 3 dengan Next.js + Supabase + QR attendance adalah pilihan 
terbaik yang mengombinasikan fleksibilitas, security, scalability, dan cost 
efficiency.
```

---

## 6. ANALISIS ASPEK EKONOMIS (Bab 2.5A)

```
Ketika diimplementasikan secara nyata, sistem ini membutuhkan biaya operasional. 
Dengan menggunakan acuan biaya dari provider terkemuka, dapat ditentukan biaya 
infrastruktur dari Platform Manajemen Tim Debat sebagai berikut:

TABEL BIAYA INFRASTRUKTUR (3 TAHUN):

| Perihal | Per Tahun | Per 3 Tahun |
|---------|-----------|-------------|
| Vercel Hosting (Frontend + Serverless) | Rp 0 - 600.000 | Rp 0 - 1.800.000 |
| Supabase Cloud (Database + Auth + Realtime) | Rp 300.000 - 1.200.000 | Rp 900.000 - 3.600.000 |
| Domain (yearly) | Rp 144.000 | Rp 432.000 |
| QR Code Generator (monthly) | Rp 0 (built-in) | Rp 0 |
| **TOTAL BIAYA INFRASTRUKTUR** | **Rp 444.000 - 1.944.000** | **Rp 1.200.000 - 6.000.000** |

ANALISIS BIAYA:
- Vercel menyediakan free tier dengan generous limits untuk startup
- Supabase free tier mencukupi untuk usage awal, scale up sesuai kebutuhan
- Domain bisa menggunakan subdomain gratis jika diperlukan
- No additional hardware cost diperlukan

RETURN ON INVESTMENT (ROI):
- Efficiency gains: Pengurangan 2-3 jam per minggu dari manual tasks
- Cost savings: Tidak perlu software POS premium
- Adoption value: Peningkatan team engagement dan data-driven decisions

KESIMPULAN: Total cost masih reasonable untuk sebuah team, terutama dibandingkan 
dengan commercial solutions yang bisa mencapai Rp 10-20 juta/tahun.
```

---

## 7. MAN-MONTH CALCULATION (Bab 3.1)

```
Proses pembuatan dan perancangan Platform Manajemen Tim Debat akan dilaksanakan 
oleh 4 orang pengembang dari Departemen Teknik Komputer Universitas Diponegoro 
dengan peran/role berbeda:

- UI/UX Designer
- Frontend Developer
- Backend Developer  
- QA/Testing Specialist

TABEL PERHITUNGAN MAN-MONTH:

| Profesi | Hari Kerja (6 Jam/Hari) | Hari Kerja dalam 2 Bulan | Man-Month |
|---------|------------------------|---------------------------|-----------|
| Frontend Developer | 38 hari | 40 hari (asumsi) | 1.9 PM |
| Backend Developer | 35 hari | 40 hari | 1.75 PM |
| QA Specialist | 30 hari | 40 hari | 1.5 PM |
| UI/UX Designer | 25 hari | 40 hari | 1.25 PM |
| **TOTAL** | **128 hari** | **160 hari** | **6.4 PM** |

FORMULA MAN-MONTH:
Man-Month = (Hari Kerja × 24 Jam) / Jam Kerja dalam 1 Bulan
Asumsi: 6 jam kerja/hari, 20 hari kerja efektif/bulan = 120 jam/bulan
Man-Month = (38 hari × 24 jam) / 120 jam = 7.6 jam → 1.9 PM

PENJELASAN:
- Setiap pengembang bekerja 6 jam/hari selama 40 hari kerja
- Total effort mencapai 6.4 man-months untuk seluruh project
- Ini setara dengan 1 orang bekerja penuh-time selama ~6.5 bulan
- Atau 4 orang bekerja selama ~7 minggu (1.7 bulan)
```

---

## 8. KESIMPULAN (Bab 4)

```
Platform Manajemen Tim Debat (Debate Mate) berbasis web dengan integrasi real-time 
synchronization dan RBAC ini menawarkan solusi komprehensif untuk meningkatkan 
efisiensi operasional dan pengalaman pengguna tim debat UDF.

KUNCI INOVASI:
1. Real-time Timer Sync: Memastikan semua participants memiliki waktu yang sama 
   dengan latency < 100ms
2. QR-based Attendance: Paperless, tamper-proof, dan instant recording
3. Multi-tier RBAC: Fleksibel permission management sesuai role
4. Integrated Knowledge Base: Centralized resources dengan search capability
5. PWA Architecture: Offline-capable dan installable seperti native app
6. Scalable Design: Ready untuk growth ke 50+ users

DAMPAK YANG DIHARAPKAN:
- Efisiensi: 2-3 jam/minggu saved dari manual tasks
- Accuracy: 99%+ accuracy dalam attendance dan timing
- Engagement: Improved team coordination dan communication
- Data-driven: Historical data untuk performance analysis dan improvement
- Sustainability: Cost-effective maintenance untuk 2-3 tahun ke depan

IMPLEMENTASI SISTEM INI DIHARAPKAN DAPAT MENJADI FONDASI TRANSFORMASI DIGITAL 
BAGI TIM DEBAT UDF MENUJU OPERASIONAL YANG LEBIH EFISIEN, HEMAT BIAYA, DAN 
BERORIENTASI PADA KEPUASAN PENGGUNA.
```

---

## CATATAN PENTING

✅ **JANGAN LANGSUNG COPY-PASTE!**
- Customize dengan data & informasi spesifik team Anda
- Sesuaikan angka dengan project timeline actual Anda
- Update nama institusi, team members, advisor
- Modify nominal rupiah sesuai research Anda

✅ **QUALITY CHECKLIST:**
- [ ] Language: Formal Indonesian
- [ ] Flow: Logical & coherent
- [ ] Detail: Technical & specific
- [ ] Length: Sesuai section requirements
- [ ] References: Include citation numbers

✅ **NEXT STEPS:**
1. Copy template di atas
2. Customize dengan data Anda
3. Add diagrams & tables
4. Insert references (IEEE format)
5. Review & revise
6. Submit untuk advisor approval

---

**Template siap digunakan! Customize sesuai kebutuhan capstone Anda! 🎓**
