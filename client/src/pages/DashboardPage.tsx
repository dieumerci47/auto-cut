import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import ClipCard from '@/components/clips/ClipCard';
import ProcessingStatus from '@/components/processing/ProcessingStatus';
import { useJobPolling, useFormatTime } from '@/hooks/useJobPolling';
import { startProcessing, downloadClip, type ClipSuggestion } from '@/services/api';
import {
  Play,
  Zap,
  Settings2,
  Layers,
  Sparkles,
  Video,
  Clock,
  Film,
  User,
  Eye,
} from 'lucide-react';

// ── Mock data for demo ──
const mockClips: ClipSuggestion[] = [
  {
    id: '1',
    title: 'Le moment clé qui change tout',
    hook: "Vous n'allez pas croire ce qui se passe ensuite...",
    startTime: 125,
    endTime: 178,
    duration: 53,
    score: 92,
    reason: 'Fort engagement émotionnel et révélation surprenante qui capte l\'attention',
    tags: ['hook', 'viral', 'surprise'],
  },
  {
    id: '2',
    title: 'L\'astuce que personne ne connaît',
    hook: 'Cette technique va changer ta façon de voir les choses',
    startTime: 342,
    endTime: 401,
    duration: 59,
    score: 85,
    reason: 'Contenu éducatif avec une punchline forte et un conseil actionnable',
    tags: ['éducatif', 'tips', 'valeur'],
  },
  {
    id: '3',
    title: 'La réaction hilarante',
    hook: 'Regardez sa réaction quand il découvre...',
    startTime: 567,
    endTime: 612,
    duration: 45,
    score: 78,
    reason: 'Moment de réaction authentique avec un fort potentiel de partage',
    tags: ['réaction', 'humour', 'relatable'],
  },
  {
    id: '4',
    title: 'Le débat qui divise',
    hook: 'Êtes-vous d\'accord avec ça ?',
    startTime: 890,
    endTime: 935,
    duration: 45,
    score: 71,
    reason: 'Sujet polarisant qui génère des commentaires et de l\'engagement',
    tags: ['débat', 'opinion', 'engagement'],
  },
  {
    id: '5',
    title: 'Le résumé percutant',
    hook: 'En résumé, voici les 3 points à retenir',
    startTime: 1200,
    endTime: 1248,
    duration: 48,
    score: 67,
    reason: 'Synthèse claire et concise idéale pour les formats courts',
    tags: ['résumé', 'valeur', 'clair'],
  },
];

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const initialUrl = searchParams.get('url') || '';
  const [url, setUrl] = useState(initialUrl);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [clipCount, setClipCount] = useState([5]);
  const [maxDuration, setMaxDuration] = useState([60]);
  const [showDemo, setShowDemo] = useState(false);
  const formatTime = useFormatTime();

  const { job } = useJobPolling(jobId);

  const handleProcess = useCallback(async () => {
    if (!url.trim()) return;

    setIsStarting(true);
    try {
      const result = await startProcessing(url, {
        clipCount: clipCount[0],
        maxDuration: maxDuration[0],
      });
      setJobId(result.jobId);
    } catch {
      // For demo: show mock results
      setShowDemo(true);
    } finally {
      setIsStarting(false);
    }
  }, [url, clipCount, maxDuration]);

  const handleDownloadClip = useCallback(async (clipId: string) => {
    if (!jobId) return;
    try {
      const blob = await downloadClip(jobId, clipId);
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `autocut-clip-${clipId}.mp4`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch {
      // Demo mode
    }
  }, [jobId]);

  const clips = job?.clips || (showDemo ? mockClips : []);
  const isProcessing = job && !['done', 'error'].includes(job.status);

  // Mock video info for demo
  const videoInfo = job?.videoInfo || (showDemo ? {
    title: 'Comment devenir mass développeur en 2026 – Guide complet',
    channel: 'Tech Academy FR',
    duration: 1847,
    viewCount: '234K',
    thumbnail: '',
  } : null);

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 md:px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 space-y-1 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.1s' }}>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Dashboard <span className="gradient-text">AutoCut</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          Colle un lien YouTube et laisse l'IA faire le travail.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* ── Main Content ── */}
        <div className="space-y-6">
          {/* URL Input */}
          <Card className="bg-white/[0.02] border-white/5 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.15s' }}>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                  <Input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-10 bg-white/[0.03] border-white/5 focus-visible:border-[oklch(0.65_0.25_300_/_0.5)] focus-visible:ring-[oklch(0.65_0.25_300_/_0.2)]"
                  />
                </div>
                <Button
                  onClick={handleProcess}
                  disabled={!url.trim() || isStarting || !!isProcessing}
                  className="bg-gradient-to-r from-[oklch(0.65_0.25_300)] to-[oklch(0.60_0.22_340)] text-white hover:opacity-90 disabled:opacity-40 shadow-lg shadow-[oklch(0.65_0.25_300_/_0.2)] min-w-[140px]"
                >
                  {isStarting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Lancement...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Générer les clips
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Video Info */}
          {videoInfo && (
            <Card className="bg-white/[0.02] border-white/5 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.2s' }}>
              <CardContent className="p-5">
                <div className="flex gap-4">
                  {/* Thumbnail placeholder */}
                  <div className="w-40 h-24 rounded-xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                    {videoInfo.thumbnail ? (
                      <img src={videoInfo.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Play className="w-8 h-8 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm line-clamp-2">{videoInfo.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {videoInfo.channel}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(videoInfo.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {videoInfo.viewCount} vues
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <Card className="bg-white/[0.02] border-white/5">
              <CardContent className="p-8">
                <ProcessingStatus
                  status={job.status}
                  progress={job.progress}
                  error={job.error}
                />
              </CardContent>
            </Card>
          )}

          {/* Clips Grid */}
          {clips.length > 0 && (
            <div className="space-y-4 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.25s' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-[oklch(0.65_0.25_300)]" />
                  <h2 className="text-lg font-semibold">Clips générés</h2>
                  <Badge variant="secondary" className="bg-white/5 border-white/10 text-xs">
                    {clips.length} clips
                  </Badge>
                </div>

                <Tabs defaultValue="grid" className="w-auto">
                  <TabsList className="h-8 bg-white/[0.03] border border-white/5">
                    <TabsTrigger value="grid" className="text-xs h-6 px-2 data-[state=active]:bg-white/10">
                      <Layers className="w-3 h-3" />
                    </TabsTrigger>
                    <TabsTrigger value="list" className="text-xs h-6 px-2 data-[state=active]:bg-white/10">
                      <Settings2 className="w-3 h-3" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {clips.map((clip, index) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    index={index}
                    onDownload={() => handleDownloadClip(clip.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isProcessing && clips.length === 0 && !videoInfo && (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.2s' }}>
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[oklch(0.65_0.25_300_/_0.1)] to-[oklch(0.60_0.22_340_/_0.05)] border border-white/5 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-[oklch(0.65_0.25_300_/_0.5)]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Prêt à découper</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Colle un lien YouTube ci-dessus pour commencer.
                L'IA analysera la vidéo et générera les meilleurs clips.
              </p>
            </div>
          )}
        </div>

        {/* ── Sidebar Settings ── */}
        <div className="space-y-4 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.3s' }}>
          <Card className="bg-white/[0.02] border-white/5 sticky top-20">
            <CardContent className="p-5 space-y-6">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[oklch(0.65_0.25_300)]" />
                <h3 className="font-semibold text-sm">Paramètres</h3>
              </div>

              <Separator className="bg-white/5" />

              {/* Clip count */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">Nombre de clips</label>
                  <Badge variant="secondary" className="bg-white/5 border-white/10 text-xs font-mono">
                    {clipCount[0]}
                  </Badge>
                </div>
                <Slider
                  value={clipCount}
                  onValueChange={setClipCount}
                  min={1}
                  max={15}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/50">
                  <span>1</span>
                  <span>15</span>
                </div>
              </div>

              {/* Max duration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">Durée max (sec)</label>
                  <Badge variant="secondary" className="bg-white/5 border-white/10 text-xs font-mono">
                    {maxDuration[0]}s
                  </Badge>
                </div>
                <Slider
                  value={maxDuration}
                  onValueChange={setMaxDuration}
                  min={15}
                  max={180}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/50">
                  <span>15s</span>
                  <span>180s</span>
                </div>
              </div>

              <Separator className="bg-white/5" />

              {/* Platform presets */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Plateforme cible</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'TikTok', duration: '60s', icon: '🎵' },
                    { name: 'Reels', duration: '90s', icon: '📸' },
                    { name: 'Shorts', duration: '60s', icon: '▶️' },
                    { name: 'Custom', duration: '∞', icon: '⚙️' },
                  ].map((platform) => (
                    <button
                      key={platform.name}
                      className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all text-left group"
                      onClick={() => {
                        if (platform.name === 'TikTok' || platform.name === 'Shorts') {
                          setMaxDuration([60]);
                        } else if (platform.name === 'Reels') {
                          setMaxDuration([90]);
                        }
                      }}
                    >
                      <div className="text-base mb-0.5">{platform.icon}</div>
                      <div className="text-xs font-medium">{platform.name}</div>
                      <div className="text-[10px] text-muted-foreground">{platform.duration}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-white/5" />

              {/* Quick tips */}
              <div className="p-3 rounded-xl bg-[oklch(0.65_0.25_300_/_0.05)] border border-[oklch(0.65_0.25_300_/_0.1)]">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[oklch(0.75_0.25_300)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-[oklch(0.80_0.18_300)]">Astuce</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Les vidéos avec des sous-titres donnent de meilleurs résultats car l'IA peut analyser le contenu textuel.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
