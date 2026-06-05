'use client';

import React from 'react';

export function MetricCardSkeleton() {
  return (
    <article className="metric-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="skeleton-pulse" style={{ height: '14px', width: '100px', borderRadius: '4px' }} />
      <div className="skeleton-pulse" style={{ height: '36px', width: '80px', borderRadius: '6px', margin: '8px 0 4px' }} />
      <div className="skeleton-pulse" style={{ height: '14px', width: '100%', borderRadius: '4px' }} />
    </article>
  );
}

export function PanelItemSkeleton({ showBadge = false }: { showBadge?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', width: '100%' }}>
      {showBadge && (
        <div className="skeleton-pulse" style={{ width: '48px', height: '30px', borderRadius: '999px', flexShrink: 0 }} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        <div className="skeleton-pulse" style={{ height: '16px', width: '70%', borderRadius: '4px' }} />
        <div className="skeleton-pulse" style={{ height: '12px', width: '40%', borderRadius: '4px' }} />
      </div>
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <section className="section active-section" style={{ display: 'block' }}>
      {/* Hero Panel Skeleton */}
      <div className="hero-panel" style={{ opacity: 0.85 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="skeleton-pulse" style={{ height: '14px', width: '140px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <div className="skeleton-pulse" style={{ height: '36px', width: '90%', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <div className="skeleton-pulse" style={{ height: '16px', width: '80%', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
        </div>
        <div className="hero-metric" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignSelf: 'stretch', justifyContent: 'center' }}>
          <div className="skeleton-pulse" style={{ height: '12px', width: '80px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <div className="skeleton-pulse" style={{ height: '24px', width: '100%', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <div className="skeleton-pulse" style={{ height: '12px', width: '120px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
        </div>
      </div>

      {/* Metric Grid Skeleton */}
      <div className="metric-grid" style={{ marginTop: '16px' }}>
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      {/* Two Column Panels Skeleton */}
      <div className="two-column" style={{ marginTop: '16px' }}>
        <article className="panel">
          <div className="panel-header" style={{ marginBottom: '18px' }}>
            <div className="skeleton-pulse" style={{ height: '20px', width: '140px', borderRadius: '4px' }} />
            <div className="skeleton-pulse" style={{ height: '32px', width: '80px', borderRadius: '6px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <PanelItemSkeleton showBadge={true} />
            <PanelItemSkeleton showBadge={true} />
            <PanelItemSkeleton showBadge={true} />
          </div>
        </article>

        <article className="panel">
          <div className="panel-header" style={{ marginBottom: '18px' }}>
            <div className="skeleton-pulse" style={{ height: '20px', width: '160px', borderRadius: '4px' }} />
            <div className="skeleton-pulse" style={{ height: '32px', width: '80px', borderRadius: '6px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <PanelItemSkeleton showBadge={true} />
            <PanelItemSkeleton showBadge={true} />
            <PanelItemSkeleton showBadge={true} />
          </div>
        </article>
      </div>
    </section>
  );
}
