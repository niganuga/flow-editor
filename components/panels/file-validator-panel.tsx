"use client"
import { useState, useEffect, type ChangeEvent } from "react"
import { DraggablePanel } from "@/components/draggable-panel"
import { AlertCircle, CheckCircle, XCircle, ImageIcon } from "lucide-react"
import { useImageStore } from "@/lib/image-store"
import { ImageComparisonSlider } from "@/components/ui/image-comparison-slider"

interface ValidationCheck {
  name: string
  valid: boolean
  error?: string
  value?: string
  dimensions?: { width: number; height: number }
}

interface TransparencyAnalysis {
  opaque: { count: number; percentage: string }
  transparent: { count: number; percentage: string }
  semiTransparent: { count: number; percentage: string }
}

export function FileValidatorPanel({ onClose, zIndex, isActive, onFocus }: { onClose: () => void; zIndex?: number; isActive?: boolean; onFocus?: () => void }) {
  const { imageFile, imageName, imageUrl } = useImageStore()
  const [validationResults, setValidationResults] = useState<{
    fileName: string
    checks: ValidationCheck[]
    valid: boolean
  } | null>(null)
  const [transparencyAnalysis, setTransparencyAnalysis] = useState<TransparencyAnalysis | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analysisPreviewUrl, setAnalysisPreviewUrl] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [printWidthInches, setPrintWidthInches] = useState<string>("")
  const [printHeightInches, setPrintHeightInches] = useState<string>("")

  const validateFileType = (file: File): ValidationCheck => {
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if (!validTypes.includes(file.type)) {
      return { name: "File Type", valid: false, error: `Invalid: ${file.type}` }
    }
    return { name: "File Type", valid: true, value: file.type }
  }

  const validateFileSize = (file: File): ValidationCheck => {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const minSize = 1024 // 1KB

    if (file.size > maxSize) {
      return {
        name: "File Size",
        valid: false,
        error: `Too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 10MB)`,
      }
    }

    if (file.size < minSize) {
      return { name: "File Size", valid: false, error: "Too small (corrupted?)" }
    }

    return {
      name: "File Size",
      valid: true,
      value: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    }
  }

  const validateFileName = (file: File): ValidationCheck => {
    const maxLength = 255
    const invalidChars = /[<>:"|?*]/

    if (file.name.length > maxLength) {
      return { name: "File Name", valid: false, error: "Name too long" }
    }

    if (invalidChars.test(file.name)) {
      return { name: "File Name", valid: false, error: "Invalid characters" }
    }

    return { name: "File Name", valid: true, value: file.name }
  }

  const validateImageDimensions = (file: File): Promise<ValidationCheck> => {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)

        const width = img.width
        const height = img.height
        const minDimension = 100
        const maxDimension = 8000

        if (width < minDimension || height < minDimension) {
          resolve({
            name: "Dimensions",
            valid: false,
            error: `Too small: ${width}×${height}px (min 100×100px)`,
          })
          return
        }

        if (width > maxDimension || height > maxDimension) {
          resolve({
            name: "Dimensions",
            valid: false,
            error: `Too large: ${width}×${height}px (max 8000×8000px)`,
          })
          return
        }

        resolve({
          name: "Dimensions",
          valid: true,
          value: `${width}×${height}px`,
          dimensions: { width, height },
        })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve({
          name: "Dimensions",
          valid: false,
          error: "Failed to load (corrupted?)",
        })
      }

      img.src = url
    })
  }

  const analyzeTransparency = (imageData: ImageData): TransparencyAnalysis => {
    const pixels = imageData.data
    const totalPixels = pixels.length / 4

    let opaqueCount = 0
    let transparentCount = 0
    let semiTransparentCount = 0

    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3]

      if (alpha === 255) {
        opaqueCount++
      } else if (alpha === 0) {
        transparentCount++
      } else {
        semiTransparentCount++
      }
    }

    return {
      opaque: {
        count: opaqueCount,
        percentage: ((opaqueCount / totalPixels) * 100).toFixed(2),
      },
      transparent: {
        count: transparentCount,
        percentage: ((transparentCount / totalPixels) * 100).toFixed(2),
      },
      semiTransparent: {
        count: semiTransparentCount,
        percentage: ((semiTransparentCount / totalPixels) * 100).toFixed(2),
      },
    }
  }

  const generateTransparencyPreview = (imageData: ImageData): string => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!
    canvas.width = imageData.width
    canvas.height = imageData.height

    const previewData = ctx.createImageData(imageData.width, imageData.height)
    const pixels = imageData.data
    const preview = previewData.data

    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3]

      if (alpha === 255) {
        // Opaque → Black
        preview[i] = 0
        preview[i + 1] = 0
        preview[i + 2] = 0
        preview[i + 3] = 255
      } else if (alpha === 0) {
        // Transparent → Checkerboard
        const x = (i / 4) % imageData.width
        const y = Math.floor(i / 4 / imageData.width)
        const checkSize = 8
        const isLight = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2

        preview[i] = isLight ? 200 : 150
        preview[i + 1] = isLight ? 200 : 150
        preview[i + 2] = isLight ? 200 : 150
        preview[i + 3] = 255
      } else {
        // Semi-transparent → Red
        preview[i] = 255
        preview[i + 1] = 0
        preview[i + 2] = 0
        preview[i + 3] = 255
      }
    }

    ctx.putImageData(previewData, 0, 0)
    return canvas.toDataURL("image/png")
  }

  // NEW: Generate analysis overlay with opaque black, transparent grid, and red semi-transparent highlights
  const generateAnalysisOverlay = (imageData: ImageData): string => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!
    canvas.width = imageData.width
    canvas.height = imageData.height

    const overlayData = ctx.createImageData(imageData.width, imageData.height)
    const pixels = imageData.data
    const overlay = overlayData.data

    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3]
      const x = (i / 4) % imageData.width
      const y = Math.floor(i / 4 / imageData.width)

      if (alpha === 255) {
        // Opaque → Black overlay
        overlay[i] = 0
        overlay[i + 1] = 0
        overlay[i + 2] = 0
        overlay[i + 3] = 255
      } else if (alpha === 0) {
        // Transparent → White/gray checkerboard grid
        const checkSize = 8
        const isLight = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2

        overlay[i] = isLight ? 255 : 220
        overlay[i + 1] = isLight ? 255 : 220
        overlay[i + 2] = isLight ? 255 : 220
        overlay[i + 3] = 255
      } else {
        // Semi-transparent → Bright red highlight
        overlay[i] = 255
        overlay[i + 1] = 0
        overlay[i + 2] = 0
        overlay[i + 3] = 255
      }
    }

    ctx.putImageData(overlayData, 0, 0)
    return canvas.toDataURL("image/png")
  }

  const analyzeImageTransparency = (file: File): Promise<ValidationCheck> => {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")!
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, img.width, img.height)

        const analysis = analyzeTransparency(imageData)
        const preview = generateTransparencyPreview(imageData)
        const analysisOverlay = generateAnalysisOverlay(imageData)

        setTransparencyAnalysis(analysis)
        setPreviewUrl(preview)
        setAnalysisPreviewUrl(analysisOverlay)

        URL.revokeObjectURL(url)

        // Check if image has transparency
        const transparentPercentage = parseFloat(analysis.transparent.percentage)
        const hasTransparency = transparentPercentage > 0

        if (!hasTransparency) {
          resolve({
            name: "Transparency Check",
            valid: false,
            error: "No transparency - needs transparent BG"
          })
        } else {
          resolve({
            name: "Transparency Check",
            valid: true,
            value: `${transparentPercentage.toFixed(1)}% transparent`
          })
        }
      }

      img.src = url
    })
  }

  const validateFile = async (file: File) => {
    setIsValidating(true)

    const results = {
      fileName: file.name,
      checks: [] as ValidationCheck[],
      valid: true,
    }

    // Run all validations
    results.checks.push(validateFileType(file))
    results.checks.push(validateFileSize(file))
    results.checks.push(validateFileName(file))
    results.checks.push(await validateImageDimensions(file))

    // Check if any validation failed
    results.valid = results.checks.every((check) => check.valid)

    const dimensionsCheck = results.checks.find(
      (check) => check.name === "Dimensions" && check.valid && check.dimensions,
    )
    setImageDimensions(dimensionsCheck?.dimensions ?? null)

    // Run transparency analysis and add to checks
    const transparencyCheck = await analyzeImageTransparency(file)
    results.checks.push(transparencyCheck)

    // Recheck if any validation failed (including transparency)
    results.valid = results.checks.every((check) => check.valid)

    setValidationResults(results)
    setIsValidating(false)
  }

  useEffect(() => {
    if (imageFile) {
      validateFile(imageFile)
    } else {
      setValidationResults(null)
      setTransparencyAnalysis(null)
      setPreviewUrl(null)
      setAnalysisPreviewUrl(null)
      setImageDimensions(null)
    }
  }, [imageFile])

  useEffect(() => {
    if (imageDimensions) {
      const defaultWidth = imageDimensions.width / 300
      const defaultHeight = imageDimensions.height / 300
      setPrintWidthInches(defaultWidth.toFixed(2))
      setPrintHeightInches(defaultHeight.toFixed(2))
    } else {
      setPrintWidthInches("")
      setPrintHeightInches("")
    }
  }, [imageDimensions])

  const desiredPrintDpi = 300
  const parsedPrintWidth = parseFloat(printWidthInches)
  const parsedPrintHeight = parseFloat(printHeightInches)
  const hasValidPrintSize =
    imageDimensions &&
    !Number.isNaN(parsedPrintWidth) &&
    parsedPrintWidth > 0 &&
    !Number.isNaN(parsedPrintHeight) &&
    parsedPrintHeight > 0

  const targetWidthPx = hasValidPrintSize ? Math.ceil(parsedPrintWidth * desiredPrintDpi) : null
  const targetHeightPx = hasValidPrintSize ? Math.ceil(parsedPrintHeight * desiredPrintDpi) : null
  const widthDpi = hasValidPrintSize ? imageDimensions.width / parsedPrintWidth : null
  const heightDpi = hasValidPrintSize ? imageDimensions.height / parsedPrintHeight : null
  const limitingDpi = widthDpi !== null && heightDpi !== null ? Math.min(widthDpi, heightDpi) : null
  const needsUpscale = limitingDpi !== null ? limitingDpi < desiredPrintDpi : false
  const rawWidthScale = targetWidthPx && imageDimensions ? targetWidthPx / imageDimensions.width : null
  const rawHeightScale = targetHeightPx && imageDimensions ? targetHeightPx / imageDimensions.height : null
  const requiredScale = Math.max(rawWidthScale ?? 1, rawHeightScale ?? 1)
  const availableScaleSteps = [2, 4, 6, 8]
  const recommendedScaleFactor = needsUpscale
    ? availableScaleSteps.find((factor) => factor >= requiredScale) ?? null
    : null
  const recommendedResolution =
    recommendedScaleFactor && imageDimensions
      ? `${(imageDimensions.width * recommendedScaleFactor).toLocaleString()} × ${(imageDimensions.height * recommendedScaleFactor).toLocaleString()} px`
      : targetWidthPx && targetHeightPx
        ? `${targetWidthPx.toLocaleString()} × ${targetHeightPx.toLocaleString()} px`
        : null
  const currentResolution = imageDimensions
    ? `${imageDimensions.width.toLocaleString()} × ${imageDimensions.height.toLocaleString()} px`
    : null
  const aspectRatio = imageDimensions ? imageDimensions.width / imageDimensions.height : null
  const formattedPrintWidth = hasValidPrintSize ? parsedPrintWidth.toFixed(2) : null
  const formattedPrintHeight = hasValidPrintSize ? parsedPrintHeight.toFixed(2) : null
  const printSizeDisplay =
    formattedPrintWidth && formattedPrintHeight ? `${formattedPrintWidth}″ × ${formattedPrintHeight}″` : null
  const effectiveDpiDisplay = limitingDpi !== null ? Math.floor(limitingDpi) : null
  const widthDpiDisplay = widthDpi !== null ? Math.floor(widthDpi) : null
  const heightDpiDisplay = heightDpi !== null ? Math.floor(heightDpi) : null

  const handlePrintWidthChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setPrintWidthInches(value)

    if (!imageDimensions || !aspectRatio) {
      return
    }

    if (value.trim() === "") {
      setPrintHeightInches("")
      return
    }

    const numeric = Number(value)
    if (Number.isNaN(numeric) || numeric <= 0) {
      return
    }

    const newHeight = numeric / aspectRatio
    if (Number.isFinite(newHeight)) {
      setPrintHeightInches(newHeight.toFixed(2))
    }
  }

  const handlePrintHeightChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setPrintHeightInches(value)

    if (!imageDimensions || !aspectRatio) {
      return
    }

    if (value.trim() === "") {
      setPrintWidthInches("")
      return
    }

    const numeric = Number(value)
    if (Number.isNaN(numeric) || numeric <= 0) {
      return
    }

    const newWidth = numeric * aspectRatio
    if (Number.isFinite(newWidth)) {
      setPrintWidthInches(newWidth.toFixed(2))
    }
  }

  return (
    <DraggablePanel
      title="File Validator"
      onClose={onClose}
      defaultPosition={{ x: 20, y: 70 }}
      zIndex={zIndex}
      isActive={isActive}
      onFocus={onFocus}
      defaultSize={{ width: 360, height: 550 }}
    >
      <div className="p-3 space-y-3">
        {!imageFile ? (
          <div className="p-4 border border-foreground bg-card rounded-lg">
            <div className="flex flex-col items-center gap-2 text-center">
              <ImageIcon className="w-10 h-10 text-muted-foreground" strokeWidth={2} />
              <div>
                <p className="font-bold text-sm">No Image Yet</p>
                <p className="text-xs text-muted-foreground mt-1">Drop or choose a file to run checks.</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {isValidating && (
              <div className="text-center py-3">
                <p className="font-bold text-sm">Checking...</p>
              </div>
            )}

            {validationResults && (
              <div className="space-y-2">
                <div
                  className={`p-2 border rounded-lg ${
                    validationResults.valid ? "bg-green-50 border-green-600" : "bg-red-50 border-red-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {validationResults.valid ? (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" strokeWidth={2.5} />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" strokeWidth={2.5} />
                    )}
                    <p className="font-bold text-xs">
                      {validationResults.valid ? "Image Looks Good" : "Check Failed"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  {validationResults.checks.map((check, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        check.valid ? "bg-card/70" : "bg-red-50"
                      }`}
                    >
                      <span className="font-bold text-xs">{check.name}</span>
                      <div className="flex items-center gap-1.5">
                            {check.valid ? (
                              <>
                                {check.name === "Dimensions" && printSizeDisplay && effectiveDpiDisplay !== null ? (
                                  <div className="flex flex-col items-end text-right">
                                    <span className="text-xs text-muted-foreground">{check.value}</span>
                                    <span className="text-[0.6rem] text-muted-foreground">
                                      Print: {printSizeDisplay} at {effectiveDpiDisplay} dpi
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">{check.value}</span>
                                )}
                            <CheckCircle className="w-4 h-4 text-green-600" strokeWidth={2.5} />
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-red-600">{check.error}</span>
                            <XCircle className="w-4 h-4 text-red-600" strokeWidth={2.5} />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {transparencyAnalysis && previewUrl && analysisPreviewUrl && (
              <div className="space-y-2.5">
                <h3 className="font-bold text-sm">Transparency Check</h3>

                <div className="border border-foreground rounded-lg overflow-hidden h-40">
                  <ImageComparisonSlider
                    leftImage={imageUrl ?? previewUrl ?? "/placeholder.svg"}
                    rightImage={analysisPreviewUrl}
                    altLeft="Original image"
                    altRight="Transparency overlay"
                    initialPosition={50}
                    className="bg-card"
                  />
                </div>

                <p className="text-[0.65rem] text-muted-foreground leading-relaxed">
                  Drag the slider: left shows your image, right highlights transparent areas.
                </p>

                <div className="flex flex-wrap items-center gap-2 text-[0.65rem]">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 border-2 border-foreground"
                      style={{
                        background: "repeating-conic-gradient(#ffffff 0% 25%, #dcdcdc 0% 50%) 50% / 8px 8px",
                      }}
                    ></div>
                    <span>Transparent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-black border-2 border-foreground"></div>
                    <span>Solid</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-600 border-2 border-foreground"></div>
                    <span>Partial</span>
                  </div>
                </div>

                {imageDimensions && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-xs">Print Size</h4>
                      <span className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">
                        Goal {desiredPrintDpi} dpi
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-0.5 text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wide">
                        <span>Width (inches)</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          value={printWidthInches}
                          onChange={handlePrintWidthChange}
                          className="w-full rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-center text-base font-medium text-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30"
                          placeholder="e.g. 8.5"
                        />
                      </label>
                      <label className="space-y-0.5 text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wide">
                        <span>Height (inches)</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          value={printHeightInches}
                          onChange={handlePrintHeightChange}
                          className="w-full rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-center text-base font-medium text-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30"
                          placeholder="e.g. 11"
                        />
                      </label>
                    </div>

                    <div className="rounded-lg border border-foreground/10 bg-card/70 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[0.65rem] font-medium">
                        <span className="text-muted-foreground">Image Pixels</span>
                        <span className="text-foreground">{currentResolution ?? "—"}</span>
                      </div>

                      {printSizeDisplay && (
                        <div className="flex items-center justify-between text-[0.65rem] font-medium">
                          <span className="text-muted-foreground">Planned Size</span>
                          <span className="text-foreground">{printSizeDisplay}</span>
                        </div>
                      )}

                      {hasValidPrintSize && widthDpi !== null && heightDpi !== null && (
                        <>
                          <div className="flex items-center justify-between text-[0.65rem] font-medium">
                            <span className="text-muted-foreground">Actual DPI</span>
                            <span
                              className={`${
                                needsUpscale ? "text-red-600" : "text-green-600"
                              } font-semibold`}
                            >
                              {(widthDpiDisplay ?? "—")} dpi (W) · {(heightDpiDisplay ?? "—")} dpi (H)
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[0.65rem] font-medium">
                            <span className="text-muted-foreground">
                              Needed for {desiredPrintDpi} dpi
                              {recommendedScaleFactor ? ` (${recommendedScaleFactor}×)` : ""}
                            </span>
                            <span className="text-foreground font-semibold">
                              {recommendedResolution ?? "—"}
                            </span>
                          </div>

                          <p
                            className={`text-[0.65rem] leading-relaxed ${
                              needsUpscale ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {needsUpscale ? (
                              recommendedScaleFactor ? (
                                `Use ${recommendedScaleFactor}× upscale to reach ${desiredPrintDpi} dpi.`
                              ) : (
                                `Needs more than 8× upscale to reach ${desiredPrintDpi} dpi.`
                              )
                            ) : (
                              `This image already meets the ${desiredPrintDpi} dpi goal.`
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {/* Calculate printable area percentages (excluding transparent pixels) */}
                  {(() => {
                    const printablePixels =
                      transparencyAnalysis.opaque.count + transparencyAnalysis.semiTransparent.count
                    const solidPercentageOfPrintable =
                      printablePixels > 0
                        ? ((transparencyAnalysis.opaque.count / printablePixels) * 100).toFixed(2)
                        : "0.00"
                    const semiTransparentPercentageOfPrintable =
                      printablePixels > 0
                        ? ((transparencyAnalysis.semiTransparent.count / printablePixels) * 100).toFixed(2)
                        : "0.00"

                    return (
                      <>
                        <div className="p-2.5 border border-foreground/40 bg-card rounded-lg">
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs">Solid Areas</span>
                              <span className="text-[0.6rem] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-semibold">
                                Prints
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-sm font-bold">{solidPercentageOfPrintable}%</span>
                              <span className="text-[0.6rem] text-muted-foreground text-right">
                                of print area ({transparencyAnalysis.opaque.count.toLocaleString()} px)
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-2.5 border border-foreground/40 bg-card rounded-lg">
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs">Transparent Areas</span>
                              <span className="text-[0.6rem] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-semibold">
                                No Ink
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-sm font-bold text-muted-foreground">
                                {transparencyAnalysis.transparent.percentage}%
                              </span>
                              <span className="text-[0.6rem] text-muted-foreground text-right">
                                of whole image ({transparencyAnalysis.transparent.count.toLocaleString()} px)
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-2.5 border border-red-500 bg-red-50 rounded-lg">
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs">Partial Areas</span>
                              <span className="text-[0.6rem] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded font-semibold">
                                ⚠️ Needs Fix
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-sm font-bold text-red-600">
                                {semiTransparentPercentageOfPrintable}%
                              </span>
                              <span className="text-[0.6rem] text-red-600 text-right">
                                of print area ({transparencyAnalysis.semiTransparent.count.toLocaleString()} px)
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>

                {Number.parseFloat(transparencyAnalysis.semiTransparent.percentage) > 0 && (
                  <div className="p-2.5 border border-yellow-500 bg-yellow-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" strokeWidth={2.5} />
                      <div>
                        <p className="font-bold text-xs">Partial transparency found</p>
                        <p className="text-[0.65rem] text-muted-foreground mt-0.5">
                          Some areas are partly see-through. Drag the slider to spot them in red.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DraggablePanel>
  )
}
