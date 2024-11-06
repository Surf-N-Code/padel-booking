import { NewGameForm } from "@/components/new-game-form"

export default function NewGamePage() {
  return (
    <main className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Create New Game</h1>
      <NewGameForm />
    </main>
  )
} 