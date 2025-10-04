"use client"
import { useState, useEffect } from "react"
import { DraggablePanel } from "@/components/draggable-panel"
import { AlertCircle, CheckCircle, XCircle, ImageIcon } from "lucide-react"
import { useImageStore } from "@/lib/image-store"

interface ValidationCheck {
  name: string
  valid: boolean
  error?: string
  value?: string
}

interface TransparencyAnalysis {
  opaque: { count: number; percentage: string }
  transparent: { count: number; percentage: string }
  semiTransparent: { count: number; percentage: string }
}

export function FileValidatorPanel({ onClose }: { onClose: () => void }) {
  const { imageFile, imageName, imageUrl } = useImageStore()
  const [validationResults, setValidationResults] = useState<{
    fileName: string
    checks: ValidationCheck[]
    valid: boolean
  } | null>(null)
  const [transparencyAnalysis, setTransparencyAnalysis] = useState<TransparencyAnalysis | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)

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

  const validateFileSignature = (file: File): Promise<ValidationCheck> => {
    return new Promise((resolve) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        const arr = new Uint8Array(e.target?.result as ArrayBuffer)
        const header = Array.from(arr.slice(0, 4))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")

        const signatures: Record<string, string> = {
          "89504e47": "PNG",
          ffd8ffe0: "JPEG",
          ffd8ffe1: "JPEG",
          ffd8ffe2: "JPEG",
          "52494646": "WEBP",
        }

        const detectedType = signatures[header]

        if (!detectedType) {
          resolve({
            name: "File Signature",
            valid: false,
            error: "Invalid signature",
          })
          return
        }

        resolve({
          name: "File Signature",
          valid: true,
          value: detectedType,
        })
      }

      reader.readAsArrayBuffer(file.slice(0, 4))
    })
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

  const analyzeImageTransparency = (file: File): Promise<void> => {
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

        setTransparencyAnalysis(analysis)
        setPreviewUrl(preview)

        URL.revokeObjectURL(url)
        resolve()
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
    results.checks.push(await validateFileSignature(file))
    results.checks.push(await validateImageDimensions(file))

    // Check if any validation failed
    results.valid = results.checks.every((check) => check.valid)

    setValidationResults(results)

    // Run transparency analysis if valid
    if (results.valid) {
      await analyzeImageTransparency(file)
    }

    setIsValidating(false)
  }

  useEffect(() => {
    if (imageFile) {
      validateFile(imageFile)
    } else {
      setValidationResults(null)
      setTransparencyAnalysis(null)
      setPreviewUrl(null)
    }
  }, [imageFile])

  return (
    <DraggablePanel title="File Validator" onClose={onClose} defaultPosition={{ x: 850, y: 100 }}>
      <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
        {!imageFile ? (
          <div
            className="p-6 border-[3px] border-foreground bg-card rounded-lg"
            style={{
              boxShadow: "4px 4px 0 0 hsl(var(--foreground))",
            }}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground" strokeWidth={2} />
              <div>
                <p className="font-bold text-base">No Image Loaded</p>
                <p className="text-sm text-muted-foreground mt-1">Upload an image to the canvas to validate</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {isValidating && (
              <div className="text-center py-4">
                <p className="font-bold">Validating...</p>
              </div>
            )}

            {validationResults && (
              <div className="space-y-4">
                <div
                  className={`p-4 border-[3px] rounded-lg ${
                    validationResults.valid ? "bg-green-50 border-green-600" : "bg-red-50 border-red-600"
                  }`}
                  style={{
                    boxShadow: `4px 4px 0 0 ${validationResults.valid ? "#16a34a" : "#dc2626"}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    {validationResults.valid ? (
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" strokeWidth={2.5} />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" strokeWidth={2.5} />
                    )}
                    <div>
                      <p className="font-bold text-base">
                        {validationResults.valid ? "Valid Image" : "Validation Failed"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{validationResults.fileName}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {validationResults.checks.map((check, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border-[3px] border-foreground bg-card rounded-lg"
                      style={{
                        boxShadow: "3px 3px 0 0 hsl(var(--foreground))",
                      }}
                    >
                      <span className="font-bold text-sm">{check.name}</span>
                      <div className="flex items-center gap-2">
                        {check.valid ? (
                          <>
                            <span className="text-sm text-muted-foreground">{check.value}</span>
                            <CheckCircle className="w-5 h-5 text-green-600" strokeWidth={2.5} />
                          </>
                        ) : (
                          <>
                            <span className="text-sm text-red-600">{check.error}</span>
                            <XCircle className="w-5 h-5 text-red-600" strokeWidth={2.5} />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {transparencyAnalysis && previewUrl && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg">Transparency Analysis</h3>

                <div
                  className="border-[3px] border-foreground rounded-lg overflow-hidden"
                  style={{
                    boxShadow: "4px 4px 0 0 hsl(var(--foreground))",
                  }}
                >
                  <img src={previewUrl || "/placeholder.svg"} alt="Transparency preview" className="w-full" />
                </div>

                <div className="flex gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-black border-2 border-foreground"></div>
                    <span>Opaque</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 border-2 border-foreground"
                      style={{
                        background: "repeating-conic-gradient(#c8c8c8 0% 25%, #969696 0% 50%) 50% / 8px 8px",
                      }}
                    ></div>
                    <span>Transparent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-600 border-2 border-foreground"></div>
                    <span>Semi-Transparent</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div
                    className="p-3 border-[3px] border-foreground bg-card rounded-lg"
                    style={{
                      boxShadow: "3px 3px 0 0 hsl(var(--foreground))",
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">Opaque Pixels</span>
                      <span className="text-sm">
                        {transparencyAnalysis.opaque.percentage}% ({transparencyAnalysis.opaque.count.toLocaleString()})
                      </span>
                    </div>
                  </div>

                  <div
                    className="p-3 border-[3px] border-foreground bg-card rounded-lg"
                    style={{
                      boxShadow: "3px 3px 0 0 hsl(var(--foreground))",
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">Transparent Pixels</span>
                      <span className="text-sm">
                        {transparencyAnalysis.transparent.percentage}% (
                        {transparencyAnalysis.transparent.count.toLocaleString()})
                      </span>
                    </div>
                  </div>

                  <div
                    className="p-3 border-[3px] border-foreground bg-card rounded-lg"
                    style={{
                      boxShadow: "3px 3px 0 0 hsl(var(--foreground))",
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">Semi-Transparent</span>
                      <span className="text-sm text-red-600">
                        {transparencyAnalysis.semiTransparent.percentage}% (
                        {transparencyAnalysis.semiTransparent.count.toLocaleString()})
                      </span>
                    </div>
                  </div>
                </div>

                {Number.parseFloat(transparencyAnalysis.semiTransparent.percentage) > 0 && (
                  <div
                    className="p-4 border-[3px] border-yellow-600 bg-yellow-50 rounded-lg"
                    style={{
                      boxShadow: "4px 4px 0 0 #ca8a04",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" strokeWidth={2.5} />
                      <div>
                        <p className="font-bold text-sm">Semi-transparent pixels detected</p>
                        <p className="text-xs text-muted-foreground mt-1">May cause issues in some formats or print</p>
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
