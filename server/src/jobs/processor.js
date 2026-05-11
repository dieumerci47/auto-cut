import fs from 'fs';
import path from 'path';
import { getVideoInfo, downloadVideo, extractSubtitles } from '../services/youtube.js';
import { analyzeTranscript } from '../services/ai.js';
import { cutAllClips } from '../services/video.js';
import { generateJobId, ensureDir } from '../utils/helpers.js';
import { supabase } from '../services/supabase.js';

// In-memory job store (in production, use Redis or a database)
const jobs = new Map();

/**
 * Get a job by ID.
 */
export function getJob(jobId) {
  return jobs.get(jobId) || null;
}

/**
 * Update job status.
 */
function updateJob(jobId, updates) {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
    jobs.set(jobId, job);

    if (updates.status || updates.error || updates.videoInfo) {
      supabase.from('jobs').update({
        status: job.status,
        error: job.error,
        title: job.videoInfo?.title,
        thumbnail: job.videoInfo?.thumbnail
      }).eq('id', jobId).then(({error}) => {
        if (error) console.error('[Supabase] Update job error:', error.message);
      });
    }
  }
}

/**
 * Create and start a new processing job.
 * The job runs asynchronously through the full pipeline.
 */
export async function createJob(url, options = {}, tempDir) {
  const jobId = generateJobId();
  const jobDir = path.join(tempDir, jobId);
  const clipsDir = path.join(jobDir, 'clips');

  await ensureDir(jobDir);
  await ensureDir(clipsDir);

  // Initialize job
  const job = {
    jobId,
    status: 'queued',
    progress: 0,
    url,
    options,
    videoInfo: null,
    clips: [],
    clipPaths: [],
    error: null,
    createdAt: new Date().toISOString(),
    jobDir,
    clipsDir,
  };

  jobs.set(jobId, job);

  // Create in Supabase
  supabase.from('jobs').insert({
    id: jobId,
    video_url: url,
    status: 'queued',
  }).then(({error}) => {
    if (error) console.error('[Supabase] Create job error:', error.message);
  });

  // Start async processing pipeline
  processJob(jobId, url, options, jobDir, clipsDir).catch((error) => {
    console.error(`[Job ${jobId}] Pipeline failed:`, error);
    updateJob(jobId, {
      status: 'error',
      error: error.message,
    });
  });

  return { jobId, status: 'queued', progress: 0 };
}

/**
 * Retry a failed job from where it stopped.
 */
export async function retryJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status !== 'error') throw new Error('Can only retry failed jobs');

  // Reset error
  job.status = 'queued';
  job.error = null;
  jobs.set(jobId, job);

  // Restart pipeline
  processJob(jobId, job.url, job.options, job.jobDir, job.clipsDir).catch((error) => {
    console.error(`[Job ${jobId}] Pipeline failed during retry:`, error);
    updateJob(jobId, {
      status: 'error',
      error: error.message,
    });
  });

  return { jobId, status: 'queued', progress: job.progress };
}

/**
 * Main processing pipeline.
 */
