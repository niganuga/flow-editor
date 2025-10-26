'use client';

import { useState } from 'react';

export default function BackgroundRemovalTestPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [v1Result, setV1Result] = useState<any>(null);
  const [v2Result, setV2Result] = useState<any>(null);
  const [status, setStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [preserveAlpha, setPreserveAlpha] = useState(true);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageUrl(event.target?.result as string);
        setV1Result(null);
        setV2Result(null);
        setStatus('');
      };
      reader.readAsDataURL(file);
    }
  };

  const runTest = async () => {
    if (!imageUrl) return;

    setIsProcessing(true);
    setV1Result(null);
    setV2Result(null);

    try {
      // V1 Test
      setStatus('⏳ Processing with V1 (Bria RMBG 1.4)...');
      const v1Response = await fetch('/api/ai-tools/background-removal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          includeQualityValidation: true,
        }),
      });

      if (!v1Response.ok) {
        const v1Error = await v1Response.json();
        throw new Error(`V1 Error: ${v1Error.error || 'Unknown error'}`);
      }

      const v1Data = await v1Response.json();
      setV1Result(v1Data);

      // V2 Test
      setStatus('⏳ Processing with V2 (BRIA RMBG 2.0)...');
      const v2Response = await fetch('/api/ai-tools/background-removal-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          settings: {
            preserve_alpha: preserveAlpha,
            fallback_to_v1: false,
          },
          includeQualityValidation: true,
        }),
      });

      if (!v2Response.ok) {
        const v2Error = await v2Response.json();
        throw new Error(`V2 Error: ${v2Error.error || 'Unknown error'}`);
      }

      const v2Data = await v2Response.json();
      setV2Result(v2Data);

      // Show comparison summary
      const timeDiff = v2Data.duration - v1Data.duration;
      const costDiff = (v2Data.cost / v1Data.cost).toFixed(1);
      setStatus(
        `✅ Processing complete! V2 took ${timeDiff > 0 ? '+' : ''}${timeDiff}ms (${costDiff}x cost)`
      );
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
      console.error('Test error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-400 mb-2">
            Real Image Test - Background Removal V1 vs V2
          </h1>
          <p className="text-gray-400">Test with: "Girls Will Be Girls" illustration</p>
        </div>

        {/* Info Box */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-400 mb-3">About This Test</h2>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>
              <strong>V1 Model:</strong> Bria RMBG 1.4 ($0.003/image)
            </li>
            <li>
              <strong>V2 Model:</strong> BRIA RMBG 2.0 ($0.018/image)
            </li>
            <li>
              <strong>Expected Results:</strong> V2 should provide better edge detail and 256-level
              alpha transparency
            </li>
          </ul>
        </div>

        {/* Controls */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-400 mb-4">Upload Test Image</h2>

          <label className="block text-sm text-gray-400 mb-2">Select an image to test:</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded text-white mb-4"
          />

          <label className="flex items-center gap-2 mb-4 text-sm">
            <input
              type="checkbox"
              checked={preserveAlpha}
              onChange={(e) => setPreserveAlpha(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-gray-300">Preserve alpha channel (V2 only)</span>
          </label>

          <button
            onClick={runTest}
            disabled={!imageUrl || isProcessing}
            className="px-6 py-3 bg-blue-500 text-black font-semibold rounded hover:bg-blue-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Test Background Removal (V1 vs V2)'}
          </button>

          {status && (
            <div
              className={`mt-4 p-3 rounded text-sm ${
                status.startsWith('✅')
                  ? 'bg-green-900/30 text-green-400'
                  : status.startsWith('❌')
                    ? 'bg-red-900/30 text-red-400'
                    : 'bg-yellow-900/30 text-yellow-400'
              }`}
            >
              {status}
            </div>
          )}
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Original */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-center font-semibold text-blue-400 mb-4">Original Image</h3>
            <div
              className="relative w-full aspect-square bg-gradient-to-br from-gray-800 to-gray-900 rounded overflow-hidden"
              style={{
                backgroundImage:
                  'repeating-conic-gradient(#808080 0% 25%, #404040 0% 50%) 50% / 20px 20px',
              }}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="Original" className="w-full h-full object-contain" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                  Upload an image to begin
                </div>
              )}
            </div>
          </div>

          {/* V1 Output */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-center font-semibold text-blue-400 mb-4">
              V1 Output (Bria RMBG 1.4)
            </h3>
            <div
              className="relative w-full aspect-square bg-gradient-to-br from-gray-800 to-gray-900 rounded overflow-hidden"
              style={{
                backgroundImage:
                  'repeating-conic-gradient(#808080 0% 25%, #404040 0% 50%) 50% / 20px 20px',
              }}
            >
              {v1Result?.output ? (
                <img src={v1Result.output} alt="V1 Output" className="w-full h-full object-contain" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                  {isProcessing && !v1Result ? 'Processing...' : 'Waiting for test...'}
                </div>
              )}
            </div>
            {v1Result && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Processing Time:</span>
                  <span className="font-semibold">{v1Result.duration}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Cost:</span>
                  <span className="font-semibold">${v1Result.cost.toFixed(4)}</span>
                </div>
              </div>
            )}
          </div>

          {/* V2 Output */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-center font-semibold text-blue-400 mb-4">
              V2 Output (BRIA RMBG 2.0)
            </h3>
            <div
              className="relative w-full aspect-square bg-gradient-to-br from-gray-800 to-gray-900 rounded overflow-hidden"
              style={{
                backgroundImage:
                  'repeating-conic-gradient(#808080 0% 25%, #404040 0% 50%) 50% / 20px 20px',
              }}
            >
              {v2Result?.output ? (
                <img src={v2Result.output} alt="V2 Output" className="w-full h-full object-contain" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                  {isProcessing && v1Result && !v2Result ? 'Processing...' : 'Waiting for test...'}
                </div>
              )}
            </div>
            {v2Result && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Processing Time:</span>
                  <span className="font-semibold">{v2Result.duration}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Cost:</span>
                  <span className="font-semibold">${v2Result.cost.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Alpha Levels:</span>
                  <span className="font-semibold">256</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Expected Differences */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mt-8">
          <h2 className="text-lg font-semibold text-blue-400 mb-3">Expected Differences</h2>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>
              <strong>Edge Quality:</strong> V2 should have smoother, more accurate edges
            </li>
            <li>
              <strong>Alpha Channel:</strong> V2 provides 256-level transparency vs V1's binary
              transparency
            </li>
            <li>
              <strong>Fine Details:</strong> V2 preserves hair, fur, and complex edges better
            </li>
            <li>
              <strong>Cost:</strong> V2 is 6x more expensive ($0.018 vs $0.003)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
