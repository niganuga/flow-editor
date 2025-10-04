import { User } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TopBar() {
  return (
    <header className="h-12 border-b-[4px] border-foreground bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 border-[3px] border-foreground bg-background flex items-center justify-center font-display">
          <span className="font-bold text-lg">F</span>
        </div>
        <h1 className="font-bold text-lg font-display">Flow</h1>
      </div>

      <Button variant="outline" size="sm" className="brutalist-button bg-card hover:bg-secondary h-8 text-xs">
        <User className="w-3 h-3 mr-1" />
        Sign In
      </Button>
    </header>
  )
}
