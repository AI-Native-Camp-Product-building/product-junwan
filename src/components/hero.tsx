import { Button } from "@/components/ui/button";
import { landingContent } from "@/config/content";

export function Hero() {
  const { hero, stats } = landingContent;
  return (
    <section className="flex flex-col items-center px-6 pt-16 pb-10 text-center">
      <span className="text-xs text-muted-foreground tracking-widest font-medium mb-4">{hero.label}</span>
      <h1 className="text-3xl font-bold tracking-tight leading-tight mb-3 whitespace-pre-line">{hero.headline}</h1>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-8">{hero.subheadline}</p>
      <Button asChild><a href={hero.ctaUrl}>{hero.ctaText}</a></Button>
      <div className="flex items-center gap-10 mt-10">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
