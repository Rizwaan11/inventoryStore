export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl p-6 border" style={{ background: '#080f1a', borderColor: '#1e2d45' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="skeleton h-4 w-24 rounded" />
      </div>
      <div className="skeleton h-9 w-16 rounded" />
      <div className="skeleton h-3 w-20 rounded mt-2" />
    </div>
  );
}

export function AlertItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 md:p-6 border-b" style={{ borderColor: '#1e2d45' }}>
      <div className="flex items-center gap-4">
        <div className="skeleton w-10 h-10 rounded-full" />
        <div>
          <div className="skeleton h-4 w-36 rounded mb-2" />
          <div className="skeleton h-3 w-24 rounded" />
        </div>
      </div>
      <div className="skeleton h-6 w-16 rounded" />
    </div>
  );
}

export function InventoryRowSkeleton() {
  return (
    <tr>
      <td className="px-4 md:px-6 py-4">
        <div className="skeleton h-4 w-36 rounded mb-2" />
        <div className="skeleton h-3 w-20 rounded md:hidden" />
      </td>
      <td className="px-6 py-4 hidden md:table-cell">
        <div className="skeleton h-4 w-24 rounded" />
      </td>
      <td className="px-4 md:px-6 py-4">
        <div className="skeleton h-6 w-20 rounded-full" />
      </td>
      <td className="px-6 py-4 hidden lg:table-cell">
        <div className="skeleton h-4 w-16 rounded" />
      </td>
      <td className="px-4 md:px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <div className="skeleton w-7 h-7 rounded-lg" />
          <div className="skeleton w-7 h-7 rounded-lg" />
          <div className="skeleton w-7 h-7 rounded-lg" />
          <div className="skeleton w-7 h-7 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}
