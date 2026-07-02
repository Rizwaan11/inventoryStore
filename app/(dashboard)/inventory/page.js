'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import MedicineModal from '@/components/MedicineModal';
import ConfirmModal from '@/components/ConfirmModal';
import { InventoryRowSkeleton } from '@/components/LoadingSkeleton';
import { toast } from '@/components/Toast';

const CATEGORIES = [
  'Antibiotics', 'Vaccines', 'Supplements', 'Deworming',
  'Antiseptics', 'Vitamins', 'Painkillers', 'Tools', 'Other',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getExpiryInfo(expiryDate) {
  if (!expiryDate) return null;
  const days = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  return { days, expired: days < 0, expiringSoon: days >= 0 && days <= 30 };
}

function getStockStatus(item) {
  if (item.quantity === 0) return 'out';
  if (item.quantity <= item.lowStockThreshold) return 'low';
  return 'in';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StockBadge({ item }) {
  const status = getStockStatus(item);
  const configs = {
    out: { label: 'Out of Stock', bg: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'rgba(239,68,68,0.2)' },
    low: { label: 'Low Stock', bg: 'rgba(234,179,8,0.1)', color: '#fbbf24', border: 'rgba(234,179,8,0.2)' },
    in:  { label: 'In Stock',  bg: 'rgba(34,197,94,0.1)',  color: '#4ade80', border: 'rgba(34,197,94,0.2)' },
  };
  const c = configs[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'currentColor' }} />
      {item.quantity} · {c.label}
    </span>
  );
}

function ExpiryBadge({ expiryDate }) {
  const info = getExpiryInfo(expiryDate);
  if (!info) return <span className="text-slate-700 text-xs">—</span>;

  if (info.expired) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
      ✕ Expired
    </span>
  );
  if (info.expiringSoon) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: 'rgba(234,179,8,0.1)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.2)' }}>
      ⚠ {info.days}d
    </span>
  );

  const d = new Date(expiryDate);
  return (
    <span className="text-slate-500 text-xs">
      {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
    </span>
  );
}

