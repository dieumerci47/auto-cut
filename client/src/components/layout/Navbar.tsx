import { Scissors, Code2, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const navLinks = [
  { label: 'Accueil', path: '/' },
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Historique', path: '/history' },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[oklch(0.65_0.25_300)] to-[oklch(0.60_0.22_340)] flex items-center justify-center shadow-lg group-hover:shadow-[0_0_20px_oklch(0.65_0.25_300_/_0.3)] transition-shadow duration-300">
              <Scissors className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[oklch(0.09_0.005_270)] animate-pulse" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Auto<span className="gradient-text">Cut</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === link.path
                  ? 'text-white bg-white/8'
                  : 'text-muted-foreground hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
          >
            <Code2 className="w-4 h-4" />
          </a>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 h-8 px-3 rounded-md text-sm font-medium bg-gradient-to-r from-[oklch(0.65_0.25_300)] to-[oklch(0.60_0.22_340)] text-white hover:opacity-90 transition-opacity shadow-lg shadow-[oklch(0.65_0.25_300_/_0.2)]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Commencer
          </Link>
        </div>
      </div>
    </header>
  );
}
