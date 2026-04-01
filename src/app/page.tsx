import { Nav } from "@/components/nav";
import { HeroSection } from "@/components/hero-section";
import { ChartShowcase } from "@/components/chart-showcase";
import { CtaSection } from "@/components/cta-section";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <HeroSection />
        <ChartShowcase />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
