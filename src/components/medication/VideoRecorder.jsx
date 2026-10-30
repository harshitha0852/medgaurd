import React, { useEffect, useRef, useState } from 'react';
import { Camera, Square, ShieldCheck, RefreshCw, Loader2, Video, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { notifyCaregivers } from '@/lib/notify';

/**
 * Patient-initiated medication verification recording.
 * The camera only opens after an explicit tap, records only while the patient holds the button,
 * and the clip is stored privately. A video is a visual adherence record for human review —
 * it never proves that medicine was swallowed.
 */
export default function VideoRecorder({ patient, medication, log, onSubmitted }) {
  const videoRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const [state, setState] = useState('idle'); // idle | ready | recording | preview | uploading
  const [seconds, setSeconds] = useState(0);
  const [clip, setClip] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const openCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setState('ready');
    } catch {
      setError('Camera permission was not granted. Allow camera access in your browser, or report that you could not take the video.');
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    let mime = 'video/webm';
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) mime = 'video/webm;codecs=vp9';
      else if (!MediaRecorder.isTypeSupported('video/webm')) mime = '';
    }
    const recorder = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
    recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setClip(blob);
      const url = URL.createObjectURL(blob);
      if (videoRef.current) videoRef.current.srcObject = null;
      setState('preview');
      setTimeout(() => { if (videoRef.current) videoRef.current.src = url; }, 20);
    };
    recorder.start();
    recorderRef.current = recorder;
    setSeconds(0);
    setState('recording');
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const retake = () => {
    setClip(null);
    setSeconds(0);
    setState('idle');
    openCamera();
  };

  const submit = async () => {
    if (!clip) return;
    setState('uploading');
    setError('');
    try {
      const file = new File([clip], `verification-${Date.now()}.webm`, { type: 'video/webm' });
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const submittedAt = new Date().toISOString();

      await base44.entities.VerificationVideo.create({
        patient_email: patient.account_email,
        patient_name: patient.full_name,
        medication_id: medication?.id,
        medication_name: medication?.name || 'Medicine',
        log_id: log?.id,
        scheduled_date: log?.scheduled_date,
        scheduled_time: log?.scheduled_time,
        video_uri: file_uri,
        duration_sec: seconds,
        submitted_at: submittedAt,
        review_status: 'pending',
      });

      if (log?.id) {
        await base44.entities.MedicationLog.update(log.id, {
          status: 'awaiting_review',
          video_uri: file_uri,
          taken_at: submittedAt,
        });
      }

      await notifyCaregivers(patient.account_email, {
        type: 'verification',
        title: `New medicine video from ${patient.full_name}`,
        message: `A verification video was submitted for ${medication?.name || 'a medicine'}${log?.scheduled_time ? ` at ${log.scheduled_time}` : ''}. It is awaiting your review.`,
        link: '/video-review',
        severity: 'warning',
      });

      setState('done');
      onSubmitted?.();
    } catch (e) {
      setError('The video could not be uploaded. Please check your connection and try again.');
      setState('preview');
    }
  };

  if (state === 'done') {
    return (
      <div className="rounded-3xl border border-[hsl(var(--mint))]/30 bg-[hsl(var(--mint))]/6 p-6 text-center">
        <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-[hsl(var(--mint))]" />
        <p className="text-[15px] font-bold text-foreground">Video sent to your caregiver</p>
        <p className="mt-1 text-sm text-muted-foreground">It is now marked “Awaiting caregiver review”. You can still report the dose as missed if needed.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Video className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold text-foreground">Record a short verification video</p>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-foreground/90" style={{ aspectRatio: '4 / 3' }}>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay={state !== 'preview'}
          controls={state === 'preview'}
          className="h-full w-full object-cover"
        />
        {state === 'idle' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-white/90">
            <Camera className="h-9 w-9" />
            <p className="px-6 text-sm">Camera is off. It opens only when you tap below.</p>
          </div>
        ) : null}
        {state === 'recording' ? (
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> REC {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[13px] text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2.5">
        {state === 'idle' ? (
          <button onClick={openCamera} className="mg-btn-primary">
            <Camera className="h-4 w-4" /> Open camera
          </button>
        ) : null}
        {state === 'ready' ? (
          <button onClick={startRecording} className="mg-btn-primary">
            <Video className="h-4 w-4" /> Start recording
          </button>
        ) : null}
        {state === 'recording' ? (
          <button onClick={stopRecording} className="mg-btn bg-red-600 text-white">
            <Square className="h-4 w-4" /> Stop recording
          </button>
        ) : null}
        {state === 'preview' ? (
          <>
            <button onClick={submit} className="mg-btn-mint">
              <ShieldCheck className="h-4 w-4" /> Send to caregiver
            </button>
            <button onClick={retake} className="mg-btn-ghost">
              <RefreshCw className="h-4 w-4" /> Record again
            </button>
          </>
        ) : null}
        {state === 'uploading' ? (
          <button disabled className="mg-btn-primary">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading securely…
          </button>
        ) : null}
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
        The clip is stored privately and shared only with caregivers and clinicians you have authorised.
        It is a visual record for human review — not proof that the medicine was swallowed, and no facial recognition is used.
      </p>
    </div>
  );
}