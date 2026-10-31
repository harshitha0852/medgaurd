import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Mic, MicOff, Send, Volume2, VolumeX, Loader2, Sparkles, Globe, Square, RotateCcw } from 'lucide-react';
import { useSession } from '@/lib/SessionContext';
import { analyzeMedications } from '@/lib/interactionEngine';
import { todayKey, timeLabel, calcAge } from '@/lib/format';
import PageHeader from '@/components/common/PageHeader';

const LANGS = [
  { code: 'en-IN', label: 'English', name: 'English' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ', name: 'Kannada' },
  { code: 'te-IN', label: 'తెలుగు', name: 'Telugu' },
  { code: 'hi-IN', label: 'हिन्दी', name: 'Hindi' },
  { code: 'ta-IN', label: 'தமிழ்', name: 'Tamil' },
];

const SUGGESTIONS = {
  'en-IN': [
    'What medicines do I take in the evening?',
    'Why is Warfarin flagged as a risk?',
    'What does my latest blood report say?',
    'How do I record my medicine video?',
  ],
  'kn-IN': ['ಸಂಜೆ ನಾನು ಯಾವ ಮದ್ದು ತೆಗೆದುಕೊಳ್ಳಬೇಕು?', 'ವಾರ್ಫರಿನ್ ಏಕೆ ಅಪಾಯಕಾರಿ?', 'ನನ್ನ ಮದ್ದಿನ ವಿವರ ಹೇಳಿ'],
  'te-IN': ['సాయంత్రం నేను ఏ మందులు తీసుకోవాలి?', 'వార్ఫరిన్ ఎందుకు ప్రమాదకరం?'],
  'hi-IN': ['शाम को मुझे कौन सी दवाइयाँ लेनी हैं?', 'वारफ़ेरिन खतरनाक क्यों है?'],
  'ta-IN': ['மாலையில் நான் எந்த மருந்துகளை எடுக்க வேண்டும்?', 'வார்ஃபரின் ஏன் ஆபத்தானது?'],
};

export default function VoiceAssistant() {
  const { account, activePatient } = useSession();
  const email = activePatient?.account_email || account?.email;
  const [lang, setLang] = useState('en-IN');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(true);
  const [context, setContext] = useState(null);
  const [speechError, setSpeechError] = useState('');
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!email) return;
    (async () => {
      const [meds, logs, records] = await Promise.all([
        base44.entities.Medication.filter({ patient_email: email, active: true }),
        base44.entities.MedicationLog.filter({ patient_email: email }),
        base44.entities.MedicalRecord.filter({ patient_email: email }, { sort: '-record_date', limit: 5 }),
      ]);
      const analysis = analyzeMedications(meds || [], activePatient);
      setContext({
        meds: meds || [],
        todayLogs: (logs || []).filter((l) => l.scheduled_date === todayKey()),
        records: Array.isArray(records) ? records : records.items || [],
        alerts: analysis.alerts,
      });
    })();
  }, [email, activePatient]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    recognitionRef.current?.stop?.();
  }, []);

  const speak = (text) => {
    if (!speakReplies || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  };

  const buildSystemContext = () => {
    if (!context) return 'No patient records loaded.';
    const meds = context.meds.map((m) => `${m.name}${m.dosage ? ` (${m.dosage})` : ''} — ${m.frequency || 'as prescribed'} at ${(m.times || []).map(timeLabel).join(', ') || 'no time set'}${m.purpose ? `, for ${m.purpose}` : ''}`).join('; ') || 'none';
    const today = context.todayLogs.map((l) => `${l.medication_name} at ${timeLabel(l.scheduled_time)} — ${l.status.replace('_', ' ')}`).join('; ') || 'none';
    const alerts = context.alerts.map((a) => `${a.severity} ${a.type}: ${a.medicines.join(' + ')} — ${a.title}. Advice: ${a.recommendation} (source: ${a.source})`).join('; ') || 'none';
    const records = context.records.map((r) => `${r.title} (${r.type.replace('_', ' ')}) by ${r.doctor_name || 'unknown doctor'} on ${r.record_date}: ${r.notes || 'no notes'}`).join('; ') || 'none';
    return `PATIENT: ${activePatient?.full_name || account.full_name}, age ${calcAge(activePatient?.date_of_birth) || 'unknown'}, conditions: ${(activePatient?.conditions || []).join(', ') || 'not recorded'}, allergies: ${(activePatient?.allergies || []).join(', ') || 'not recorded'}.
CURRENT MEDICINES: ${meds}.
TODAY'S SCHEDULE: ${today}.
VERIFIED SAFETY ALERTS: ${alerts}.
RECENT RECORDS: ${records}.`;
  };

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setThinking(true);
    try {
      const langName = LANGS.find((l) => l.code === lang)?.name || 'English';
      const answer = await base44.integrations.Core.InvokeLLM({
        prompt: `You are MedGuard's medication companion for elderly patients and their families. Answer in ${langName}, in short simple sentences suitable for someone aged 70+, using respectful everyday words.

STRICT RULES:
- Use ONLY the patient context below. If something is not in the records, say you do not have that information and suggest asking the doctor or caregiver.
- Never diagnose, never guess a disease, never suggest starting, stopping or changing a medicine or dose.
- For any safety concern, tell them to speak to the doctor or pharmacist.
- When explaining a safety alert, use the verified alert text provided — do not invent new interactions.
- Never claim a video proves medicine was swallowed; a video is a visual record reviewed by a caregiver.
- Keep it under 90 words unless the patient asks for more detail.
- Do not use markdown symbols like ** or #.

PATIENT CONTEXT:
${buildSystemContext()}

QUESTION: ${q}`,
      });
      const reply = typeof answer === 'string' ? answer : answer?.text || 'Sorry, I could not answer that just now.';
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      speak(reply);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'I could not reach the assistant just now. Please try again in a moment.' }]);
    } finally {
      setThinking(false);
    }
  };

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSpeechError('Voice input is not supported in this browser. You can type your question instead.');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    setSpeechError('');
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const heard = e.results[0][0].transcript;
      setListening(false);
      send(heard);
    };
    rec.onerror = () => {
      setListening(false);
      setSpeechError('We could not hear that. Please try again or type your question.');
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Multilingual voice assistant"
        title="Ask MedGuard"
        subtitle="Speak or type in your language. Answers come from your own medicines, alerts and records — never from guesswork."
        icon={Sparkles}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select value={lang} onChange={(e) => setLang(e.target.value)} className="mg-input h-11 w-[150px] pl-9 text-sm">
                {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <button
              onClick={() => { setSpeakReplies((s) => !s); window.speechSynthesis?.cancel(); }}
              className="mg-btn-ghost h-11 px-3 text-sm"
              title={speakReplies ? 'Mute spoken answers' : 'Speak answers aloud'}
            >
              {speakReplies ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="mg-card flex h-[560px] flex-col overflow-hidden">
          <div ref={scrollRef} className="mg-scroll-thin flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                  <Sparkles className="h-7 w-7" />
                </span>
                <p className="mt-3 text-[16px] font-bold text-foreground">ನಮಸ್ಕಾರ, {account.full_name?.split(' ')[0]}</p>
                <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
                  Ask about today’s medicines, a safety alert or a recent report. Tap the microphone and speak, or type below.
                </p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                    m.role === 'user' ? 'bg-primary text-white' : 'bg-muted text-foreground'
                  }`}>
                    {m.text}
                    {m.role === 'assistant' ? (
                      <button onClick={() => speak(m.text)} className="ml-2 inline-flex align-middle text-muted-foreground hover:text-primary" title="Read aloud">
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
            {thinking ? (
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Looking through your records…
              </div>
            ) : null}
          </div>

          <div className="border-t border-border p-4">
            {speechError ? <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">{speechError}</p> : null}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMic}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition ${listening ? 'bg-red-600 text-white' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                title={listening ? 'Stop listening' : 'Speak your question'}
              >
                {listening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={listening ? 'Listening…' : 'Type your question…'}
                className="mg-input flex-1"
              />
              <button onClick={() => send()} disabled={thinking} className="mg-btn-primary h-12 w-12 shrink-0 px-0" aria-label="Send">
                <Send className="h-4 w-4" />
              </button>
            </div>
            {messages.length > 0 ? (
              <button onClick={() => { setMessages([]); window.speechSynthesis?.cancel(); }} className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground">
                <RotateCcw className="h-3 w-3" /> Start a new conversation
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="mg-card p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Try asking</p>
            <div className="mt-2.5 space-y-2">
              {(SUGGESTIONS[lang] || SUGGESTIONS['en-IN']).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full rounded-xl border border-border px-3 py-2.5 text-left text-[12.5px] font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mg-card p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">How this works</p>
            <ul className="mt-2 space-y-2 text-[12px] leading-relaxed text-muted-foreground">
              <li>• Answers use only this patient’s medicines, alerts and records.</li>
              <li>• Interaction information comes from the verified dataset.</li>
              <li>• It will not diagnose or prescribe — it asks you to see your doctor.</li>
              <li>• Voice input needs microphone permission in your browser.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}