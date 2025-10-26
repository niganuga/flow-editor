import { User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { UndoRedoControls } from "@/components/undo-redo-controls"
import { useImageStore } from "@/lib/image-store"

export function TopBar() {
  const { imageUrl } = useImageStore()

  return (
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
  )
}
