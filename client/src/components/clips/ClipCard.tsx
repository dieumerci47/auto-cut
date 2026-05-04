import { useFormatTime } from '@/hooks/useJobPolling';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Play, Star, Tag, Clock } from 'lucide-react';
import type { ClipSuggestion } from '@/services/api';

interface ClipCardProps {
  clip: ClipSuggestion;
  index: number;
  thumbnail?: string;
  onDownload?: () => void;
  onPreview?: () => void;
}

export default function ClipCard({ clip, index, thumbnail, onDownload, onPreview }: ClipCardProps) {
  const formatTime = useFormatTime();

  const scoreColor =
    clip.score >= 80 ? 'text-green-400' :
    clip.score >= 60 ? 'text-yellow-400' :
    'text-orange-400';

  const scoreLabel =
    clip.score >= 80 ? 'Viral 🔥' :
    clip.score >= 60 ? 'Bon potentiel' :
    'Correct';

  return (
    <Card className="group relative overflow-hidden bg-white/[0.02] border-white/5 hover:border-white/10 transition-all duration-300 hover:-translate-y-0.5">
      {/* Thumbnail / Preview */}
      <div className="relative aspect-[9/16] max-h-[280px] bg-gradient-to-br from-white/[0.03] to-white/[0.01] overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={clip.title}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[oklch(0.65_0.25_300_/_0.2)] to-[oklch(0.60_0.22_340_/_0.1)] flex items-center justify-center">
              <Play className="w-6 h-6 text-[oklch(0.75_0.25_300)]" />
            </div>
          </div>
        )}

        {/* Overlay controls */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
          <Button
            size="sm"
            variant="secondary"
            className="w-full bg-white/15 backdrop-blur-md border-white/10 text-white hover:bg-white/25 text-xs"
            onClick={onPreview}
          >
            <Play className="w-3 h-3 mr-1" />
            Prévisualiser
          </Button>
        </div>

        {/* Clip number badge */}
        <div className="absolute top-2 left-2">
          <div className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-xs font-bold text-white">
            {index + 1}
          </div>
        </div>

        {/* Score badge */}
        <div className="absolute top-2 right-2">
          <Badge className="bg-black/50 backdrop-blur-md border-white/10 text-white text-xs gap-1">
            <Star className={`w-3 h-3 ${scoreColor}`} />
            {clip.score}
          </Badge>
        </div>

        {/* Duration */}
        <div className="absolute bottom-2 right-2">
          <Badge variant="secondary" className="bg-black/60 backdrop-blur-md border-0 text-white/80 text-[10px]">
            <Clock className="w-2.5 h-2.5 mr-0.5" />
            {clip.duration}s
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-sm line-clamp-1">{clip.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{clip.hook}</p>
        </div>

        {/* Timestamps */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{formatTime(clip.startTime)} → {formatTime(clip.endTime)}</span>
        </div>

        {/* Score label */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${scoreColor}`}>{scoreLabel}</span>
        </div>

        {/* Tags */}
        {clip.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {clip.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] py-0 px-1.5 bg-white/5 border-white/5 text-muted-foreground"
              >
                <Tag className="w-2 h-2 mr-0.5" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Reason */}
        <p className="text-[11px] text-muted-foreground/70 line-clamp-2 italic">
          "{clip.reason}"
        </p>

        {/* Download button */}
        <Button
          size="sm"
          className="w-full bg-gradient-to-r from-[oklch(0.65_0.25_300)] to-[oklch(0.60_0.22_340)] text-white hover:opacity-90 text-xs h-8 shadow-lg shadow-[oklch(0.65_0.25_300_/_0.15)]"
          onClick={onDownload}
        >
          <Download className="w-3 h-3 mr-1" />
          Télécharger le clip
        </Button>
      </div>
    </Card>
  );
}
