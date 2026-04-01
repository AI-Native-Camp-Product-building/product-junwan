import { Nav } from "@/components/nav";
import { Hero } from "@/components/hero";
import { DemoSection } from "@/components/demo-section";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main className="flex-1">
        <Hero />
        <DemoSection />
      </main>
      <Footer />
    </div>
  );
}
