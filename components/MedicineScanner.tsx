'use client';

import React, { useState } from 'react';
import { Camera, Upload, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface MedicineScannerProps {
  onMedicineExtracted: (medicineName: string) => void;
}

export default function MedicineScanner({ onMedicineExtracted }: MedicineScannerProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [extractedMedicine, setExtractedMedicine] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [showExtractedText, setShowExtractedText] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setExtractedMedicine(null);
      setErrorMessage(null);
      setExtractedText('');
      setShowExtractedText(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setExtractedMedicine(null);
    setErrorMessage(null);
    setExtractedText('');
    setShowExtractedText(false);
  };

  const analyzeMedicine = async () => {
    if (!selectedImage) return;

    setScanning(true);
    setExtractedMedicine(null);
    setErrorMessage(null);
    setExtractedText('');

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const res = await fetch('/api/ocr-scan', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setExtractedMedicine(data.medicine_name);
        setExtractedText(data.extracted_text || '');
        onMedicineExtracted(data.medicine_name);
      } else {
        const error = await res.json();
        setErrorMessage(error.message || 'Could not identify medicine');
        setExtractedText(error.extracted_text || '');
      }
    } catch (error) {
      console.error('Error scanning medicine:', error);
      setErrorMessage('Error scanning image. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Camera className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-800">Medicine Photo Scanner</h2>
      </div>
      
      <p className="text-gray-600 mb-4">Upload a photo of your medicine and AI will extract the name</p>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        {!imagePreview ? (
          <label className="cursor-pointer block">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
            <p className="text-sm text-gray-500">PNG, JPG up to 10MB</p>
          </label>
        ) : (
          <div>
            <img
              src={imagePreview}
              alt="Medicine preview"
              className="max-w-full max-h-64 mx-auto rounded-lg mb-4"
            />
            <button
              onClick={removeImage}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Remove Image
            </button>
          </div>
        )}
      </div>

      {selectedImage && !extractedMedicine && !errorMessage && (
        <button
          onClick={analyzeMedicine}
          disabled={scanning}
          className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {scanning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Camera className="w-5 h-5" />
              Analyze Medicine
            </>
          )}
        </button>
      )}

      {extractedMedicine && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-800 font-semibold mb-2">Medicine identified successfully!</p>
              <p className="text-green-700 text-lg font-bold">{extractedMedicine}</p>
              
              {extractedText && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowExtractedText(!showExtractedText)}
                    className="text-sm text-green-700 hover:text-green-800 font-medium underline"
                  >
                    {showExtractedText ? 'Hide' : 'View'} extracted text
                  </button>
                  {showExtractedText && (
                    <div className="mt-2 text-xs text-green-700 bg-green-100 p-3 rounded whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {extractedText}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-semibold">{errorMessage}</p>              
              {/* Manual input fallback */}
              <div className="mt-3 pt-3 border-t border-red-200">
                <p className="text-sm text-red-700 mb-2">💡 Type medicine name manually:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter medicine name..."
                    className="flex-1 px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget;
                        if (input.value.trim()) {
                          onMedicineExtracted(input.value.trim());
                          setExtractedMedicine(input.value.trim());
                          setErrorMessage(null);
                        }
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      if (input.value.trim()) {
                        onMedicineExtracted(input.value.trim());
                        setExtractedMedicine(input.value.trim());
                        setErrorMessage(null);
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    Use This
                  </button>
                </div>
              </div>              
              {extractedText && (
                <div className="mt-3">
                  <p className="text-xs text-red-700 font-semibold mb-1">Extracted text from image:</p>
                  <p className="text-xs text-red-700 p-2 bg-red-100 rounded whitespace-pre-wrap">{extractedText}</p>
                </div>
              )}

              <div className="mt-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">
                  <strong>Tip:</strong> Take a clear photo of the medicine packaging with good lighting and visible printed text.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
