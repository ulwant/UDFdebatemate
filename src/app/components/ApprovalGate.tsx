'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/lib/UserContext';

const PUBLIC_OR_ONBOARDING_ROUTES = ['/', '/login', '/my-profile'];
const GUEST_ROUTES = ['/timer', '/presensi', '/calendar', '/my-profile'];

export default function ApprovalGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useUser();

  const canManageApp = profile?.system_role === 'admin' || profile?.system_role === 'eb';
  const isApproved = profile?.approval_status === 'approved' || canManageApp;
  const isGuest = profile?.member_type === 'guest';
  const isAllowedRoute = PUBLIC_OR_ONBOARDING_ROUTES.some((route) => (
    route === '/' ? pathname === '/' : pathname.startsWith(route)
  ));
  const isGuestRoute = GUEST_ROUTES.some((route) => pathname.startsWith(route));

  useEffect(() => {
    if (loading || !profile) return;
    if (isApproved && isGuest && !isGuestRoute) {
      router.replace('/timer');
      return;
    }
    if (loading || !profile || isApproved || isAllowedRoute) return;
    router.replace('/my-profile');
  }, [isAllowedRoute, isApproved, isGuest, isGuestRoute, loading, profile, router]);

  if (!loading && profile && !isApproved && !isAllowedRoute) {
    return (
      <section className="section active-section" style={{ display: 'block' }}>
        <article className="panel" style={{ maxWidth: 640, margin: '3rem auto' }}>
          <p className="eyebrow">Account Waiting Approval</p>
          <h2>Akses fitur utama belum dibuka.</h2>
          <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
            EB/Admin perlu approve akunmu dulu. Kamu tetap bisa melengkapi profil dari My Account.
          </p>
          <button className="primary-button" type="button" onClick={() => router.push('/my-profile')}>
            Lengkapi Profil
          </button>
        </article>
      </section>
    );
  }

  return <>{children}</>;
}
