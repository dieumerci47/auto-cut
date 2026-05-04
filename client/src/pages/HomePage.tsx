import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Scissors,
  Sparkles,
  Zap,
  ArrowRight,
  Play,
  Clock,
  Brain,
  Download,
  Video,
} from 'lucide-react';

const features = [
  {
    icon: Video,
    title: 'Colle ton lien',
    description: "Colle simplement l'URL d'une vidéo YouTube longue.",
    color: 'from-red-500 to-rose-600',
  },
  {
    icon: Brain,
    title: "L'IA analyse",
    description: 'Gemini AI identifie les meilleurs moments et les hooks viraux.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: Scissors,
    title: 'Découpage auto',
    description: 'FFmpeg découpe les clips au format vertical 9:16 pour TikTok.',
    color: 'from-cyan-500 to-blue-600',
  },
  {
    icon: Download,
    title: 'Télécharge & Poste',
    description: 'Télécharge tes clips ou publie directement sur TikTok.',
    color: 'from-emerald-500 to-green-600',
  },
];

const stats = [
  { value: '9:16', label: 'Format TikTok' },
  { value: 'IA', label: 'Powered by Gemini' },
  { value: '< 60s', label: 'Clips optimisés' },
  { value: '∞', label: 'Vidéos illimitées' },
];

export default function HomePage() {
  const [url, setUrl] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      navigate(`/dashboard?url=${encodeURIComponent(url.trim())}`);
    }
  };

  const isValidYouTubeUrl = (input: string) => {
    return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/).+/.test(input);
  };

  return (
    <div className="relative">
      {/* ── Hero Section ── */}
      <section className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 py-20">
        {/* Badge */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <Badge
            variant="secondary"
            className="mb-6 py-1.5 px-4 text-sm bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[oklch(0.75_0.25_300)]" />
            Propulsé par Gemini AI
          </Badge>
        </div>

        {/* Heading */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-center max-w-5xl leading-[1.05] tracking-tight">
            Transforme tes vidéos
            <br />
            <span className="gradient-text">en clips viraux</span>
          </h1>
        </div>

        {/* Subtitle */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground text-center max-w-2xl leading-relaxed">
            Colle un lien YouTube, et notre IA découpe automatiquement les
            meilleurs moments en clips prêts pour TikTok, Reels et Shorts.
          </p>
        </div>

        {/* URL Input */}
        <div className="animate-fade-in-up w-full max-w-2xl mt-10" style={{ animationDelay: '0.4s', opacity: 0 }}>
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[oklch(0.65_0.25_300)] via-[oklch(0.60_0.22_340)] to-[oklch(0.70_0.20_250)] rounded-2xl opacity-20 group-hover:opacity-30 blur-lg transition-opacity duration-500" />
            <div className="relative flex items-center gap-2 bg-[oklch(0.13_0.008_270)] border border-white/10 rounded-xl p-2 shadow-2xl">
              <div className="flex items-center gap-2 pl-3 text-muted-foreground">
                <Play className="w-4 h-4" />
              </div>
              <Input
                type="url"
                placeholder="Colle ton lien YouTube ici..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 border-0 bg-transparent text-base placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:outline-none"
              />
              <Button
                type="submit"
                disabled={!url.trim()}
                className="bg-gradient-to-r from-[oklch(0.65_0.25_300)] to-[oklch(0.60_0.22_340)] text-white px-6 h-10 rounded-lg hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[oklch(0.65_0.25_300_/_0.2)]"
              >
                <Zap className="w-4 h-4 mr-1.5" />
                Générer
              </Button>
            </div>
            {url && !isValidYouTubeUrl(url) && (
              <p className="absolute -bottom-7 left-4 text-xs text-destructive">
                Entre une URL YouTube valide
              </p>
            )}
          </form>
        </div>

        {/* Stats */}
        <div className="animate-fade-in-up mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-16" style={{ animationDelay: '0.5s', opacity: 0 }}>
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold gradient-text">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 py-1 px-3 text-xs bg-white/5 border border-white/10">
              <Clock className="w-3 h-3 mr-1" />
              En 4 étapes
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Comment ça <span className="gradient-text">marche</span> ?
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              De la vidéo longue aux clips viraux en quelques minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Step number */}
                <div className="absolute top-4 right-4 text-xs font-mono text-muted-foreground/40">
                  0{index + 1}
                </div>

                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                {/* Arrow */}
                {index < features.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-white/10">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-12 rounded-3xl overflow-hidden">
            {/* BG gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.65_0.25_300_/_0.08)] to-[oklch(0.60_0.22_340_/_0.05)] rounded-3xl" />
            <div className="absolute inset-0 border border-white/5 rounded-3xl" />

            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                Prêt à créer des clips <span className="gradient-text">viraux</span> ?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Commence gratuitement. Aucune carte de crédit requise.
              </p>
              <Button
                size="lg"
                className="bg-gradient-to-r from-[oklch(0.65_0.25_300)] to-[oklch(0.60_0.22_340)] text-white px-8 hover:opacity-90 transition-opacity shadow-lg shadow-[oklch(0.65_0.25_300_/_0.25)] text-base"
                onClick={() => navigate('/dashboard')}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Lancer AutoCut
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Scissors className="w-4 h-4 text-[oklch(0.65_0.25_300)]" />
            <span>AutoCut — Powered by Gemini AI & FFmpeg</span>
          </div>
          <div className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} AutoCut. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
