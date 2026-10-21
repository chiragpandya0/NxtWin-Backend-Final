"use client"; // Important for Clerk hooks

import { useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import Header from "../components/layout/Header";
import Hero from "../components/sections/Hero";
import Categories from "../components/sections/Categories";
import Footer from "../components/layout/Footer";
import { BASE_URL } from "../utils/api";

const Dashboard = () => {
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Send to backend
      fetch(`${BASE_URL}/api/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          name: user.fullName,
          email: user.primaryEmailAddress.emailAddress,
        }),
      })
        .then((res) => res.json())
        .then((data) => console.log("User sync:", data))
        .catch((err) => console.error(err));
    }
  }, [isLoaded, isSignedIn, user]);

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
