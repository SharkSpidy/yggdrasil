import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { resolveUploadLink, submitPhoto } from "../lib/supabaseClient";
import { getCroppedSquareJpeg } from "../lib/cropImage";

type Stage = "checking" | "invalid" | "picking" | "cropping" | "uploading" | "done" | "error";

interface UploadPageProps {
  token: string;
}

export default function UploadPage({ token }: UploadPageProps) {
  const [stage, setStage] = useState<Stage>("checking");
  const [personName, setPersonName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    resolveUploadLink(token)
      .then((result) => {
        setPersonName(result.personName);
        setStage("picking");
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : "This link isn't valid.");
        setStage("invalid");
      });
  }, [token]);

  const handleFileChosen = (file: File | undefined) => {
    if (!file) return;
    setImageSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setStage("cropping");
  };

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setStage("uploading");
    try {
      const blob = await getCroppedSquareJpeg(imageSrc, croppedAreaPixels);
      await submitPhoto(token, blob);
      setStage("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong uploading your photo.");
      setStage("error");
    }
  };

  return (
    <div className="upload-page">
      <div className="upload-card">
        <p className="upload-brand">Yggdrasil — The Family Record</p>

        {stage === "checking" && <p className="upload-status">Checking your link…</p>}

        {stage === "invalid" && (
          <>
            <h1>That link isn't working</h1>
            <p className="upload-status">{errorMessage} Double-check the link, or ask for a fresh one.</p>
          </>
        )}

        {stage === "picking" && (
          <>
            <h1>Hi, {personName} 👋</h1>
            <p className="upload-status">
              Pick a clear photo of yourself. You'll be able to crop it to a square before it's sent in.
            </p>
            <label className="upload-file-btn">
              Choose a photo
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChosen(e.target.files?.[0])}
                hidden
              />
            </label>
          </>
        )}

        {stage === "cropping" && imageSrc && (
          <>
            <h1>Frame your photo</h1>
            <p className="upload-status">Drag to reposition, pinch or scroll to zoom.</p>
            <div className="upload-cropper">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="upload-zoom"
              aria-label="Zoom"
            />
            <div className="upload-actions">
              <button className="upload-btn upload-btn--ghost" onClick={() => setStage("picking")}>
                Choose a different photo
              </button>
              <button className="upload-btn" onClick={handleConfirm} disabled={!croppedAreaPixels}>
                Use this photo
              </button>
            </div>
          </>
        )}

        {stage === "uploading" && <p className="upload-status">Uploading…</p>}

        {stage === "done" && (
          <>
            <h1>Thank you! 🌿</h1>
            <p className="upload-status">
              Your photo has been sent in and will appear on the tree once it's reviewed.
            </p>
          </>
        )}

        {stage === "error" && (
          <>
            <h1>Upload didn't go through</h1>
            <p className="upload-status">{errorMessage}</p>
            <div className="upload-actions">
              <button className="upload-btn" onClick={() => setStage("cropping")}>
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
