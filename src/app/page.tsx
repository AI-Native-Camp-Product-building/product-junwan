import { Nav } from "@/components/nav";
import { HeroSection } from "@/components/hero-section";
import { ChartShowcase } from "@/components/chart-showcase";
import { CtaSection } from "@/components/cta-section";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main className="flex-1">
        <HeroSection />
        <ChartShowcase />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
