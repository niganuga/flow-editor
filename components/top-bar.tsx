import { User } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TopBar() {
  return (
    <header className="h-16 border-b-[4px] border-foreground bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 border-[3px] border-foreground bg-background flex items-center justify-center">
          <span className="font-bold text-xl">PE</span>
        </div>
        <h1 className="font-bold text-xl">Photo Editor</h1>
      </div>

      <Button variant="outline" size="sm" className="brutalist-button bg-card hover:bg-secondary">
        <User className="w-4 h-4 mr-2" />
        Sign In
      </Button>
    </header>
  )
}
