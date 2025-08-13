import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { useUser } from "@clerk/clerk-react";
import GradientText from "../GradientText";
import Silk from "../Silk";

const Hero = () => {
  const { user } = useUser();
  const username = user?.firstName || user?.username || "there";
  const [pos, setPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setPos({ x, y });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section
      aria-labelledby="hero-title"
      className="container mx-auto px-4 relative"
    >
      <div
        className="rounded-2xl border overflow-hidden relative"
        style={{
          background: `radial-gradient(600px 300px at ${pos.x}% ${pos.y}%, hsl(var(--primary) / 0.25), transparent 60%), var(--gradient-subtle)`,
        }}
      >
        {/* Silk component positioned as background */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <Silk
            speed={5}
            scale={1}
            color="#10c2b6"
            noiseIntensity={1.5}
            rotation={0}
          />
        </div>

        {/* Content with relative positioning to appear above Silk */}
        <div className="px-6 py-12 md:px-12 md:py-16 grid md:grid-cols-2 gap-8 relative z-10">
          <div className="text-center md:text-left">
            <GradientText
              colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
              animationSpeed={1}
              showBorder={false}
              className="text-4xl md:text-5xl font-semibold leading-tight !justify-start !mx-0 !max-w-none"
              id="hero-title"
            >
              Welcome, {username}
            </GradientText>
            <p className="mt-3 text-muted-foreground max-w-xl">
              Discover new categories, track your portfolio, and stay updated
              with the latest market trends — all tailored just for {username}.
            </p>
            <div className="mt-6 flex gap-3 justify-center md:justify-start">
              <Button variant="hero">Explore Categories</Button>
              <Button variant="outline">View Portfolio</Button>
            </div>
          </div>
          <aside className="md:justify-self-end">
            <div className="rounded-xl border bg-card p-4 w-full md:w-[320px]">
              <p className="text-sm font-medium">News for you</p>
              <p className="text-sm text-muted-foreground mt-1">
                Market opens strong today. Your portfolio is up 2.4%.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default Hero;
