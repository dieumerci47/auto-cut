import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;
let model = null;

/**
 * Initialize the Gemini AI client.
 */
export function initAI(apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  console.log('[AI] Gemini initialized with model: gemini-2.0-flash');
}

/**
 * Analyze video transcript and identify the best clip-worthy moments.
 *
 * @param {Object} videoInfo - Video metadata (title, duration, etc.)
 * @param {Array} transcript - Parsed subtitle entries [{start, end, text}]
 * @param {Object} options - Clip generation options
 * @returns {Array} Suggested clips with timestamps, scores, and hooks
 */
export async function analyzeTranscript(videoInfo, transcript, options = {}) {
  if (!model) {
    throw new Error('AI not initialized. Call initAI() first.');
  }

  const {
    clipCount = 5,
    minDuration = 15,
    maxDuration = 60,
    style = 'viral',
  } = options;

  // Build the transcript text with timestamps
  const transcriptText = transcript
    ? transcript.map(entry =>
        `[${formatTime(entry.start)}] ${entry.text}`
      ).join('\n')
    : 'No transcript available.';

  const prompt = `Tu es un expert en création de contenu viral pour TikTok, YouTube Shorts et Instagram Reels.

CONTEXTE DE LA VIDÉO:
- Titre: "${videoInfo.title}"
- Chaîne: "${videoInfo.channel}"
- Durée totale: ${formatTime(videoInfo.duration)}
- Description: "${videoInfo.description || 'N/A'}"

TRANSCRIPTION AVEC TIMESTAMPS:
${transcriptText}

MISSION:
Analyse cette transcription et identifie les ${clipCount} meilleurs moments pour créer des clips courts viraux.

CRITÈRES DE SÉLECTION:
1. **Hook puissant** — Le début du clip doit capter l'attention en < 3 secondes
2. **Contenu de valeur** — Information utile, moment drôle, réaction forte, ou révélation
3. **Autonomie** — Le clip doit être compréhensible seul, sans contexte
4. **Potentiel viral** — Moments qui donnent envie de commenter, partager ou liker
5. **Durée optimale** — Entre ${minDuration}s et ${maxDuration}s

CONTRAINTES:
- Chaque clip doit durer entre ${minDuration} et ${maxDuration} secondes
- Les clips ne doivent PAS se chevaucher
- Classe les clips par score de viralité (100 = maximum)
- Ajoute quelques secondes de marge avant/après les moments clés

RÉPONDS UNIQUEMENT en JSON valide (sans markdown, sans backticks), avec ce format exact:
[
  {
    "title": "Titre accrocheur du clip",
    "hook": "Phrase d'accroche pour la description TikTok",
    "startTime": 125.5,
    "endTime": 178.0,
    "duration": 52.5,
    "score": 92,
    "reason": "Explication courte de pourquoi ce moment est viral",
    "tags": ["tag1", "tag2", "tag3"]
  }
]`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    const clips = parseAIResponse(text);

    // Validate and clean up clips
    return clips
      .map((clip, index) => ({
        id: String(index + 1),
        title: clip.title || `Clip ${index + 1}`,
        hook: clip.hook || '',
        startTime: Math.max(0, clip.startTime || 0),
        endTime: Math.min(videoInfo.duration, clip.endTime || 0),
        duration: clip.duration || (clip.endTime - clip.startTime),
        score: Math.min(100, Math.max(0, clip.score || 50)),
        reason: clip.reason || '',
        tags: Array.isArray(clip.tags) ? clip.tags.slice(0, 5) : [],
      }))
      .filter(clip => clip.endTime > clip.startTime && clip.duration >= minDuration)
      .sort((a, b) => b.score - a.score)
      .slice(0, clipCount);
  } catch (error) {
    console.error('[AI] Gemini analysis failed:', error.message);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

/**
 * Parse AI response text as JSON, handling common formatting issues.
 */
function parseAIResponse(text) {
  // Remove markdown code block markers if present
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Try to find JSON array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    cleaned = arrayMatch[0];
  }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('[AI] Failed to parse response:', text.substring(0, 200));
    throw new Error('Failed to parse AI response as JSON');
  }
}

/**
 * Format seconds to MM:SS for prompt readability.
 */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
