import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20 animate-float"
          style={{
            background: 'radial-gradient(circle, oklch(0.65 0.25 300 / 0.4) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute top-1/3 -right-20 w-[400px] h-[400px] rounded-full opacity-15 animate-float"
          style={{
            background: 'radial-gradient(circle, oklch(0.60 0.22 340 / 0.4) 0%, transparent 70%)',
            animationDelay: '-3s',
          }}
        />
        <div
          className="absolute -bottom-20 left-1/3 w-[350px] h-[350px] rounded-full opacity-10 animate-float"
          style={{
            background: 'radial-gradient(circle, oklch(0.70 0.20 250 / 0.4) 0%, transparent 70%)',
            animationDelay: '-5s',
          }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(oklch(1 0 0 / 0.1) 1px, transparent 1px),
              linear-gradient(90deg, oklch(1 0 0 / 0.1) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <Navbar />

      <main className="relative pt-16">
        <Outlet />
      </main>
    </div>
  );
}
