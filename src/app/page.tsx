import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Landing page redesign in progress...</p>
      </main>
      <Footer />
    </div>
  );
}
