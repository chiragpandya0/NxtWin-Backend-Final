"use client";

import Home from "./components/Home";
import DashBoard from "./pages/Dashboard";
import { useUser, UserButton } from "@clerk/nextjs";

export default function Page() {
  const { isSignedIn, isLoaded } = useUser();
  return !isSignedIn ? (
    <>
      <Home />
      {!isLoaded && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-green-400"></div>
        </div>
      )}
    </>
  ) : (
    <>
      <DashBoard />
    </>
  );
}
