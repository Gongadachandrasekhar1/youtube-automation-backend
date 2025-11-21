const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const gtts = require('gtts');
const fs = require('fs').promises;

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const CONFIG = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'AIzaSyC9slVxTAEXhqXiqexm5b-NOCVGpMzG7Dw',
  YOUTUBE_CLIENT_ID: process.env.YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET,
  CHANNEL_ID: process.env.CHANNEL_ID,
  VIDEOS_PER_DAY: 4
};

// Generate story using Google Gemini
async function generateStory() {
  console.log('📝 Generating Telugu story with Gemini...');
  
  const storyTypes = ['moral', 'funny', 'educational', 'mythology'];
  const randomType = storyTypes[Math.floor(Math.random() * storyTypes.length)];

  const prompt = `Create a ${randomType} Telugu story for YouTube (5-7 minutes, family audience, 3D avatar style).

Return ONLY valid JSON (no markdown, no extra text):
{
  "title_telugu": "Telugu title",
  "title_english": "English title",
  "category": "${randomType}",
  "scenes": [
    {
      "scene_number": 1,
      "telugu_dialogue": "Telugu text",
      "english_translation": "English text",
      "action": "Scene description",
      "duration_seconds": 15
    }
  ],
  "moral": "Story moral in English",
  "tags": ["tag1", "tag2", "tag3"],
  "description": "YouTube description",
  "thumbnail_text": "Thumbnail text"
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${CONFIG.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  });

  const data = await response.json();
  
  if (!data.candidates || !data.candidates[0]) {
    throw new Error('Gemini API error: ' + JSON.stringify(data));
  }
  
  const text = data.candidates[0].content.parts[0].text;
  const cleanText = text.replace(/```json|```/g, '').trim();
  
  return JSON.parse(cleanText);
}

// Generate audio using gTTS
async function generateAudio(story) {
  console.log('🎤 Generating Telugu audio...');
  
  const fullScript = story.scenes.map(s => s.telugu_dialogue).join(' ');
  const outputPath = `./output/audio_${Date.now()}.mp3`;
  
  return new Promise((resolve, reject) => {
    const tts = new gtts(fullScript, 'te');
    tts.save(outputPath, (err) => {
      if (err) reject(err);
      else {
        console.log('✅ Audio generated');
        resolve(outputPath);
      }
    });
  });
}

// Main video processing
async function processVideo() {
  try {
    console.log('🚀 Starting video generation...');
    
    const story = await generateStory();
    console.log(`✅ Story: ${story.title_english}`);
    
    const audioPath = await generateAudio(story);
    console.log(`✅ Audio saved`);
    
    return {
      success: true,
      story: story,
      audioPath: audioPath,
      message: 'Video processing complete!'
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
    return { success: false, error: error.message };
  }
}

// API Endpoints
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    message: 'YouTube Automation Backend - Gemini Powered!',
    videosPerDay: CONFIG.VIDEOS_PER_DAY
  });
});

app.post('/api/generate-video', async (req, res) => {
  const result = await processVideo();
  res.json(result);
});

app.post('/api/start-automation', (req, res) => {
  console.log('🤖 Automation started!');
  
  const times = ['0 9 * * *', '0 13 * * *', '0 17 * * *', '0 21 * * *'];
  
  times.forEach(time => {
    cron.schedule(time, () => {
      console.log('⏰ Scheduled video generation');
      processVideo();
    });
  });
  
  res.json({ success: true, message: 'Automation scheduled!' });
});

app.get('/api/config', (req, res) => {
  res.json({
    configured: !!(CONFIG.GEMINI_API_KEY && CONFIG.YOUTUBE_CLIENT_ID),
    channelId: CONFIG.CHANNEL_ID,
    aiProvider: 'Google Gemini (FREE)'
  });
});

// Create output directory
fs.mkdir('./output', { recursive: true }).catch(console.error);

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  YouTube Automation Backend           ║
║  AI: Google Gemini (FREE)             ║
║  Port: ${PORT}                            ║
║  Status: ✅ Running                    ║
╚════════════════════════════════════════╝
  `);
});
