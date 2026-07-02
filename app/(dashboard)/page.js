'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { StatCardSkeleton, AlertItemSkeleton } from '@/components/LoadingSkeleton';

function getExpiryInfo(expiryDate) {
  if (!expiryDate) return null;
  const days = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  return { days, expired: days < 0, expiringSoon: days >= 0 && days <= 30 };
}

function StatCard({ icon, label, value, color, bgColor, borderColor, subtitle }) {
  return (
    <div className="rounded-2xl p-5 border transition-all duration-200"
      style={{ background: '#080f1a', borderColor: borderColor || '#1e2d45' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: bgColor }}>
          {icon}
        </div>
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">{label}</span>
      </div>
      <p className="text-4xl font-bold" style={{ color }}>{value}</p>
      {subtitle && <p className="text-slate-600 text-xs mt-1">{subtitle}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/medicines');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMedicines(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Computed stats
  const stats = useMemo(() => {
    const outOfStock   = medicines.filter((m) => m.quantity === 0);
    const lowStock     = medicines.filter((m) => m.quantity > 0 && m.quantity <= m.lowStockThreshold);
    const expiringSoon = medicines.filter((m) => {
      const info = getExpiryInfo(m.expiryDate);
      return info && (info.expired || info.expiringSoon);
    });
    const alertItems = [
      ...outOfStock.map((m) => ({ ...m, alertType: 'out' })),
      ...lowStock.map((m) => ({ ...m, alertType: 'low' })),
    ].sort((a, b) => a.quantity - b.quantity);

    return { outOfStock, lowStock, expiringSoon, alertItems };
  }, [medicines]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">{today}</p>
        </div>
        <Link
          href="/inventory"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 self-start sm:self-auto"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Medicine
        </Link>
      </div>

      {/* DB Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6 text-sm text-red-400"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Database connection error. Check your MongoDB URI in .env.local.
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {loading ? (
          <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
        ) : (
          <>
            <StatCard
              label="Total Items"
              value={medicines.length}
              color="#60a5fa"
              bgColor="rgba(37,99,235,0.12)"
              subtitle="in stock"
              icon={<svg className="w-5 h-5" style={{ color: '#60a5fa' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>}
            />
            <StatCard
              label="Low Stock"
              value={stats.lowStock.length}
              color="#fbbf24"
              bgColor="rgba(234,179,8,0.1)"
              borderColor={stats.lowStock.length > 0 ? 'rgba(234,179,8,0.2)' : '#1e2d45'}
              subtitle="need reorder"
              icon={<svg className="w-5 h-5" style={{ color: '#fbbf24' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
            />
            <StatCard
              label="Out of Stock"
              value={stats.outOfStock.length}
              color="#f87171"
              bgColor="rgba(239,68,68,0.1)"
              borderColor={stats.outOfStock.length > 0 ? 'rgba(239,68,68,0.2)' : '#1e2d45'}
              subtitle="empty"
              icon={<svg className="w-5 h-5" style={{ color: '#f87171' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
            />
            <StatCard
              label="Expiring Soon"
              value={stats.expiringSoon.length}
              color="#fb923c"
              bgColor="rgba(249,115,22,0.1)"
              borderColor={stats.expiringSoon.length > 0 ? 'rgba(249,115,22,0.2)' : '#1e2d45'}
              subtitle="within 30 days"
              icon={<svg className="w-5 h-5" style={{ color: '#fb923c' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM12 15h.008v.008H12V15zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>}
            />
          </>
        )}
      </div>

      {/* ── Stock Alerts Panel ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-white">Stock Alerts</h2>
        {!loading && stats.alertItems.length > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            {stats.alertItems.length} item{stats.alertItems.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="rounded-2xl border overflow-hidden mb-6" style={{ background: '#080f1a', borderColor: '#1e2d45' }}>
        {loading ? (
          <><AlertItemSkeleton /><AlertItemSkeleton /><AlertItemSkeleton /></>
        ) : stats.alertItems.length === 0 ? (
          <div className="py-10 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
              style={{ background: 'rgba(34,197,94,0.1)' }}>
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-white font-semibold">All stock levels are healthy!</p>
            <p className="text-slate-500 text-sm mt-1">No medicines need restocking right now.</p>
          </div>
        ) : (
          <ul>
            {stats.alertItems.map((item, idx) => {
              const isOut = item.alertType === 'out';
              return (
                <li key={item._id} className="flex items-center justify-between px-4 md:px-6 py-4 transition-colors"
                  style={{ borderTop: idx > 0 ? '1px solid #0d1829' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isOut ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)' }}>
                      {isOut
                        ? <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        : <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm truncate">{item.name}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {item.category}
                        {item.formula && <span className="text-slate-600"> · {item.formula}</span>}
                        {item.location && <span> · 📍{item.location}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <span className="text-lg font-bold" style={{ color: isOut ? '#f87171' : '#fbbf24' }}>
                      {item.quantity}
                    </span>
                    <p className="text-slate-600 text-xs">/ {item.lowStockThreshold} min</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Expiry Panel ── */}
      {(loading || stats.expiringSoon.length > 0) && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Expiry Watch</h2>
            {!loading && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(249,115,22,0.1)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.2)' }}>
                {stats.expiringSoon.length} item{stats.expiringSoon.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="rounded-2xl border overflow-hidden" style={{ background: '#080f1a', borderColor: '#1e2d45' }}>
            {loading ? (
              <><AlertItemSkeleton /><AlertItemSkeleton /></>
            ) : (
              <ul>
                {stats.expiringSoon.map((item, idx) => {
                  const info = getExpiryInfo(item.expiryDate);
                  const isExpired = info?.expired;
                  return (
                    <li key={item._id}
                      className="flex items-center justify-between px-4 md:px-6 py-4 transition-colors"
                      style={{ borderTop: idx > 0 ? '1px solid #0d1829' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: isExpired ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.1)' }}>
                          <svg className="w-4 h-4" style={{ color: isExpired ? '#f87171' : '#fb923c' }}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium text-sm truncate">{item.name}</p>
                          <p className="text-slate-500 text-xs mt-0.5">
                            {item.category}
                            {item.formula && <span className="text-slate-600"> · {item.formula}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        {isExpired ? (
                          <span className="text-sm font-bold text-red-400">Expired</span>
                        ) : (
                          <span className="text-sm font-bold text-orange-400">{info.days}d left</span>
                        )}
                        <p className="text-slate-600 text-xs mt-0.5">
                          {new Date(item.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
