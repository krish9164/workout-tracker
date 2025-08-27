import { useEffect, useRef, useState } from "react";

type Props = {
  onUploaded: (result: any) => void;
};

export default function VoiceCapture({ onUploaded }: Props) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const chunks = useRef<BlobPart[]>([]);

  useEffect(() => {
    return () => { if (rec && rec.state !== "inactive") rec.stop(); };
  }, [rec]);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunks.current = [];
    mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    mr.onstop = async () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      console.log("Uploaded audio size (bytes):", blob.size);
      const form = new FormData();
      form.append("file", blob, "audio.webm");
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${import.meta.env.VITE_API_URL}/voice/log`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      const data = await res.json();
      onUploaded(data);
    };
    mr.start();
    setRec(mr);
    setRecording(true);
  }

  function stop() {
    rec?.stop();
    setRecording(false);
  }

  return (
    <button
      onMouseDown={start}
      onMouseUp={stop}
      onTouchStart={start}
      onTouchEnd={stop}
      className={`btn ${recording ? "btn-primary" : "btn-ghost"}`}
      title="Hold to record"
    >
      {recording ? "Recording… Release to upload" : "🎤 Hold to record"}
    </button>
  );
}