async function processJob(jobId, url, options, jobDir, clipsDir) {
  try {
    const job = jobs.get(jobId) || {};
    let videoInfo = job.videoInfo;
    if (!videoInfo) {
      console.log(`[Job ${jobId}] Step 1/4: Fetching video info...`);
      updateJob(jobId, { status: 'downloading', progress: 5 });
      videoInfo = await getVideoInfo(url);
      updateJob(jobId, { videoInfo, progress: 10 });
      console.log(`[Job ${jobId}] Video: "${videoInfo.title}" (${videoInfo.duration}s)`);
    }

    // ── Step 2: Download video ──
    let videoPath = job.videoPath;
    if (!videoPath) {
      console.log(`[Job ${jobId}] Step 2/4: Downloading video...`);
      videoPath = await downloadVideo(url, jobDir, (percent) => {
        updateJob(jobId, { progress: 10 + (percent * 0.3) }); // 10% -> 40%
      });
      updateJob(jobId, { videoPath, progress: 40 });
      console.log(`[Job ${jobId}] Download complete: ${videoPath}`);
    } else {
      console.log(`[Job ${jobId}] Video already downloaded: ${videoPath}`);
    }

    // ── Step 3: Extract subtitles & Analyze ──
    let transcript = job.transcript;
    if (transcript === undefined) {
      console.log(`[Job ${jobId}] Step 3/4: Extracting subtitles & analyzing...`);
      updateJob(jobId, { status: 'transcribing', progress: 45 });

      transcript = await extractSubtitles(url, jobDir);
      updateJob(jobId, { transcript, progress: 50 });

      if (transcript) {
        console.log(`[Job ${jobId}] Subtitles extracted: ${transcript.length} entries`);
      } else {
        console.log(`[Job ${jobId}] No subtitles available, AI will use metadata only`);
      }
    } else {
       console.log(`[Job ${jobId}] Subtitles already extracted.`);
    }

    // ── Step 4: AI Analysis ──
    console.log(`[Job ${jobId}] Analyzing with Gemini AI...`);
    updateJob(jobId, { status: 'analyzing', progress: 55 });

    const clips = await analyzeTranscript(videoInfo, transcript, {
      clipCount: options.clipCount || 5,
      minDuration: options.minDuration || 15,
      maxDuration: options.maxDuration || 60,
      style: options.style || 'viral',
    });

    updateJob(jobId, { clips, progress: 70 });
    console.log(`[Job ${jobId}] AI found ${clips.length} clip suggestions`);

    // ── Step 5: Cut clips ──
    console.log(`[Job ${jobId}] Step 4/4: Cutting clips with FFmpeg...`);
    updateJob(jobId, { status: 'cutting', progress: 75 });

    const clipResults = await cutAllClips(videoPath, clips, clipsDir, (done, total) => {
      const cutProgress = 75 + (done / total) * 25;
      updateJob(jobId, { progress: Math.round(cutProgress) });
    });

    // ── Step 6: Upload to Supabase ──
    console.log(`[Job ${jobId}] Step 5/5: Uploading clips to Supabase...`);
    updateJob(jobId, { status: 'uploading', progress: 90 });

    for (let i = 0; i < clips.length; i++) {
      const clipInfo = clips[i];
      const clipResult = clipResults.find(r => r.clipId === clipInfo.id);
      
      if (clipResult && clipResult.success && clipResult.path) {
        try {
          const fileData = await fs.promises.readFile(clipResult.path);
          const fileName = `${jobId}/clip_${clipInfo.id}.mp4`;
          
          const { error: uploadError } = await supabase.storage
            .from('clips')
            .upload(fileName, fileData, {
              contentType: 'video/mp4',
              upsert: true
            });
            
          if (uploadError) throw uploadError;
          
          const { data: publicUrlData } = supabase.storage
            .from('clips')
            .getPublicUrl(fileName);
            
          const s3Url = publicUrlData.publicUrl;
          
          // Insert into clips DB
          await supabase.from('clips').insert({
            job_id: jobId,
            clip_index: parseInt(clipInfo.id),
            title: clipInfo.title,
            hook: clipInfo.hook,
            start_time: clipInfo.startTime,
            end_time: clipInfo.endTime,
            duration: clipInfo.duration,
            score: clipInfo.score,
            reason: clipInfo.reason,
            tags: clipInfo.tags,
            s3_url: s3Url
          });
          
          // Attach S3 URL to in-memory clip
          clipInfo.streamUrl = s3Url;
        } catch (err) {
          console.error(`[Supabase] Upload failed for clip ${clipInfo.id}:`, err.message);
        }
      }
    }

    // Store clip paths and finalize
    updateJob(jobId, {
      status: 'done',
      progress: 100,
      clipPaths: clipResults,
      clips: clips // now contains streamUrl
    });

    console.log(`[Job ${jobId}] ✅ Pipeline complete! ${clipResults.filter(r => r.success).length}/${clips.length} clips generated.`);

    // Cleanup local files
    try {
      await fs.promises.rm(jobDir, { recursive: true, force: true });
      console.log(`[Job ${jobId}] 🗑️ Cleaned up temp files.`);
    } catch (err) {
      console.error(`[Job ${jobId}] ⚠️ Failed to clean up temp files:`, err.message);
    }

  } catch (error) {
    console.error(`[Job ${jobId}] ❌ Pipeline error:`, error);
    updateJob(jobId, {
      status: 'error',
      error: error.message,
    });
  }
}

/**
 * Get the file path for a specific clip.
 */
export function getClipPath(jobId, clipId) {
  const job = jobs.get(jobId);
  if (job && job.clipPaths) {
    const clipResult = job.clipPaths.find(r => r.clipId === clipId);
    if (clipResult?.path) return clipResult.path;
  }

  // Fallback if server restarted but files exist
  const tempDir = process.env.TEMP_DIR || './temp';
  const guessedPath = path.resolve(tempDir, jobId, 'clips', `clip_${clipId}.mp4`);
  if (fs.existsSync(guessedPath)) {
    return guessedPath;
  }

  return null;
}

/**
 * Clean up old jobs (older than maxAge milliseconds).
 */
export function cleanupOldJobs(maxAge = 3600000) {
  const now = Date.now();
  for (const [jobId, job] of jobs) {
    const jobAge = now - new Date(job.createdAt).getTime();
    if (jobAge > maxAge) {
      jobs.delete(jobId);
      console.log(`[Jobs] Cleaned up old job: ${jobId}`);
    }
  }
}
