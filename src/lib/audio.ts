import { Audio } from 'expo-av';

const GOOGLE_TTS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY;

export async function playAudioFromUri(uri: string): Promise<void> {
  if (!uri) return;
  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true }
    );

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (error) {
    console.error('Audio playback error:', error);
  }
}

export async function playThaiAudio(text: string): Promise<void> {
  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: 'th-TH', name: 'th-TH-Standard-A' },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 0.85 },
        }),
      }
    );

    const data = await response.json();
    
    if (data.audioContent) {
      await playAudioFromUri(`data:audio/mp3;base64,${data.audioContent}`);
    }
  } catch (error) {
    console.error('Audio playback error:', error);
  }
}
