# Database Schema Execution Order

Dokumen ini menjelaskan urutan eksekusi file SQL yang benar apabila Anda perlu men-setup ulang database Supabase dari awal (contohnya di project baru atau environment staging).

File dengan nomor bagian yang sama tidak memiliki ketergantungan ketat satu sama lain, namun tetap disarankan mengikuti urutan dari atas ke bawah.

## 1. Base Schema (Profiles & Users)
1. `supabase_rbac_presensi.sql`
   - Membuat `system_role` pada profiles
   - Membuat `attendance_sessions` & `attendance_records` beserta RLS
2. `supabase_registration_approval.sql`
   - Membuat workflow approval profil (`approval_status`, `member_type`, dll)
   - **PENTING**: Membuat trigger `handle_new_user_profile()` versi awal

## 2. Feature & Profile Updates
3. `supabase_add_email.sql`
   - Menambahkan kolom `email` ke profiles dan mengupdate trigger.
4. `supabase_profile_guest_privacy_update.sql`
   - Menambahkan fitur Guest, Privacy Settings, username, faculty.
   - **PENTING**: File ini meng-overwrite trigger menjadi versi **FINAL**. Harus di-run setelah file nomor 2 dan 3.
5. `supabase_discord_roles.sql`
   - Tabel `discord_roles` dan seed data role standar.
6. `supabase_header_update.sql`
   - Menambahkan `header_picture_url` pada profiles.
7. `supabase_major_and_calendar_color.sql`
   - Menambahkan `major` pada profiles dan `color` pada calendar_events.
8. `supabase_bookmarks_update.sql`
   - Membuat tabel `bookmarks` dan menambahkan `tab_url` pada motions.
9. `supabase_calendar_events.sql`
   - Membuat tabel `calendar_events`.
10. `supabase_notifications.sql`
    - Membuat tabel `notifications`.
11. `supabase_notifications_update.sql`
    - Menambahkan extra policies untuk admin di tabel `notifications`.

## 3. Competition System
12. `supabase_competition_records.sql`
    - Membuat arsitektur kompetisi penuh (`competitions`, `competition_teams`, `competition_participants`, `competition_results`, `competition_submissions`).
13. `supabase_competition_legacy_migration.sql`
    - **HANYA DIJALANKAN SEKALI**: Memindahkan data dari JSON `profiles.achievements` ke tabel canonical kompetisi.

## 4. Timer System
14. `supabase_timer_rooms.sql`
    - Tabel lobby timer `debate_timer_rooms` & `debate_timer_participants`.
15. `supabase_timer_roles.sql`
    - Menambahkan speaker role.
16. `supabase_timer_realtime_sync.sql`
    - Menambahkan `get_server_time_ms()` dan sequence triggers untuk sync Realtime.

## 5. Audit & Admin Cleanup
17. `supabase_audit_logs.sql`
    - Tabel `audit_logs` untuk mencatat aktivitas.
18. `supabase_global_audit_trigger.sql`
    - Trigger otomatis untuk merekam perubahan di tabel penting ke dalam `audit_logs`.
19. `supabase_user_deletion.sql`
    - Memperbaiki foreign key agar CASCADE delete saat auth.users dihapus.
    - Menambahkan RPC `delete_own_user` dan `delete_user_by_admin`.

## 6. Optimization (NEW)
20. `00_master_schema_optimization.sql`
    - Menambahkan 13 index performa yang krusial.
    - Me-rename kolom legacy yang tidak terpakai (`role`, `debating_history`) menjadi `_legacy_*` agar database lebih bersih tanpa merusak data lama.
    - Menambahkan dokumentasi COMMENT di skema database.
