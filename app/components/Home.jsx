"use client";
import React, { useEffect, useState } from "react";
import Aurora from "./Aurora";
import RippleGrid from "./RippleGrid";
import Link from "next/link";
import Footer from "./layout/Footer";
import CardSwap, { Card } from "./CardSwap";
import InfiniteScroll from "./InfiniteScroll";
import SpotlightCard from "./SpotlightCard";
import Image from "next/image";
import { api, toCard } from "../utils/api";

const Home = () => {
  const items = [
    { content: <p>Player and team stat lines on every Premier League match</p> },
    { content: <p>Prices move with trading, set by an automated market maker</p> },
    { content: <p>Positions settle automatically when a market resolves</p> },
    { content: <p>AI-assisted probability estimates for each question</p> },
    { content: <p>Build accumulators and climb the weekly leaderboard</p> },
    { content: <p>Simulated funds only: no real money is involved</p> },
  ];


  const [marketCards, setMarketCards] = useState([]);

  useEffect(() => {
    api
      .markets("?status=open")
      .then((data) =>
        setMarketCards(
          (data.markets || []).slice(0, 4).map((m) => {
            const c = toCard(m);
            return {
              id: c.id,
              title: c.question,
              category: c.category,
              optionA: "Yes",
              optionB: "No",
              yesShare: Math.round(c.yesPrice * 100),
              volume: c.volume,
              deadline: `Kick-off ${c.deadline}`,
              image: c.image,
            };
          })
        )
      )
      .catch(() => setMarketCards([]));
  }, []);


  // Helper functions from bid/page.jsx
  const formatCurrencyCompact = (amount) => {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toString();
  };

  const getPrices = (yesShare) => {
    const yes = yesShare / 100;
    const no = 1 - yes;
    return { yes, no };
  };

  // Progress pulse component
  const ProgressPulse = ({ value = 50 }) => {
    return (
      <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden relative">
        <div
          style={{ width: `${value}%` }}
          className="h-full bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 transition-[width] duration-300"
        />
        <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(60%_50%_at_30%_50%,black,transparent)] bg-white/20 mix-blend-overlay" />
      </div>
    );
  };

  // Card component from bid/page.jsx
  const MarketCard = ({ market }) => {
    const volCompact = formatCurrencyCompact(market.volume);
    const { yes, no } = getPrices(market.yesShare);

    return (
      <SpotlightCard
        className="!p-2 !m-0"
        spotlightColor="rgba(0, 229, 255, 0.35)"
      >
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden">
          <Link href={`/bid/${market.id}`} className="block">
            <div className="relative aspect-[16/9] bg-slate-900">
              {market.image ? (
                <Image
                  src={market.image}
                  alt={market.title}
                  fill
                  className="object-cover opacity-85"
                  sizes="(max-width:768px) 100vw, 25vw"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <div className="text-gray-400 text-sm">Image placeholder</div>
                </div>
              )}

              <div className="absolute top-2 left-2 text-[11px] px-2 py-1 rounded-md border border-white/10 bg-black/40 backdrop-blur text-slate-200">
                {market.category}
              </div>
              <div className="absolute bottom-2 right-2 text-[11px] px-2 py-1 rounded-md border border-white/10 bg-black/40 backdrop-blur">
                Vol: £{volCompact}
              </div>

              <div className="absolute inset-x-0 bottom-0 p-3">
                <ProgressPulse value={market.yesShare} />
              </div>
            </div>
          </Link>

          <div className="p-3 space-y-2.5">
            <h3 className="text-[15px] font-semibold leading-snug text-slate-100 line-clamp-2">
              {market.title}
            </h3>

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-slate-300 truncate">
                <span className="font-medium text-slate-200">
                  {market.optionA}
                </span>
                <span className="mx-1 text-slate-500">vs</span>
                <span className="font-medium text-slate-200">
                  {market.optionB}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-slate-200">
                  {market.yesShare}% Yes
                </span>
                <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
              </div>
            </div>

            {/* Yes / No prices row */}
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 flex items-center justify-between">
                <span className="text-emerald-300 font-medium">
                  {market.optionA}
                </span>
                <span className="text-emerald-200 tabular-nums">
                  {Math.round(yes * 100)}p
                </span>
              </div>
              <div className="flex-1 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 flex items-center justify-between">
                <span className="text-red-400 font-medium">
                  {market.optionB}
                </span>
                <span className="text-red-300 tabular-nums">
                  {Math.round(no * 100)}p
                </span>
              </div>
            </div>

            <div className="grid grid-cols-12 items-center">
              <div className="col-span-7 flex items-center gap-3 text-xs text-slate-400">
                <span>{market.deadline}</span>
              </div>

              <div className="col-span-5 flex items-center justify-end gap-2">
                <Link
                  href={`/sign-in`}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-200 text-sm hover:bg-white/[0.08]"
                >
                  Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </SpotlightCard>
    );
  };

  return (
    <div>
      <main className="relative w-screen h-screen flex items-center justify-center overflow-hidden text-white">
        <div className="landing-page w-full h-full">
          {/* Aurora background */}
          <Aurora
            colorStops={["#92d5e0", "#92ace0", "#99c2b6"]}
            blend={0.5}
            amplitude={0.7}
            speed={0.7}
          />

          {/* Ripple grid background */}
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <RippleGrid
              enableRainbow={false}
              gridColor="#000000"
              rippleIntensity={0.04}
              gridSize={5}
              gridThickness={20}
              mouseInteraction={true}
              mouseInteractionRadius={1.2}
              opacity={0.9}
            />
          </div>

          {/* Foreground: Hero section */}
          <div
            className="relative z-10 flex flex-col md:flex-row items-center justify-center w-full h-full"
            style={{ minHeight: "500px" }}
          >
            {/* Left: Text and CTA */}
            <section className="flex-1 flex flex-col items-center justify-center px-6 md:items-end md:text-right">
              <h1 className="text-3xl md:text-5xl font-bold mb-4">
                NxtWin Prediction Market Simulator
              </h1>
              <p className="text-lg mb-6 text-gray-200">
                Trade on the outcome of real-world events with simulated funds. Live order books, dynamic pricing and AI-assisted estimates.
              </p>
              <Link href="/sign-in">
                <button className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition">
                  Get Started
                </button>
              </Link>
            </section>

            {/* Right: Card Swap */}
            <div className="flex-1 flex items-center justify-center px-6">
              <div
                style={{
                  height: "400px",
                  width: "100%",
                  maxWidth: "400px",
                  position: "relative",
                }}
              >
                <CardSwap
                  cardDistance={60}
                  verticalDistance={70}
                  delay={5000}
                  pauseOnHover={false}
                >
                  <Card>
                    <div className="p-6 bg-card rounded-lg border">
                      <h3 className="text-lg font-semibold mb-2">
                        AI Prediction
                      </h3>
                      <img src={"/AI.png"} className="mt-4 rounded-lg" />
                    </div>
                  </Card>
                  <Card>
                    <div className="p-6 bg-card rounded-lg border">
                      <h3 className="text-lg font-semibold mb-2">
                        Portfolio
                      </h3>
                      <img src={"/dashboard.png"} className="mt-4 rounded-lg" />
                    </div>
                  </Card>
                  <Card>
                    <div className="p-6 bg-card rounded-lg border">
                      <h3 className="text-lg font-semibold mb-2">
                        Category News
                      </h3>
                      <img
                        src={"/categories.png"}
                        className="mt-4 rounded-lg"
                      />
                    </div>
                  </Card>
                </CardSwap>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Markets Section */}
      <div className="min-h-10"></div>
      <div className="relative px-8 py-16 max-w-7xl mx-auto">
        {/* Vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 rounded-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white text-center mb-2">
            Open Markets
          </h2>
          <p className="text-gray-300 text-center mb-12">
            Take a position on any open market
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {marketCards.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/sign-in">
              <button className="px-8 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors">
                View All Markets
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Scrolling news + text */}
      <div className="min-h-20"></div>
      <div
        style={{
          height: "500px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "2rem",
          padding: "2rem",
        }}
      >
        {/* Left: Infinite Scroll with fade mask */}
        <div
          style={{
            flex: "1 1 50%",
            height: "100%",
            position: "relative",
            WebkitMaskImage:
              "linear-gradient(to right, rgba(0,0,0,1), rgba(0,0,0,0))",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "100% 100%",
            maskImage:
              "linear-gradient(to right, rgba(0,0,0,1), rgba(0,0,0,0))",
            maskRepeat: "no-repeat",
            maskSize: "100% 100%",
          }}
        >
          <InfiniteScroll
            items={items}
            isTilted={true}
            autoplay={true}
            autoplaySpeed={0.5}
            autoplayDirection="down"
            pauseOnHover={false}
          />
        </div>

        {/* Right: Text section */}
        <div style={{ flex: "1 1 50%", color: "white" }}>
          <h2 className="text-2xl font-bold mb-4">How It Works</h2>
          <p className="mb-4 text-gray-300">
            Follow price movements, order book depth and market news across
            categories, with AI-assisted probability estimates for each question.
          </p>
          <p className="mb-4 text-gray-300">
            NxtWin runs on simulated funds. It is built for learning how prediction
            markets price information, not for wagering real money.
          </p>
          <button className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition">
            Learn More
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="min-h-40"></div>

      <Footer />
    </div>
  );
};

export default Home;
