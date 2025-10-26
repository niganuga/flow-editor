"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageComparisonSliderProps extends React.HTMLAttributes<HTMLDivElement> {
  leftImage: string
  rightImage: string
  altLeft?: string
  altRight?: string
  initialPosition?: number
}

export const ImageComparisonSlider = React.forwardRef<HTMLDivElement, ImageComparisonSliderProps>(
  (
    {
      className,
      leftImage,
      rightImage,
      altLeft = "Left image",
      altRight = "Right image",
      initialPosition = 50,
      ...props
    },
    ref,
  ) => {
    const [sliderPosition, setSliderPosition] = React.useState(initialPosition)
    const [isDragging, setIsDragging] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    const assignRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        containerRef.current = node
        if (typeof ref === "function") {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref],
    )

    const handleMove = React.useCallback((clientX: number) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      let newPosition = (x / rect.width) * 100
      newPosition = Math.max(0, Math.min(100, newPosition))
      setSliderPosition(newPosition)
    }, [])

    const handleMouseMove = React.useCallback(
      (event: MouseEvent) => {
        if (!isDragging) return
        handleMove(event.clientX)
      },
      [handleMove, isDragging],
    )

    const handleTouchMove = React.useCallback(
      (event: TouchEvent) => {
        if (!isDragging) return
        handleMove(event.touches[0].clientX)
      },
      [handleMove, isDragging],
    )

    const handleInteractionStart = (event: React.MouseEvent | React.TouchEvent) => {
      if ("touches" in event) {
        handleMove(event.touches[0].clientX)
      } else {
        handleMove(event.clientX)
      }
      setIsDragging(true)
    }

    const handleInteractionEnd = React.useCallback(() => {
      setIsDragging(false)
    }, [])

    React.useEffect(() => {
      if (isDragging) {
        document.addEventListener("mousemove", handleMouseMove)
        document.addEventListener("touchmove", handleTouchMove)
        document.addEventListener("mouseup", handleInteractionEnd)
        document.addEventListener("touchend", handleInteractionEnd)
        document.body.style.cursor = "ew-resize"
      } else {
        document.body.style.cursor = ""
      }

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("touchmove", handleTouchMove)
        document.removeEventListener("mouseup", handleInteractionEnd)
        document.removeEventListener("touchend", handleInteractionEnd)
        document.body.style.cursor = ""
      }
    }, [handleInteractionEnd, handleMouseMove, handleTouchMove, isDragging])

    return (
      <div
        ref={assignRefs}
        className={cn("relative w-full h-full overflow-hidden select-none group", className)}
        onMouseDown={handleInteractionStart}
        onTouchStart={handleInteractionStart}
        {...props}
      >
        <img
          src={leftImage}
          alt={altLeft}
          className="absolute inset-0 h-full w-full object-contain bg-background pointer-events-none"
          draggable={false}
        />

        <div
          className="absolute inset-0 h-full w-full overflow-hidden pointer-events-none"
          style={{ clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)` }}
        >
          <img
            src={rightImage}
            alt={altRight}
            className="h-full w-full object-contain bg-background"
            draggable={false}
          />
        </div>

        <div
          className="absolute top-0 h-full w-1 cursor-ew-resize"
          style={{ left: `calc(${sliderPosition}% - 2px)` }}
        >
          <div className="absolute inset-y-0 w-1 bg-background/50 backdrop-blur-sm" />

          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-background/50 text-foreground shadow-xl backdrop-blur-md",
              "transition-all duration-300 ease-in-out",
              "group-hover:scale-105",
              isDragging && "scale-105 shadow-2xl shadow-primary/50",
            )}
          >
            <div className="flex items-center text-primary">
              <ChevronLeft className="h-5 w-5 drop-shadow-md" />
              <ChevronRight className="h-5 w-5 drop-shadow-md" />
            </div>
          </div>
        </div>
      </div>
    )
  },
)

ImageComparisonSlider.displayName = "ImageComparisonSlider"
