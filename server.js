// Updated for Render deployment
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
  HUGGINGFACE_API_TOKEN: process.env.HUGGINGFACE_API_TOKEN || 'hf_...SMES',  YOUTUBE_CLIENT_ID: process.env.YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET,
  CHANNEL_ID: process.env.CHANNEL_ID,
  VIDEOS_PER_DAY: 4
};

async function generateStory() {
  console.log('📝 Generating Telugu story with Gemini...');  
  const storyTypes = ['moral', 'funny', 'educational', 'mythology'];
  const randomType = storyTypes[Math.floor(Math.random() * storyTypes.length)];

  const prompt = `Create a ${randomType} Telugu story for YouTube (5-7 minutes, family audience).

Return ONLY valid JSON:
{
  "title_telugu": "Story title in Telugu",
  "title_english": "Story title in English",
  "category": "${randomType}",
  "scenes": [
    {
      "scene_number": 1,
      "telugu_dialogue": "First scene in Telugu",
      "english_translation": "English translation",
      "action": "Scene description",
      "duration_seconds": 20
    },
    {
      "scene_number": 2,
      "telugu_dialogue": "Second scene in Telugu",
      "english_translation": "English translation",
      "action": "Scene description",
      "duration_seconds": 20
    }
  ],
  "moral": "The lesson",
  "tags": ["tag1", "tag2", "tag3"],
  "description": "YouTube description",
  "thumbnail_text": "Thumbnail text"
}`;

  try {
      const response = await fetch('https://router.huggingface.co/v1/chat/completions     method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${CONFIG.HUGGINGFACE_API_TOKEN}` 
        },
        body: JSON.stringify({
          model: 'mistralai/Mistral-7B-Instruct-v0.2',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500
        })
      });
      });if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API error:', response.status, errorText);
      throw new Error(`Hugging Face API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
      // Parse Hugging Face response
    if (data.error) {
      console.error('Hugging Face API error:', data);
      throw new Error('Hugging Face API error: ' + JSON.stringify(data));
    }

    // Extract the generated text
     const generatedText = data.choices?.[0]?.message?.content || '';  // Try to extract JSON from the response    let jsonMatch = generatedText.match(/\{[\s\S]*\}/); 
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    const cleanText = jsonMatch[0];
    console.log('✅ Story generated successfully with Hugging Face');

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

    // Temporary: Return success without actual audio generation
    // TODO: Integrate proper Telugu TTS (options: Google Cloud TTS, AWS Polly, or ElevenLabs)
    console.log('✅ Audio placeholder created (TTS integration pending)');
    console.log('Telugu script:', fullScript.substring(0, 100) + '...');

    return outputPath;
}
async function processVideo() {
    try {
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
    aiProvider: 'Google Gemini (FREE)'
  });
});

app.get('/api/list-models', async (req, res) => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${CONFIG.HUGGINGFACE_API_TOKEN}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.json({ error: error.message });
  }
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
    aiProvider: 'Google Gemini',
    hasGeminiKey: !!CONFIG.GEMINI_API_KEY,
    hasYouTubeKeys: !!(CONFIG.YOUTUBE_CLIENT_ID && CONFIG.YOUTUBE_CLIENT_SECRET)
  });
});

app.get('/api/test-gemini', async (req, res) => {
  try {
    const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`, {
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
    AI: Hugging Face Mistral (FREE)║  Port: ${PORT}                            ║
║  Status: ✅ Running                    ║
╚════════════════════════════════════════╝
  `);
  
  console.log('Configuration:');
  console.log('- Hugging Face API Key:', CONFIG.HUGGINGFACE_API_TOKEN ? '✅ Set' : '❌ Missing');  console.log('- YouTube Client ID:', CONFIG.YOUTUBE_CLIENT_ID ? '✅ Set' : '❌ Missing');
});
