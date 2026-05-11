import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import ClipCard from '@/components/clips/ClipCard';
import ProcessingStatus from '@/components/processing/ProcessingStatus';
import { useJobPolling, useFormatTime } from '@/hooks/useJobPolling';
import { startProcessing, retryProcessing, downloadClip, exportCookies, type ClipSuggestion } from '@/services/api';
import { supabase } from '../services/supabase';
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
  AlertTriangle,
  RotateCcw,
  Cookie,
} from 'lucide-react';

// Platform presets
const PLATFORMS = [
  { name: 'TikTok', duration: 60, label: '60s', icon: '\uD83C\uDFB5' },
  { name: 'Reels', duration: 90, label: '90s', icon: '\uD83D\uDCF8' },
  { name: 'Shorts', duration: 60, label: '60s', icon: '\u25B6\uFE0F' },
  { name: 'Custom', duration: 0, label: '\u221E', icon: '\u2699\uFE0F' },
] as const;

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const initialUrl = searchParams.get('url') || '';
  const [url, setUrl] = useState(initialUrl);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [clipCount, setClipCount] = useState(5);
  const [maxDuration, setMaxDuration] = useState(60);
  const [selectedPlatform, setSelectedPlatform] = useState('TikTok');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const formatTime = useFormatTime();

  const { job, error: pollingError } = useJobPolling(jobId);

  // Load history from Supabase
  useEffect(() => {
    async function fetchHistory() {
      const { data: jobsData, error } = await supabase
        .from('jobs')
        .select(`
          id, video_url, title, thumbnail, status, created_at,
          clips (
            id, clip_index, title, hook, start_time, end_time, duration, score, reason, tags, s3_url
          )
        `)
        .eq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) {
        console.error('Failed to load history', error);
        return;
      }
      
      if (jobsData) {
        setHistory(jobsData.map(j => ({
          jobId: j.id,
          videoInfo: { title: j.title, thumbnail: j.thumbnail, id: j.video_url.split('v=')[1] },
          clips: j.clips.map((c: any) => ({
            ...c,
            id: String(c.clip_index),
            streamUrl: c.s3_url
          }))
        })));
      }
    }
    
    if (!jobId) {
      fetchHistory();
    }
  }, [jobId]);

  // Show error from polling
  useEffect(() => {
    if (job?.status === 'error') {
      setErrorMessage(job.error || 'Une erreur est survenue pendant le traitement.');
    }
    if (pollingError) {
      setErrorMessage(pollingError);
    }
  }, [job, pollingError]);

  const handleProcess = useCallback(async () => {
    if (!url.trim()) return;

    setIsStarting(true);
    setErrorMessage(null);
    try {
      const result = await startProcessing(url, {
        clipCount,
        maxDuration,
      });
      setJobId(result.jobId);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Impossible de lancer le traitement. Verifie que le serveur backend tourne."
      );
    } finally {
      setIsStarting(false);
    }
  }, [url, clipCount, maxDuration]);

  const handleRetry = useCallback(async () => {
    if (!jobId) {
      handleProcess();
      return;
    }
    
    setIsStarting(true);
    setErrorMessage(null);
    try {
      await retryProcessing(jobId);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Impossible de reprendre le traitement."
      );
    } finally {
      setIsStarting(false);
    }
  }, [jobId, handleProcess]);

  const handleReset = useCallback(() => {
    setJobId(null);
    setErrorMessage(null);
    setUrl('');
  }, []);

  const handlePlatformSelect = useCallback((platform: typeof PLATFORMS[number]) => {
    setSelectedPlatform(platform.name);
    if (platform.duration > 0) {
      setMaxDuration(platform.duration);
    }
  }, []);

  const handleDownloadClip = useCallback(async (clipUrl: string, clipId: string) => {
    if (!clipUrl) return;
    try {
      const response = await fetch(clipUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `autocut-clip-${clipId}.mp4`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch {
      // Silently fail
    }
  }, []);

  const handleExportCookies = useCallback(async () => {
    setIsExporting(true);
    setErrorMessage(null);
    try {
      const res = await exportCookies();
      if (res.success) {
        setErrorMessage("✅ Cookies importés ! Tu peux maintenant réessayer de générer les clips.");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Échec de l'import des cookies. Assure-toi que Google Chrome est FERMÉ."
      );
    } finally {
      setIsExporting(false);
    }
  }, []);

  const clips = job?.clips || [];
  const isProcessing = job != null && !['done', 'error'].includes(job.status);
  const isDone = job?.status === 'done';
  const hasError = job?.status === 'error' || !!errorMessage;

  const videoInfo = job?.videoInfo || null;

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 md:px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.1s' }}>
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Dashboard <span className="gradient-text">AutoCut</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Colle un lien YouTube et laisse l&apos;IA faire le travail.
          </p>
        </div>
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
                      Generer les clips
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {hasError && (
            <Card className="bg-red-500/5 border-red-500/20 animate-fade-in-up">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-red-300">Erreur de traitement</h3>
                    <p className="text-xs text-red-400/80 mt-1 leading-relaxed">
                      {errorMessage || job?.error || "Une erreur inconnue est survenue."}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 text-red-300 hover:text-red-200 hover:bg-red-500/10 gap-2"
                      onClick={handleRetry}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reprendre l'analyse
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 ml-2 text-red-300 hover:text-red-200 hover:bg-red-500/10 gap-2"
                      onClick={handleReset}
                    >
                      Nouveau lien
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 ml-2 border-red-500/20 text-red-300 hover:bg-red-500/10 gap-2"
                      onClick={handleExportCookies}
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <div className="w-3.5 h-3.5 border-2 border-red-300/30 border-t-red-300 rounded-full animate-spin" />
                      ) : (
                        <Cookie className="w-3.5 h-3.5" />
                      )}
                      Importer Cookies Chrome
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video Info */}
          {videoInfo && (
            <Card className="bg-white/[0.02] border-white/5 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.2s' }}>
              <CardContent className="p-5">
                <div className="flex gap-4">
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
          {isProcessing && job && (
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
          {clips.length > 0 && isDone && (
            <div className="space-y-4 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.25s' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-[oklch(0.65_0.25_300)]" />
                  <h2 className="text-lg font-semibold">Clips generes</h2>
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
                    onDownload={() => handleDownloadClip(clip.streamUrl, clip.id)}
                    streamUrl={clip.streamUrl || undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isProcessing && clips.length === 0 && !videoInfo && !hasError && (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.2s' }}>
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[oklch(0.65_0.25_300_/_0.1)] to-[oklch(0.60_0.22_340_/_0.05)] border border-white/5 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-[oklch(0.65_0.25_300_/_0.5)]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Pret a decouper</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Colle un lien YouTube ci-dessus pour commencer.
                L&apos;IA analysera la video et generera les meilleurs clips.
              </p>
            </div>
          )}

          {/* History Section */}
          {!isProcessing && !videoInfo && history.length > 0 && (
            <div className="space-y-4 animate-fade-in-up mt-8" style={{ opacity: 0, animationDelay: '0.3s' }}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Historique récent</h2>
              </div>
              <div className="space-y-4">
                {history.slice(0, 3).map((hJob, idx) => (
                  <Card key={hJob.jobId || idx} className="bg-white/[0.02] border-white/5 hover:border-white/10 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-16 h-10 rounded bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                            {hJob.videoInfo?.thumbnail ? (
                              <img src={hJob.videoInfo.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Play className="w-4 h-4 text-white/30" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-medium text-sm line-clamp-1">{hJob.videoInfo?.title || 'Video inconnue'}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{hJob.clips?.length || 0} clips generes</p>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            window.location.href = `/history?jobId=${hJob.jobId}`;
                          }}
                        >
                          Reprendre
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {history.length > 3 && (
                <div className="mt-4 flex justify-center">
                  <Button variant="ghost" className="text-sm text-muted-foreground hover:text-white" onClick={() => window.location.href = '/history'}>
                    Voir tout l'historique
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar Settings ── */}
        <div className="space-y-4 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.3s' }}>
          <Card className="bg-white/[0.02] border-white/5 sticky top-20">
            <CardContent className="p-5 space-y-6">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[oklch(0.65_0.25_300)]" />
                <h3 className="font-semibold text-sm">Parametres</h3>
              </div>

              <Separator className="bg-white/5" />

              {/* Clip count */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">Nombre de clips</label>
                  <Badge variant="secondary" className="bg-white/5 border-white/10 text-xs font-mono">
                    {clipCount}
                  </Badge>
                </div>
                <input
                  type="range"
                  min={1}
                  max={15}
                  step={1}
                  value={clipCount}
                  onChange={(e) => setClipCount(Number(e.target.value))}
                  className="w-full h-1 rounded-full appearance-none cursor-pointer bg-white/10 accent-[oklch(0.65_0.25_300)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[oklch(0.65_0.25_300)] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/50">
                  <span>1</span>
                  <span>15</span>
                </div>
              </div>

              {/* Max duration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">Duree max (sec)</label>
                  <Badge variant="secondary" className="bg-white/5 border-white/10 text-xs font-mono">
                    {maxDuration}s
                  </Badge>
                </div>
                <input
                  type="range"
                  min={15}
                  max={180}
                  step={5}
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(Number(e.target.value))}
                  className="w-full h-1 rounded-full appearance-none cursor-pointer bg-white/10 accent-[oklch(0.65_0.25_300)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[oklch(0.65_0.25_300)] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
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
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.name}
                      className={`p-2.5 rounded-xl border transition-all text-left group ${
                        selectedPlatform === platform.name
                          ? 'bg-[oklch(0.65_0.25_300_/_0.1)] border-[oklch(0.65_0.25_300_/_0.3)] ring-1 ring-[oklch(0.65_0.25_300_/_0.2)]'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                      }`}
                      onClick={() => handlePlatformSelect(platform)}
                    >
                      <div className="text-base mb-0.5">{platform.icon}</div>
                      <div className={`text-xs font-medium ${selectedPlatform === platform.name ? 'text-[oklch(0.80_0.18_300)]' : ''}`}>
                        {platform.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{platform.label}</div>
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
                      Les videos avec des sous-titres donnent de meilleurs resultats car l&apos;IA peut analyser le contenu textuel.
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
