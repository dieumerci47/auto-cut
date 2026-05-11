import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Play, ChevronDown, ChevronUp } from 'lucide-react';
import ClipCard from '@/components/clips/ClipCard';

export default function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(searchParams.get('jobId'));
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchHistory() {
      setIsLoading(true);
      const { data: jobsData, error } = await supabase
        .from('jobs')
        .select(`
          id, video_url, title, thumbnail, status, created_at,
          clips (
            id, clip_index, title, hook, start_time, end_time, duration, score, reason, tags, s3_url
          )
        `)
        .eq('status', 'done')
        .order('created_at', { ascending: false });
        
      if (!error && jobsData) {
        setHistory(jobsData.map(j => ({
          jobId: j.id,
          videoInfo: { title: j.title, thumbnail: j.thumbnail, id: j.video_url.split('v=')[1] },
          clipCount: j.clips?.length || 0,
          clips: j.clips?.map((c: any) => ({
            id: String(c.clip_index),
            title: c.title,
            hook: c.hook,
            startTime: c.start_time,
            endTime: c.end_time,
            duration: c.duration,
            score: c.score,
            reason: c.reason,
            tags: c.tags,
            streamUrl: c.s3_url
          })).sort((a: any, b: any) => b.score - a.score) || [],
          createdAt: new Date(j.created_at).toLocaleDateString()
        })));
      }
      setIsLoading(false);
    }
    
    fetchHistory();
  }, []);

  const handleDownloadClip = async (url: string, id: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `clip_${id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(url, '_blank');
    }
  };

  const toggleExpand = (jobId: string) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
      setSearchParams({});
    } else {
      setExpandedJobId(jobId);
      setSearchParams({ jobId });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[oklch(0.65_0.25_300_/_0.2)] to-[oklch(0.60_0.22_340_/_0.1)] flex items-center justify-center">
          <Clock className="w-5 h-5 text-[oklch(0.65_0.25_300)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Historique de vos vidéos</h1>
          <p className="text-muted-foreground text-sm">Retrouvez tous vos clips générés via le cloud.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-[oklch(0.65_0.25_300)] border-t-transparent animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">Aucun historique disponible.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {history.map((hJob, idx) => (
            <Card 
              key={hJob.jobId || idx} 
              className={`bg-white/[0.02] border-white/5 transition-all duration-300 overflow-hidden ${expandedJobId === hJob.jobId ? 'ring-1 ring-[oklch(0.65_0.25_300_/_0.5)]' : 'hover:border-white/10'}`}
            >
              <CardContent 
                className="p-4 flex items-center justify-between gap-4 cursor-pointer group"
                onClick={() => toggleExpand(hJob.jobId)}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-24 h-14 rounded-lg bg-white/5 flex items-center justify-center shrink-0 overflow-hidden relative">
                    {hJob.videoInfo?.thumbnail ? (
                      <img src={hJob.videoInfo.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Play className="w-4 h-4 text-white/30" />
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-base line-clamp-1">{hJob.videoInfo?.title || 'Vidéo inconnue'}</h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{hJob.clipCount} clips générés</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span>{hJob.createdAt}</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-muted-foreground">
                  {expandedJobId === hJob.jobId ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </CardContent>
              
              {/* Expanded Clips Section */}
              <div 
                className={`transition-all duration-500 ease-in-out ${expandedJobId === hJob.jobId ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="p-6 border-t border-white/5 bg-black/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hJob.clips?.map((clip: any, index: number) => (
                      <ClipCard
                        key={clip.id}
                        clip={clip}
                        index={index}
                        onDownload={() => handleDownloadClip(clip.streamUrl, clip.id)}
                        streamUrl={clip.streamUrl}
                      />
                    ))}
                    {(!hJob.clips || hJob.clips.length === 0) && (
                      <p className="text-muted-foreground text-sm col-span-full">Aucun clip trouvé pour cette vidéo.</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
