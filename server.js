const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const Anthropic = require('@anthropic-ai/sdk');
const gtts = require('gtts');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Your API Keys (from environment variables)
const CONFIG = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  YOUTUBE_CLIENT_ID: process.env.YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET,
  CHANNEL_ID: process.env.CHANNEL_ID,
  VIDEOS_PER_DAY: 4
};

// Story generation
async function generateStory() {
  console.log('📝 Generating Telugu story...');
  
  const client = new Anthropic({ apiKey: CONFIG.ANTHROPIC_API_KEY });
  
  const storyTypes = ['moral', 'funny', 'educational', 'mythology'];
  const randomType = storyTypes[Math.floor(Math.random() * storyTypes.length)];

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2500,
    messages: [{
      role: 'user',
      content: `Create a ${randomType} Telugu story for YouTube (5-7 minutes, family audience, 3D avatar style).

Return ONLY valid JSON:
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
  "moral": "Story moral",
  "tags": ["tag1", "tag2", "tag3"],
  "description": "YouTube description",
  "thumbnail_text": "Thumbnail text"
}`
    }]
  });

  const text = message.content[0].text.replace(/```json|```/g, '').trim();
  return JSON.parse(text);
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
    
    // In production: Create video, add subtitles, upload to YouTube
    // For now, we're simulating the process
    
    return {
      success: true,
      story: story,
      audioPath: audioPath,
      message: 'Video processing complete! (Upload to YouTube coming soon)'
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
    message: 'YouTube Automation Backend is running!',
    videosPerDay: CONFIG.VIDEOS_PER_DAY
  });
});

app.post('/api/generate-video', async (req, res) => {
  const result = await processVideo();
  res.json(result);
});

app.post('/api/start-automation', (req, res) => {
  console.log('🤖 Automation started!');
  
  // Schedule videos at 9AM, 1PM, 5PM, 9PM
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
    configured: !!(CONFIG.ANTHROPIC_API_KEY && CONFIG.YOUTUBE_CLIENT_ID),
    channelId: CONFIG.CHANNEL_ID
  });
});

// Create output directory
fs.mkdir('./output', { recursive: true });

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  YouTube Automation Backend           ║
║  Port: ${PORT}                            ║
║  Status: ✅ Running                    ║
╚════════════════════════════════════════╝
  `);
});
```

4. Scroll down, click **"Commit changes"**

---

### **FILE 3: .gitignore**

1. Click **"Add file"** → **"Create new file"**
2. **File name**: Type `.gitignore`
3. **Paste this:**
```
node_modules/
output/
.env
*.mp3
*.mp4
