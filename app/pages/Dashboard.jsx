"use client";

import Header from "../components/layout/Header";
import Hero from "../components/sections/Hero";
import Categories from "../components/sections/Categories";
import Footer from "../components/layout/Footer";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background mt-[10vh]">
      <Header />
      <main>
        <Hero />
        <Categories />
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
