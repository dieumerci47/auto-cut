import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import path from 'path';
import fs from 'fs/promises';
import { ensureDir, formatTimestamp } from '../utils/helpers.js';

// Point fluent-ffmpeg to the static binaries
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);
console.log(`[FFmpeg] Using binary at: ${ffmpegStatic}`);

/**
 * Cut a clip from the source video.
 *
 * @param {string} sourcePath - Path to the source video file
 * @param {Object} clip - Clip definition {id, startTime, endTime}
 * @param {string} outputDir - Output directory for clips
 * @param {Object} options - Additional options
 * @returns {string} Path to the generated clip
 */
export async function cutClip(sourcePath, clip, outputDir, options = {}) {
  const {
    format = 'vertical', // 'vertical' (9:16) | 'square' (1:1) | 'original'
    resolution = 1080,
  } = options;

  await ensureDir(outputDir);
  const outputPath = path.join(outputDir, `clip_${clip.id}.mp4`);
  const duration = clip.endTime - clip.startTime;

  return new Promise((resolve, reject) => {
    let command = ffmpeg(sourcePath)
      .setStartTime(formatTimestamp(clip.startTime))
      .setDuration(duration)
      .outputOptions([
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-avoid_negative_ts', 'make_zero',
      ]);

    // Apply video filter for format conversion
    if (format === 'vertical') {
      // 9:16 portrait — crop center and scale to 1080x1920
      command = command.videoFilters([
        `scale=${resolution}:${resolution * 16 / 9}:force_original_aspect_ratio=increase`,
        `crop=${resolution}:${resolution * 16 / 9}`,
      ]);
    } else if (format === 'square') {
      // 1:1 square
      command = command.videoFilters([
        `scale=${resolution}:${resolution}:force_original_aspect_ratio=increase`,
        `crop=${resolution}:${resolution}`,
      ]);
    }
    // 'original' keeps the original aspect ratio

    command
      .output(outputPath)
      .on('start', (cmd) => {
        console.log(`[FFmpeg] Cutting clip ${clip.id}: ${cmd.substring(0, 100)}...`);
      })
      .on('end', () => {
        console.log(`[FFmpeg] Clip ${clip.id} done: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`[FFmpeg] Clip ${clip.id} failed:`, err.message);
        reject(new Error(`FFmpeg error for clip ${clip.id}: ${err.message}`));
      })
      .run();
  });
}

/**
 * Cut multiple clips from a source video.
 *
 * @param {string} sourcePath - Path to source video
 * @param {Array} clips - Array of clip definitions
 * @param {string} outputDir - Output directory
 * @param {Function} onProgress - Progress callback (clipIndex, totalClips)
 * @returns {Array} Paths to generated clips
 */
export async function cutAllClips(sourcePath, clips, outputDir, onProgress) {
  const results = [];

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];

    try {
      const clipPath = await cutClip(sourcePath, clip, outputDir);
      results.push({ clipId: clip.id, path: clipPath, success: true });
    } catch (error) {
      console.error(`[FFmpeg] Failed to cut clip ${clip.id}:`, error.message);
      results.push({ clipId: clip.id, path: null, success: false, error: error.message });
    }

    if (onProgress) {
      onProgress(i + 1, clips.length);
    }
  }

  return results;
}

/**
 * Get video file metadata (duration, resolution, codec, etc.)
 */
export function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(new Error(`FFprobe error: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

      resolve({
        duration: metadata.format.duration,
        size: metadata.format.size,
        bitrate: metadata.format.bit_rate,
        video: videoStream ? {
          codec: videoStream.codec_name,
          width: videoStream.width,
          height: videoStream.height,
          fps: eval(videoStream.r_frame_rate),
        } : null,
        audio: audioStream ? {
          codec: audioStream.codec_name,
          channels: audioStream.channels,
          sampleRate: audioStream.sample_rate,
        } : null,
      });
    });
  });
}
