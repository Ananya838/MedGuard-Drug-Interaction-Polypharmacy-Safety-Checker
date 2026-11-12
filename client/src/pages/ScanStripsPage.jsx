import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatients } from '../api/patients.js';
import { normalizeOcr } from '../api/medicines.js';
import { scanStrip } from '../ocr/index.js';
import { useI18n } from '../context/I18nContext.jsx';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import PrivacyPromiseBanner from '../components/common/PrivacyPromiseBanner.jsx';

import { ALL_KNOWN_MEDICINES } from '../ocr/knownMedicinesCatalog.js';

export default function ScanStripsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState('Extracting medicine text on-device...');
  const [useWebcam, setUseWebcam] = useState(false);
  const [webcamError, setWebcamError] = useState('');

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPatients();
        setPatients(data);
        if (data && data.length > 0 && !selectedPatientId) {
          setSelectedPatientId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load patients for scan page", err);
      }
    }
    load();
  }, []);

  // Handle webcam stream start/stop
  useEffect(() => {
    let stream = null;
    if (useWebcam) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'environment', width: 1280, height: 720 } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.error("Camera access error", err);
          setWebcamError("Could not access camera. Please upload an image file instead.");
          setUseWebcam(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [useWebcam]);

  const handleCaptureWebcam = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setPreviewImage(dataUrl);
    setSelectedFile(null);
    setUseWebcam(false);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file.");
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target.result);
      setUseWebcam(false);
    };
    reader.readAsDataURL(file);
  };

  const handleStartOcr = async () => {
    setIsProcessing(true);
    setOcrProgress(15);
    setOcrStatusText("Running on-device OCR in Web Worker...");

    try {
      // 1. Run local on-device OCR using Web Worker with 380+ medicine catalog
      const ocrResults = await scanStrip(
        selectedFile || previewImage,
        ALL_KNOWN_MEDICINES,
        (pct) => setOcrProgress(Math.min(90, Math.max(15, Math.round(pct * 100))))
      );

      setOcrStatusText("Resolving formulations against catalog...");
      setOcrProgress(95);

      // Collect candidate queries to send to server normalization
      // Send both matched and raw candidate strings so the server's PostgreSQL database (318+ Indian brands, ingredients, RxNorm) can resolve them
      const queriesToSend = [];
      const seenQueries = new Set();

      for (const r of (ocrResults || [])) {
        const text = (r.matchedName || r.rawText || '').trim();
        if (text && text.length >= 3 && !seenQueries.has(text.toLowerCase())) {
          seenQueries.add(text.toLowerCase());
          queriesToSend.push(text);
        }
      }

      let detectedItems = [];
      let unrecognizedList = [];

      if (queriesToSend.length > 0) {
        try {
          const normData = await normalizeOcr(queriesToSend);
          if (normData?.resolved?.length > 0) {
            detectedItems = normData.resolved.map((res) => ({
              id: res.brandId,
              name: res.brandName,
              form: res.form || 'Tablet',
              activeSalt: res.ingredients?.map((i) => `${i.name} ${i.strengthMg || ''}mg`.trim()).join(' + ') || res.brandName,
              dosage: '1 tablet daily',
              frequency: 'Once daily',
              timing: 'Morning',
              confidence: 'Verified in Catalog'
            }));
          }
          if (normData?.unresolved?.length > 0) {
            // Also check if any unresolved candidate had a high local Fuse match
            for (const unres of normData.unresolved) {
              const q = typeof unres === 'string' ? unres : unres.query;
              const localMatch = (ocrResults || []).find((r) => (r.matchedName === q || r.rawText === q) && r.status === 'matched');
              if (localMatch?.matchedName && !detectedItems.some((d) => d.name === localMatch.matchedName)) {
                detectedItems.push({
                  id: detectedItems.length + 1,
                  name: localMatch.matchedName,
                  form: 'Tablet',
                  activeSalt: localMatch.matchedName,
                  dosage: '1 tablet daily',
                  frequency: 'Once daily',
                  timing: 'Morning',
                  confidence: 'Exact Match'
                });
              } else {
                unrecognizedList.push(q);
              }
            }
          }
        } catch (normErr) {
          console.warn("Catalog normalization fallback", normErr);
          // If server normalization fails, fallback to local OCR results
          const matched = (ocrResults || []).filter((r) => r.status === 'matched' || r.status === 'check_this');
          const unrec = (ocrResults || []).filter((r) => r.status === 'unrecognized');
          detectedItems = matched.map((r, idx) => ({
            id: idx + 1,
            name: r.matchedName || r.rawText,
            form: 'Tablet',
            activeSalt: r.matchedName || r.rawText,
            dosage: '1 tablet daily',
            frequency: 'Once daily',
            timing: 'Morning',
            confidence: r.status === 'matched' ? 'Exact Match' : 'Review Match'
          }));
          unrecognizedList = unrec.map((r) => r.rawText);
        }
      }

      const pat = patients.find((p) => p.id === selectedPatientId) || patients[0];

      navigate('/confirm', {
        state: {
          patientId: pat?.id || selectedPatientId,
          patientName: pat?.name || 'Elder Dependent',
          detectedItems: detectedItems.length > 0 ? detectedItems : [],
          unrecognizedList: unrecognizedList || []
        }
      });
    } catch (err) {
      console.error("On-device OCR error", err);
      // Graceful fallback to user confirm screen with notice
      const pat = patients.find((p) => p.id === selectedPatientId) || patients[0];
      navigate('/confirm', {
        state: {
          patientId: pat?.id || selectedPatientId,
          patientName: pat?.name || 'Elder Dependent',
          unrecognizedList: ['Packaging photo could not be read clearly. Please verify or add medicine manually.']
        }
      });
    } finally {
      setIsProcessing(false);
      setOcrProgress(0);
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-lg max-w-4xl mx-auto">
      <div>
        <h1 className="font-headline-lg font-bold text-on-surface">
          {t('scanScreen.title', 'Scan Medicine Packaging')}
        </h1>
        <p className="font-body-md text-on-surface-variant">
          {t('scanScreen.subtitle', 'Take a photo or upload packaging images to automatically identify medicines.')}
        </p>
      </div>

      {/* Mandatory Privacy Guarantee */}
      <PrivacyPromiseBanner />

      {/* Elder Selector */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <label htmlFor="select-elder" className="font-label-lg font-bold text-on-surface">
          {t('scanScreen.selectElder', 'Assign scan to elder:')}
        </label>
        <select
          id="select-elder"
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          className="h-12 px-4 rounded-xl border-2 border-border-strong bg-surface-container-low font-body-lg text-on-surface focus:outline-none focus:border-primary"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.age} yrs)
            </option>
          ))}
        </select>
      </Card>

      {/* Camera / Upload Box */}
      <Card className="flex flex-col items-center justify-center min-h-[380px] p-space-xl border-2 border-dashed border-border-strong relative bg-surface-container-lowest">
        {isProcessing ? (
          <div className="flex flex-col items-center gap-space-md py-12 max-w-md w-full px-4">
            <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <div className="flex flex-col items-center text-center">
              <span className="font-label-lg text-primary font-bold">
                {ocrStatusText} ({ocrProgress}%)
              </span>
              <span className="text-on-surface-variant font-body-md text-[14px] mt-1">
                Zero cloud upload: Tesseract.js running 100% locally in Web Worker
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-primary h-full transition-all duration-300 rounded-full"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
          </div>
        ) : previewImage ? (
          <div className="flex flex-col items-center gap-space-md w-full">
            <img
              src={previewImage}
              alt="Uploaded strip preview"
              className="max-h-[340px] w-auto rounded-xl object-contain shadow-md"
            />
            <div className="flex items-center gap-space-md">
              <Button
                variant="secondary"
                onClick={() => setPreviewImage(null)}
              >
                Retake / Change Image
              </Button>
              <Button
                variant="primary"
                onClick={handleStartOcr}
                className="gap-2 shadow-md"
              >
                <span className="material-symbols-outlined text-[20px]">document_scanner</span>
                <span>{t('scanScreen.startOcr', 'Extract Medicines')}</span>
              </Button>
            </div>
          </div>
        ) : useWebcam ? (
          <div className="flex flex-col items-center gap-space-md w-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full max-w-lg rounded-xl bg-black shadow-md"
            />
            <div className="flex items-center gap-space-md">
              <Button
                variant="secondary"
                onClick={() => setUseWebcam(false)}
              >
                Cancel Camera
              </Button>
              <Button
                variant="primary"
                onClick={handleCaptureWebcam}
                className="gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">camera</span>
                <span>Capture Photo</span>
              </Button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="flex flex-col items-center justify-center text-center gap-space-md w-full cursor-pointer py-8"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-20 h-20 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[44px]">photo_camera</span>
            </div>
            <div className="flex flex-col gap-1 max-w-md">
              <span className="font-headline-sm font-bold text-on-surface">
                {t('scanScreen.dragDropText', 'Drag and drop medicine strip photos here, or click to browse')}
              </span>
              <span className="font-body-md text-on-surface-variant text-[15px]">
                Accepts JPG, PNG, WEBP blister strips, bottles, or box images
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-space-md mt-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                <span>Browse Files</span>
              </Button>

              <Button
                variant="secondary"
                onClick={() => setUseWebcam(true)}
                className="gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">videocam</span>
                <span>{t('scanScreen.webcamCapture', 'Use Camera')}</span>
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])}
            />

            {webcamError && (
              <span className="text-error font-label-sm mt-2">{webcamError}</span>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

