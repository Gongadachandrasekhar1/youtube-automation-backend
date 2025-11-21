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

async function generateStory() {
  console.log('📝 Generating Telugu story with Gemini...');
  
  const storyTypes = ['moral', 'funny', 'educational', 'mythology'];
  const randomType = storyTypes[Math.floor(Math.random() * storyTypes.length)];

  const prompt = `Create a ${randomType} Telugu story for YouTube (5-7 minutes, family audience).

Return ONLY valid JSON with this exact structure:
{
  "title_telugu": "Story title in Telugu",
  "title_english": "Story title in English",
  "category": "${randomType}",
  "scenes": [
    {
      "scene_number": 1,
      "telugu_dialogue": "First scene dialogue in Telugu",
      "english_translation": "English translation",
      "action": "What happens in this scene",
      "duration_seconds": 20
    },
    {
      "scene_number": 2,
      "telugu_dialogue": "Second scene dialogue in Telugu",
      "english_translation": "English translation",
      "action": "What happens in this scene",
      "duration_seconds": 20
    }
  ],
  "moral": "The moral or lesson of the story",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "description": "YouTube video description with hashtags",
  "thumbnail_text": "Short text for thumbnail"
}`;

  try {
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
    
    if (!response.ok || !data.candidates || !data.candidates[0]) {
      console.error('Gemini API error:', data);
      throw new Error('Gemini API error: ' + JSON.stringify(data));
    }
    
    const text = data.candidates[0].content.parts[0].text;
    const cleanText = text.replace(/```json|```/g, '').trim();
    
    console.log('✅ Story generated successfully');
    return JSON.parse(cleanText);
    
  } catch (error) {
    console.error('Error in generateStory:', error);
    throw error;
  }
}

async function generateAudio(story) {
  console.log('🎤 Generating Telugu audio...');
  
  const fullScript = story.scenes.map(s => s.telugu_dialogue).join(' ');
  const outputPath = `./output/audio_${Date.now()}.mp3`;
  
  return new Promise((resolve, reject) => {
    const tts = new gtts(fullScript, 'te');
    tts.save(outputPath, (err) => {
      if (err) {
        console.error('Audio generation error:', err);
        reject(err);
      } else {
        console.log('✅ Audio generated');
        resolve(outputPath);
      }
    });
  });
}

async function processVideo() {
  try {
    console.log('🚀 Starting video generation...');
    
    const story = await generateStory();
    console.log(`✅ Story: ${story.title_english} (${story.category})`);
    
    const audioPath = await generateAudio(story);
    console.log(`✅ Audio saved: ${audioPath}`);
    
    return {
      success: true,
      story: story,
      audioPath: audioPath,
      message: 'Video processing complete!'
    };
    
  } catch (error) {
    console.error('❌ Error in processVideo:', error);
    return { 
      success: false, 
      error: error.message,
      details: error.toString()
    };
  }
}

app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    message: 'YouTube Automation Backend - Gemini Powered!',
    videosPerDay: CONFIG.VIDEOS_PER_DAY,
    aiProvider: 'Google Gemini 1.5 Flash (FREE)'
  });
});

app.post('/api/generate-video', async (req, res) => {
  console.log('📥 Received video generation request');
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
  
  res.json({ 
    success: true, 
    message: 'Automation scheduled for 9AM, 1PM, 5PM, 9PM daily!' 
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    configured: !!(CONFIG.GEMINI_API_KEY && CONFIG.YOUTUBE_CLIENT_ID),
    channelId: CONFIG.CHANNEL_ID,
    aiProvider: 'Google Gemini 1.5 Flash',
    hasGeminiKey: !!CONFIG.GEMINI_API_KEY,
    hasYouTubeKeys: !!(CONFIG.YOUTUBE_CLIENT_ID && CONFIG.YOUTUBE_CLIENT_SECRET)
  });
});

app.get('/api/test-gemini', async (req, res) => {
  try {
    const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${CONFIG.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'Say hello in Telugu' }]
        }]
      })
    });
    
    const data = await testResponse.json();
    res.json({ success: true, response: data });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

fs.mkdir('./output', { recursive: true }).catch(console.error);

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  YouTube Automation Backend           ║
║  AI: Google Gemini 1.5 Flash (FREE)   ║
║  Port: ${PORT}                            ║
║  Status: ✅ Running                    ║
╚════════════════════════════════════════╝
  `);
  
  console.log('Configuration:');
  console.log('- Gemini API Key:', CONFIG.GEMINI_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('- YouTube Client ID:', CONFIG.YOUTUBE_CLIENT_ID ? '✅ Set' : '❌ Missing');
});
