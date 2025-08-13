"use client";
import { Card, CardContent } from "./ui/card";

const items = [
  {
    title: "Team XYZ secures decisive win ahead of finals",
    summary: "Momentum builds as key players return from injury; betting sentiment shifts toward YES.",
    time: "2h ago",
    source: "SportsWire",
  },
  {
    title: "Analysts note improving macro indicators",
    summary: "Market confidence rises as volatility cools; hedge positions unwind across exchanges.",
    time: "4h ago",
    source: "MarketPulse",
  },
  {
    title: "Coach confirms aggressive strategy for weekend",
    summary: "Press conference hints at tactical changes that could swing the matchup.",
    time: "6h ago",
    source: "Arena Daily",
  },
];

export const NewsFeed = () => {
  return (
    <section aria-labelledby="news-heading" className="space-y-4">
      <h2 id="news-heading" className="text-lg font-semibold">News & Context</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((n) => (
          <Card key={n.title} className="overflow-hidden hover-scale">
            <img src={n.img} alt={`${n.title} thumbnail`} loading="lazy" className="aspect-video w-full object-cover" />
            <CardContent className="p-4">
              <a className="story-link" href="#" aria-label={n.title}><div className="font-medium">{n.title}</div></a>
              <p className="mt-1 text-sm text-muted-foreground">{n.summary}</p>
              <div className="mt-2 text-xs text-muted-foreground">{n.time} • {n.source}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default NewsFeed;