function FilterChip({ label, active, onClick, color }) {
  const activeStyle = color === 'yellow'
    ? { background: 'rgba(234,179,8,0.12)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.35)' }
    : color === 'red'
    ? { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)' }
    : color === 'green'
    ? { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.35)' }
    : color === 'orange'
    ? { background: 'rgba(249,115,22,0.12)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.35)' }
    : { background: 'rgba(37,99,235,0.15)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.4)' };

  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1.5"
      style={active ? activeStyle : { background: 'transparent', color: '#64748b', border: '1px solid #1e2d45' }}
    >
      {active && (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
      {label}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [allMedicines, setAllMedicines] = useState([]); // raw from server (name-filtered)
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Multi-select filter state — Sets for toggling
  const [activeStatuses, setActiveStatuses] = useState(new Set());       // 'in','low','out'
  const [activeCategories, setActiveCategories] = useState(new Set());   // category names
  const [activeExpiry, setActiveExpiry] = useState(new Set());           // 'expired','expiring'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [adjustingId, setAdjustingId] = useState(null);
  const debounceRef = useRef(null);

  // Server fetch — only name/formula search, everything else is client-side
  const fetchMedicines = useCallback(async (searchTerm) => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (searchTerm) query.append('search', searchTerm);
      const res = await fetch(`/api/medicines?${query.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAllMedicines(Array.isArray(data) ? data : []);
    } catch {
      toast('Failed to load inventory', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search input — 350ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchMedicines(search), 350);
    return () => clearTimeout(debounceRef.current);
  }, [search, fetchMedicines]);

  // ── Client-side multi-filter (instant, no network) ──
  const medicines = useMemo(() => {
    return allMedicines.filter((item) => {
      // Status filter
      if (activeStatuses.size > 0) {
        const s = getStockStatus(item);
        if (!activeStatuses.has(s)) return false;
      }
      // Category filter
      if (activeCategories.size > 0) {
        if (!activeCategories.has(item.category)) return false;
      }
      // Expiry filter
      if (activeExpiry.size > 0) {
        const info = getExpiryInfo(item.expiryDate);
        const matchExpired = activeExpiry.has('expired') && info?.expired;
        const matchExpiring = activeExpiry.has('expiring') && info?.expiringSoon;
        if (!matchExpired && !matchExpiring) return false;
      }
      return true;
    });
  }, [allMedicines, activeStatuses, activeCategories, activeExpiry]);

  // Toggle helpers — clicking an active filter removes it; clicking inactive adds it
  const toggleStatus = (s) => setActiveStatuses((prev) => {
    const next = new Set(prev);
    next.has(s) ? next.delete(s) : next.add(s);
    return next;
  });

  const toggleCategory = (c) => setActiveCategories((prev) => {
    const next = new Set(prev);
    next.has(c) ? next.delete(c) : next.add(c);
    return next;
  });

  const toggleExpiry = (e) => setActiveExpiry((prev) => {
    const next = new Set(prev);
    next.has(e) ? next.delete(e) : next.add(e);
    return next;
  });

  const clearAllFilters = () => {
    setActiveStatuses(new Set());
    setActiveCategories(new Set());
    setActiveExpiry(new Set());
  };

  const totalActiveFilters = activeStatuses.size + activeCategories.size + activeExpiry.size;

  // Quick stock adjust
  const handleQuickAdjust = async (item, delta) => {
    const newQty = Math.max(0, item.quantity + delta);
    setAdjustingId(item._id);
    try {
      const res = await fetch(`/api/medicines/${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      });
      if (!res.ok) throw new Error();
      setAllMedicines((prev) =>
        prev.map((m) => (m._id === item._id ? { ...m, quantity: newQty } : m))
      );
      toast(`Stock updated to ${newQty}`, 'success');
    } catch {
      toast('Failed to update stock', 'error');
    } finally {
      setAdjustingId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/medicines/${confirmDelete._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setAllMedicines((prev) => prev.filter((m) => m._id !== confirmDelete._id));
      toast(`"${confirmDelete.name}" deleted`, 'success');
      setConfirmDelete(null);
    } catch {
      toast('Failed to delete medicine', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openAddModal = () => { setSelectedMedicine(null); setIsModalOpen(true); };
  const openEditModal = (m) => { setSelectedMedicine(m); setIsModalOpen(true); };
  const handleModalSuccess = (saved, isEdit) => {
    setIsModalOpen(false);
    toast(isEdit ? `"${saved.name}" updated` : `"${saved.name}" added`, 'success');
    fetchMedicines(search);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Inventory</h1>
          <p className="text-slate-500 text-sm mt-1">
            {loading
              ? 'Loading...'
              : `${medicines.length} of ${allMedicines.length} item${allMedicines.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 self-start sm:self-auto"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Medicine
        </button>
      </div>

      {/* ── Search & Filters Panel ── */}
      <div className="rounded-2xl border p-4 mb-6 space-y-3" style={{ background: '#080f1a', borderColor: '#1e2d45' }}>
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or formula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: '#03050a', border: '1px solid #1e2d45', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = '#2563eb'}
            onBlur={e => e.target.style.borderColor = '#1e2d45'}
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter section label */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Filters</p>
          {totalActiveFilters > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear {totalActiveFilters} filter{totalActiveFilters !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Stock Status — multi-select toggleable chips */}
        <div>
          <p className="text-xs text-slate-600 mb-2">Stock Status</p>
          <div className="flex flex-wrap gap-2">
            <FilterChip label="In Stock"     active={activeStatuses.has('in')}  onClick={() => toggleStatus('in')}  color="green" />
            <FilterChip label="Low Stock"    active={activeStatuses.has('low')} onClick={() => toggleStatus('low')} color="yellow" />
            <FilterChip label="Out of Stock" active={activeStatuses.has('out')} onClick={() => toggleStatus('out')} color="red" />
          </div>
        </div>

        {/* Expiry — multi-select toggleable chips */}
        <div>
          <p className="text-xs text-slate-600 mb-2">Expiry</p>
          <div className="flex flex-wrap gap-2">
            <FilterChip label="Expiring Soon (≤30d)" active={activeExpiry.has('expiring')} onClick={() => toggleExpiry('expiring')} color="orange" />
            <FilterChip label="Already Expired"      active={activeExpiry.has('expired')}  onClick={() => toggleExpiry('expired')}  color="red" />
          </div>
        </div>

        {/* Category — multi-select toggleable chips */}
        <div>
          <p className="text-xs text-slate-600 mb-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <FilterChip key={c} label={c} active={activeCategories.has(c)} onClick={() => toggleCategory(c)} />
            ))}
          </div>
        </div>

        {/* Active filter summary */}
        {totalActiveFilters > 0 && (
          <div className="pt-1 text-xs text-slate-500">
            Showing {medicines.length} result{medicines.length !== 1 ? 's' : ''} matching your filters.
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: '#080f1a', borderColor: '#1e2d45' }}>
        {loading ? (
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid #1e2d45' }}>
              <tr>
                {['Name / Formula', 'Category', 'Stock', 'Expiry', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-4 md:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    i === 1 ? 'hidden md:table-cell' : i === 3 ? 'hidden sm:table-cell' : ''
                  }`} style={{ color: '#475569' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => <InventoryRowSkeleton key={i} />)}
            </tbody>
          </table>
        ) : medicines.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
              style={{ background: '#0d1829' }}>
              <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
              </svg>
            </div>
            <p className="text-white font-semibold">No medicines found</p>
            <p className="text-slate-500 text-sm mt-1">
              {search || totalActiveFilters > 0
                ? 'Try adjusting your search or filters.'
                : 'Add your first medicine to get started.'}
            </p>
            {!search && totalActiveFilters === 0 && (
              <button
                onClick={openAddModal}
                className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
              >
                Add First Medicine
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid #1e2d45' }}>
              <tr>
                <th className="px-3 md:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
                  Name / Formula
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: '#475569' }}>
                  Category
                </th>
                <th className="px-2 md:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
                  Stock
                </th>
                <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: '#475569' }}>
                  Expiry
                </th>
                <th className="px-2 md:px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((item, idx) => {
                const isAdjusting = adjustingId === item._id;
                const expiryInfo = getExpiryInfo(item.expiryDate);
                const rowHighlight = expiryInfo?.expired
                  ? 'rgba(239,68,68,0.03)'
                  : expiryInfo?.expiringSoon
                  ? 'rgba(234,179,8,0.03)'
                  : '';

                return (
                  <tr
                    key={item._id}
                    className="transition-colors duration-150"
                    style={{
                      borderTop: idx > 0 ? '1px solid #0d1829' : 'none',
                      background: rowHighlight,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
                    onMouseLeave={e => e.currentTarget.style.background = rowHighlight}
                  >
                    {/* Name + Formula */}
                    <td className="px-3 md:px-6 py-4">
                      <p className="text-white font-medium text-sm">{item.name}</p>
                      {item.formula && (
                        <p className="text-slate-500 text-xs mt-0.5 font-mono">{item.formula}</p>
                      )}
                      <p className="text-slate-600 text-xs mt-0.5 md:hidden">{item.category}</p>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-xs px-2 py-1 rounded-lg font-medium"
                        style={{ background: '#0d1829', color: '#94a3b8' }}>
                        {item.category}
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="px-2 md:px-6 py-4">
                      <StockBadge item={item} />
                      {item.location && (
                        <p className="text-slate-600 text-xs mt-1">📍 {item.location}</p>
                      )}
                      {/* Show expiry inline on small screens where the Expiry column is hidden */}
                      {item.expiryDate && (
                        <div className="mt-1 lg:hidden">
                          <ExpiryBadge expiryDate={item.expiryDate} />
                        </div>
                      )}
                    </td>

                    {/* Expiry — desktop only */}
                    <td className="px-4 md:px-6 py-4 hidden lg:table-cell">
                      <ExpiryBadge expiryDate={item.expiryDate} />
                    </td>

                    {/* Actions */}
                    <td className="px-2 md:px-6 py-3 md:py-4">
                      {/*
                        Mobile: 2×2 grid (−/+ on top row, edit/delete on bottom row)
                        Desktop: single row of 4 buttons
                      */}
                      <div className="flex flex-col items-end gap-1 md:flex-row md:items-center md:gap-1.5">
                        {/* Row 1 (mobile) / Left pair (desktop): quick adjust */}
                        <div className="flex gap-1 md:gap-1.5">
                          {/* −1 */}
                          <button
                            onClick={() => handleQuickAdjust(item, -1)}
                            disabled={item.quantity === 0 || isAdjusting}
                            title="Decrease stock by 1"
                            className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-xs md:text-sm font-bold transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}
                            onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                          >
                            −
                          </button>
                          {/* +1 */}
                          <button
                            onClick={() => handleQuickAdjust(item, 1)}
                            disabled={isAdjusting}
                            title="Increase stock by 1"
                            className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-xs md:text-sm font-bold transition-all duration-150"
                            style={{ background: 'rgba(34,197,94,0.08)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.15)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.18)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,197,94,0.08)'}
                          >
                            +
                          </button>
                        </div>
                        {/* Row 2 (mobile) / Right pair (desktop): edit & delete */}
                        <div className="flex gap-1 md:gap-1.5">
                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit"
                            className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                            style={{ background: 'rgba(37,99,235,0.08)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.15)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.18)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(37,99,235,0.08)'}
                          >
                            <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => setConfirmDelete(item)}
                            title="Delete"
                            className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                            style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                          >
                            <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <MedicineModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        medicine={selectedMedicine}
        onSuccess={handleModalSuccess}
      />
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Medicine"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
