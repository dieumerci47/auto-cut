import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { getVideoInfo } from '../services/youtube.js';
import { createJob, getJob, retryJob, getClipPath } from '../jobs/processor.js';
import { isValidYouTubeUrl } from '../utils/helpers.js';
import { supabase } from '../services/supabase.js';

const router = Router();
const TEMP_DIR = process.env.TEMP_DIR || './temp';

/**
 * POST /api/video/info
 * Get video metadata without downloading.
 */
router.post('/info', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !isValidYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const info = await getVideoInfo(url);
    res.json(info);
  } catch (error) {
    console.error('[Route] /info error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/video/process
 * Start processing a YouTube video.
 */
router.post('/process', async (req, res) => {
  try {
    const { url, clipCount, minDuration, maxDuration, style } = req.body;

    if (!url || !isValidYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const job = await createJob(url, {
      clipCount: clipCount || 5,
      minDuration: minDuration || 15,
      maxDuration: maxDuration || 60,
      style: style || 'viral',
    }, TEMP_DIR);

    res.json(job);
  } catch (error) {
    console.error('[Route] /process error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/video/job/:jobId/retry
 * Retry a failed job.
 */
router.post('/job/:jobId/retry', async (req, res) => {
  try {
    const job = await retryJob(req.params.jobId);
    res.json(job);
  } catch (error) {
    console.error('[Route] /job/retry error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/video/job/:jobId
 * Get the status of a processing job.
 */
router.get('/job/:jobId', async (req, res) => {
  const job = getJob(req.params.jobId);

  if (!job) {
    // Check if it exists in Supabase
    const { data: dbJob, error } = await supabase
      .from('jobs')
      .select(`
        id, video_url, title, thumbnail, status, error, created_at,
        clips (
          id, clip_index, title, hook, start_time, end_time, duration, score, reason, tags, s3_url
        )
      `)
      .eq('id', req.params.jobId)
      .single();

    if (!dbJob || error) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Map to the expected format
    return res.json({
      jobId: dbJob.id,
      status: dbJob.status,
      progress: 100,
      videoInfo: { title: dbJob.title, thumbnail: dbJob.thumbnail, id: dbJob.video_url?.split('v=')[1] },
      clips: dbJob.clips.map(c => ({
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
      })).sort((a, b) => b.score - a.score),
      error: dbJob.error,
    });
  }

  // Return job status without internal paths
  res.json({
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    videoInfo: job.videoInfo,
    clips: job.clips,
    error: job.error,
  });
});

/**
 * GET /api/video/clip/:jobId/:clipId
 * Download a generated clip.
 */
router.get('/clip/:jobId/:clipId', async (req, res) => {
  try {
    const { jobId, clipId } = req.params;
    const clipPath = getClipPath(jobId, clipId);

    if (!clipPath) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    // Verify file exists
    await fs.access(clipPath);

    const fileName = `autocut-clip-${clipId}.mp4`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'video/mp4');

    const { createReadStream } = await import('fs');
    const stream = createReadStream(clipPath);
    stream.pipe(res);
  } catch (error) {
    console.error('[Route] /clip error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/video/stream/:jobId/:clipId
 * Stream a generated clip for preview.
 */
router.get('/stream/:jobId/:clipId', async (req, res) => {
  try {
    const { jobId, clipId } = req.params;
    const clipPath = getClipPath(jobId, clipId);

    if (!clipPath) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    // Verify file exists
    await fs.access(clipPath);

    res.setHeader('Content-Disposition', `inline`);
    res.setHeader('Content-Type', 'video/mp4');

    const { createReadStream } = await import('fs');
    const stream = createReadStream(clipPath);
    stream.pipe(res);
  } catch (error) {
    console.error('[Route] /stream error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/video/export-cookies
 * Attempt to export cookies from an installed browser.
 */
router.post('/export-cookies', async (req, res) => {
  try {
    const { exportCookies } = await import('../utils/export-cookies.js');
    
    // Run the export directly in the same process
    const success = await exportCookies();
    
    if (success) {
      res.json({ success: true, message: 'Cookies exported successfully.' });
    } else {
      res.status(400).json({ success: false, message: 'Failed to export cookies. Please make sure Chrome is closed.' });
    }
  } catch (error) {
    console.error('[Route] /export-cookies error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
