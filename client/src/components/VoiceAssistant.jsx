import { useState, useEffect } from 'react';
import { Mic, Volume2, Globe, Check } from 'lucide-react';
import { showToast } from '../api';

const LANGUAGES = [
  { code: 'en-IN', name: 'English', greeting: 'Welcome to VahanSetu. How can I assist you today?' },
  { code: 'hi-IN', name: 'हिन्दी (Hindi)', greeting: 'वहनसेतु में आपका स्वागत है। मैं आपकी कैसे मदद कर सकता हूँ?' },
  { code: 'gu-IN', name: 'ગુજરાતી (Gujarati)', greeting: 'વહનસેતુમાં આપનું સ્વાગત છે. હું તમારી શું મદદ કરી શકું?' }
];

export default function VoiceAssistant() {
  const [lang, setLang] = useState(LANGUAGES[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang.code;
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const announceArrival = (stationName) => {
    const text = lang.code === 'hi-IN' 
      ? `आप ${stationName} पर पहुंच गए हैं। चार्जिंग शुरू करने के लिए तैयार।`
      : lang.code === 'gu-IN'
      ? `તમે ${stationName} પર પહોંચી ગયા છો. ચાર્જિંગ શરૂ કરવા માટે તૈયાર.`
      : `You have arrived at ${stationName}. Ready to initiate charging.`;
    speak(text);
  };

  return (
    <div className="vs-voice-wrap" style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 4500 }}>
      {isOpen && (
        <div className="vs-glass" style={{ marginBottom: 15, padding: 20, borderRadius: 24, width: 280, animation: 'slide-up 0.3s ease' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--cyan)', marginBottom: 12, textTransform: 'uppercase' }}>RuralReach Voice Settings</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {LANGUAGES.map((l) => (
              <button 
                key={l.code} 
                onClick={() => { setLang(l); speak(l.greeting); }}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)',
                  background: lang.code === l.code ? 'rgba(0,240,255,0.1)' : 'rgba(255,255,255,0.02)',
                  color: lang.code === l.code ? 'var(--cyan)' : '#fff',
                  cursor: 'pointer', transition: '0.2s'
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{l.name}</span>
                {lang.code === l.code && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`vs-voice-trigger ${isSpeaking ? 'speaking' : ''}`}
        style={{ 
          width: 64, height: 64, borderRadius: '50%', 
          background: isSpeaking ? 'var(--cyan)' : 'rgba(4,6,15,0.95)',
          border: '2px solid var(--cyan)',
          display: 'flex', alignItems: 'center', justifyCenter: 'center',
          boxShadow: isSpeaking ? '0 0 30px var(--cyan)' : '0 10px 40px rgba(0,0,0,0.5)',
          cursor: 'pointer', transition: '0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          {isSpeaking ? <Volume2 size={28} color="#000" className="vs-pulse-slow" /> : <Mic size={28} color="var(--cyan)" />}
        </div>
      </button>

      <style>{`
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .vs-voice-trigger:hover { transform: scale(1.1) rotate(5deg); }
        .vs-voice-trigger.speaking { animation: vs-voice-pulse 1.5s infinite; }
        @keyframes vs-voice-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  );
}
