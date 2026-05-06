import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 300000, // 5 min for video processing
});

// ── Types ──
export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  channel: string;
  viewCount: string;
  description: string;
}

export interface ClipSuggestion {
  id: string;
  title: string;
  hook: string;
  startTime: number;
  endTime: number;
  duration: number;
  score: number;
  reason: string;
  tags: string[];
}

export interface ProcessingJob {
  jobId: string;
  status: 'queued' | 'downloading' | 'transcribing' | 'analyzing' | 'cutting' | 'done' | 'error';
  progress: number;
  videoInfo?: VideoInfo;
  clips?: ClipSuggestion[];
  error?: string;
}

// ── API calls ──
export async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  const { data } = await api.post('/video/info', { url });
  return data;
}

export async function startProcessing(url: string, options?: {
  clipCount?: number;
  minDuration?: number;
  maxDuration?: number;
  style?: string;
}): Promise<ProcessingJob> {
  const { data } = await api.post('/video/process', { url, ...options });
  return data;
}

export async function getJobStatus(jobId: string): Promise<ProcessingJob> {
  const { data } = await api.get(`/video/job/${jobId}`);
  return data;
}

export async function downloadClip(jobId: string, clipId: string): Promise<Blob> {
  const { data } = await api.get(`/video/clip/${jobId}/${clipId}`, {
    responseType: 'blob',
  });
  return data;
}

export async function exportCookies(): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post('/video/export-cookies');
  return data;
}

export default api;
