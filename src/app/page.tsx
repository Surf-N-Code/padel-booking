import { GamesList } from "@/components/games-list"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <main className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Padel Games</h1>
        <Link href="/games/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Game
          </Button>
        </Link>
      </div>
      <GamesList />
    </main>
  )
} 