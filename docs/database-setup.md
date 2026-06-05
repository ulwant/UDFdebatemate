# Debate Mate Database Setup

Run these SQL files in Supabase SQL Editor before a demo. Keep this order so columns and helper RPCs exist before UI features call them.

1. `supabase_calendar_events.sql`
2. `supabase_bookmarks_update.sql`
3. `supabase_rbac_presensi.sql`
4. `supabase_attendance_dashboard_update.sql`
5. `supabase_timer_rooms.sql`
6. `supabase_timer_roles.sql`
7. `supabase_timer_realtime_sync.sql`
8. `supabase_competition_records.sql`
9. `supabase_competition_legacy_migration.sql`
10. `supabase_registration_approval.sql`
11. `supabase_notifications.sql`
12. `supabase_notifications_update.sql`
13. `supabase_audit_logs.sql`
14. `supabase_global_audit_trigger.sql`
15. `supabase_discord_roles.sql`
16. `supabase_header_update.sql`
17. `supabase_add_email.sql`
18. `supabase_major_and_calendar_color.sql`
19. `supabase_profile_guest_privacy_update.sql`
20. `supabase_user_deletion.sql`
21. `supabase_motion_submissions.sql`

## Demo Checklist

- Profile save needs `faculty` and `major` from `supabase_major_and_calendar_color.sql`.
- Admin user deletion needs the RPC from `supabase_user_deletion.sql`.
- Member motion approval needs `supabase_motion_submissions.sql`.
- Calendar events need `calendar_events`.
- Notifications need both notification SQL files.

