import { User, History, Grid3x3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { UndoRedoControls } from "@/components/undo-redo-controls"
import { useImageStore } from "@/lib/image-store"

interface TopBarProps {
  onHistoryClick?: () => void
  onAutoArrangeClick?: () => void
  showHistoryButton?: boolean
}

export function TopBar({ onHistoryClick, onAutoArrangeClick, showHistoryButton = false }: TopBarProps) {
  const { imageUrl } = useImageStore()

  return (
    <>
      <header className="h-12 border-b-[4px] border-foreground bg-card flex items-center justify-between px-4 relative z-50">
        <div className="flex items-center gap-4">
          <div className="h-8 relative">
            <Image
              src="/pr-flow-logo.svg"
              alt="PR Flow Logo"
              height={32}
              width={32}
              className="h-8 w-auto object-contain"
              priority
            />
          </div>

          {/* Show undo/redo controls only when an image is loaded */}
          {imageUrl && (
            <div className="ml-4 border-l-2 border-foreground/20 pl-4">
              <UndoRedoControls />
            </div>
          )}
        </div>

        <Button variant="outline" size="sm" className="brutalist-button bg-card hover:bg-secondary h-8 text-xs">
          <User className="w-3 h-3 mr-1" />
          Sign In
        </Button>
      </header>

      {/* Floating buttons below header - top right */}
      {imageUrl && (
        <div className="fixed top-14 right-4 z-40 flex flex-col gap-2">
          {/* History Button - Square */}
          <div className="relative group">
            <button
              onClick={onHistoryClick}
              className="w-10 h-10 rounded-lg border-[3px] border-foreground bg-foreground text-background hover:bg-background hover:text-foreground transition-colors flex items-center justify-center"
              style={{ boxShadow: "3px 3px 0px 0px rgba(255, 255, 255, 1)", outline: "2px solid black", outlineOffset: "-5px" }}
            >
              <History className="w-5 h-5" strokeWidth={2.5} />
            </button>
            {/* Hover Label */}
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              <div className="bg-foreground text-background px-3 py-1.5 rounded-md border-[2px] border-foreground text-sm font-semibold" style={{ boxShadow: "2px 2px 0px 0px rgba(255, 255, 255, 1)" }}>
                History
              </div>
            </div>
          </div>

          {/* Auto-Arrange Button - Square */}
          <div className="relative group">
            <button
              onClick={onAutoArrangeClick}
              className="w-10 h-10 rounded-lg border-[3px] border-foreground bg-foreground text-background hover:bg-background hover:text-foreground transition-colors flex items-center justify-center"
              style={{ boxShadow: "3px 3px 0px 0px rgba(255, 255, 255, 1)", outline: "2px solid black", outlineOffset: "-5px" }}
            >
              <Grid3x3 className="w-5 h-5" strokeWidth={2.5} />
            </button>
            {/* Hover Label */}
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              <div className="bg-foreground text-background px-3 py-1.5 rounded-md border-[2px] border-foreground text-sm font-semibold" style={{ boxShadow: "2px 2px 0px 0px rgba(255, 255, 255, 1)" }}>
                Arrange
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
