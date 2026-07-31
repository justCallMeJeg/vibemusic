import { type LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  desc: string;
  delay: string;
}

export default function FeatureCard({
  icon: Icon,
  title,
  desc,
  delay,
}: FeatureCardProps) {
  return (
    <div
      className={`group flex gap-3.5 p-4 rounded-xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-[transform,box-shadow,border-color] duration-300 ease-out animate-fade-in-up opacity-0 ${delay}`}
    >
      <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary/8 text-primary">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <h3 className="font-semibold text-sm text-foreground leading-tight">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm mt-0.5 leading-snug">
          {desc}
        </p>
      </div>
    </div>
  );
}
