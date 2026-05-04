import { Progress } from '@/components/ui/progress';
import { Loader2, Download as DownloadIcon, Brain, Scissors, Headphones, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProcessingStatusProps {
  status: string;
  progress: number;
  error?: string | null;
}

const statusConfig: Record<string, {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}> = {
  queued: {
    label: 'En file d\'attente',
    description: 'Ta vidéo est dans la file d\'attente...',
    icon: Loader2,
    color: 'text-muted-foreground',
  },
  downloading: {
    label: 'Téléchargement',
    description: 'Téléchargement de la vidéo YouTube en cours...',
    icon: DownloadIcon,
    color: 'text-blue-400',
  },
  transcribing: {
    label: 'Transcription',
    description: 'Extraction des sous-titres et de l\'audio...',
    icon: Headphones,
    color: 'text-cyan-400',
  },
  analyzing: {
    label: 'Analyse IA',
    description: 'Gemini analyse le contenu pour trouver les meilleurs moments...',
    icon: Brain,
    color: 'text-violet-400',
  },
  cutting: {
    label: 'Découpage',
    description: 'FFmpeg découpe les clips au format 9:16...',
    icon: Scissors,
    color: 'text-emerald-400',
  },
  done: {
    label: 'Terminé !',
    description: 'Tes clips sont prêts à être téléchargés.',
    icon: CheckCircle2,
    color: 'text-green-400',
  },
  error: {
    label: 'Erreur',
    description: 'Une erreur est survenue.',
    icon: AlertCircle,
    color: 'text-destructive',
  },
};

const steps = ['downloading', 'transcribing', 'analyzing', 'cutting', 'done'];

export default function ProcessingStatus({ status, progress, error }: ProcessingStatusProps) {
  const config = statusConfig[status] || statusConfig.queued;
  const Icon = config.icon;
  const currentStepIndex = steps.indexOf(status);

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* Main status */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className={`w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center ${config.color}`}>
            <Icon className={`w-7 h-7 ${status !== 'done' && status !== 'error' ? 'animate-spin' : ''}`} />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold">{config.label}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {error || config.description}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {status !== 'error' && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(progress)}%</span>
            <span>{config.label}</span>
          </div>
        </div>
      )}

      {/* Step indicators */}
      {status !== 'error' && (
        <div className="flex items-center justify-between px-4">
          {steps.map((step, index) => {
            const stepConf = statusConfig[step];
            const StepIcon = stepConf.icon;
            const isActive = index === currentStepIndex;
            const isDone = index < currentStepIndex;

            return (
              <div key={step} className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-500 ${
                    isDone
                      ? 'bg-green-500/20 border-green-500/30 text-green-400'
                      : isActive
                      ? `bg-white/5 border-white/10 ${stepConf.color}`
                      : 'bg-white/[0.02] border-white/5 text-muted-foreground/30'
                  }`}
                >
                  <StepIcon className={`w-3.5 h-3.5 ${isActive && step !== 'done' ? 'animate-pulse' : ''}`} />
                </div>
                <span className={`text-[10px] ${isActive ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                  {stepConf.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
