'use client';
import { useState, useEffect } from 'react';

const CATEGORIES = [
  'Antibiotics', 'Vaccines', 'Supplements', 'Deworming',
  'Antiseptics', 'Vitamins', 'Painkillers', 'Tools', 'Other',
];

const INITIAL_FORM = {
  name: '',
  formula: '',
  category: '',
  quantity: '',
  lowStockThreshold: '',
  location: '',
  expiryDate: '',
};

export default function MedicineModal({ isOpen, onClose, medicine, onSuccess }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!medicine;

  useEffect(() => {
    if (isOpen) {
      if (medicine) {
        setFormData({
          name: medicine.name || '',
          formula: medicine.formula || '',
          category: medicine.category || '',
          quantity: String(medicine.quantity ?? ''),
          lowStockThreshold: String(medicine.lowStockThreshold ?? ''),
          location: medicine.location || '',
          expiryDate: medicine.expiryDate
            ? new Date(medicine.expiryDate).toISOString().split('T')[0]
            : '',
        });
      } else {
        setFormData(INITIAL_FORM);
      }
      setError('');
    }
  }, [medicine, isOpen]);

  if (!isOpen) return null;

  const set = (key) => (e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const qty = parseInt(formData.quantity, 10);
    const threshold = parseInt(formData.lowStockThreshold, 10);

    if (isNaN(qty) || qty < 0) return setError('Quantity must be 0 or greater.');
    if (isNaN(threshold) || threshold < 0) return setError('Low stock alert threshold must be 0 or greater.');

    setLoading(true);

    const payload = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      quantity: qty,
      lowStockThreshold: threshold,
      ...(formData.formula.trim() ? { formula: formData.formula.trim() } : { formula: null }),
      ...(formData.location.trim() ? { location: formData.location.trim() } : { location: null }),
      ...(formData.expiryDate ? { expiryDate: formData.expiryDate } : { expiryDate: null }),
    };

    try {
      const url = isEdit ? `/api/medicines/${medicine._id}` : '/api/medicines';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Failed to save.');
      onSuccess(data, isEdit);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: '#03050a',
    border: '1px solid #1e2d45',
    borderRadius: '12px',
    color: '#f1f5f9',
    padding: '10px 14px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.15s',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '6px',
  };

  const onFocus = (e) => (e.target.style.borderColor = '#2563eb');
  const onBlur = (e) => (e.target.style.borderColor = '#1e2d45');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(3,5,10,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="modal-enter w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border overflow-hidden"
        style={{
          background: '#080f1a',
          borderColor: '#1e2d45',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle bar */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: '#1e2d45' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#1e2d45' }}>
          <div>
            <h2 className="text-white font-bold text-lg">{isEdit ? 'Edit Medicine' : 'Add New Medicine'}</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              {isEdit ? 'Update medicine details' : 'Fill in the details below'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition-colors flex-shrink-0"
            style={{ background: '#0d1829' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="overflow-y-auto flex-1">
          <form id="medicine-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {error && (
              <div className="flex items-start gap-2 text-red-400 text-sm px-3 py-3 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label style={labelStyle}>
                Medicine Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={set('name')}
                style={inputStyle}
                placeholder="e.g. Amoxicillin 250mg"
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {/* Formula */}
            <div>
              <label style={labelStyle}>
                Formula / Active Ingredient{' '}
                <span className="text-slate-600 normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.formula}
                onChange={set('formula')}
                style={inputStyle}
                placeholder="e.g. Amoxicillin Trihydrate, Penicillin G"
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {/* Category */}
            <div>
              <label style={labelStyle}>
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.category}
                onChange={set('category')}
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={onFocus}
                onBlur={onBlur}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Quantity & Threshold */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={formData.quantity}
                  onChange={set('quantity')}
                  style={inputStyle}
                  placeholder="0"
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Low Alert At <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={formData.lowStockThreshold}
                  onChange={set('lowStockThreshold')}
                  style={inputStyle}
                  placeholder="5"
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
            </div>
            <p className="text-slate-600 text-xs -mt-2">
              Alert triggers when stock falls to or below the threshold.
            </p>

            {/* Expiry Date */}
            <div>
              <label style={labelStyle}>
                Expiry Date{' '}
                <span className="text-slate-600 normal-case font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={set('expiryDate')}
                style={{
                  ...inputStyle,
                  colorScheme: 'dark',
                }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              {formData.expiryDate && (() => {
                const days = Math.ceil(
                  (new Date(formData.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
                );
                if (days < 0) return (
                  <p className="text-red-400 text-xs mt-1.5">⚠ This medicine has already expired.</p>
                );
                if (days <= 30) return (
                  <p className="text-yellow-400 text-xs mt-1.5">⚠ Expires in {days} day{days !== 1 ? 's' : ''}.</p>
                );
                return (
                  <p className="text-green-400 text-xs mt-1.5">✓ Expires in {days} days.</p>
                );
              })()}
            </div>

            {/* Location */}
            <div>
              <label style={labelStyle}>
                Shelf / Location{' '}
                <span className="text-slate-600 normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={set('location')}
                style={inputStyle}
                placeholder="e.g. A2, Shelf 3, Cabinet B"
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
          </form>
        </div>

        {/* Sticky Footer Actions */}
        <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: '#1e2d45', background: '#080f1a' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 transition-all duration-200 disabled:opacity-50"
            style={{ background: '#0d1829', border: '1px solid #1e2d45' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="medicine-form"
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            ) : isEdit ? 'Save Changes' : 'Add Medicine'}
          </button>
        </div>
      </div>
    </div>
  );
}
