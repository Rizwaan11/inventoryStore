import Sidebar from '@/components/Sidebar';
import ToastProvider from '@/components/Toast';

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#03050a' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>
      <ToastProvider />
    </div>
  );
}
