"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Bell,
  Menu,
  X,
  BarChart,
  Home,
  Briefcase,
  Gavel,
  User,
} from "lucide-react";
import {
  UserButton,
  useUser,
  SignInButton,
  SignUpButton,
} from "@clerk/clerk-react";

const ProboHeader = () => {
  const { isSignedIn, isLoaded, user } = useUser();
  const pathname = usePathname() || "/";

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const mobileMenuRef = useRef(null);

  // Prevent hydration mismatch by ensuring client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const navLinks = [
    { name: "Home", icon: Home, href: "/", active: pathname === "/" },
    {
      name: "Bids",
      icon: Gavel,
      href: "/bid",
      active: pathname.startsWith("/bid"),
    },
    {
      name: "Simulator",
      icon: BarChart,
      href: "/simulator",
      active: pathname.startsWith("/markets"),
    },
  ];

  // Don't render auth-dependent content until client is ready and Clerk is loaded
  const shouldShowAuthContent = isClient && isLoaded;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 py-3">
      {/* glass backdrop */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, rgba(15, 15, 25, 0.85) 0%, rgba(5, 5, 10, 0.95) 100%)",
          boxShadow:
            "inset 0 1px 1px rgba(255,255,255,0.03), 0 8px 30px rgba(0,0,0,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
        aria-hidden
      />

      <div className="w-[95%] mx-auto px-4 relative">
        <div className="flex items-center justify-between">
          {/* Left: Brand */}
          <div className="flex items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center relative">
                <div className="absolute inset-0 bg-white/6 backdrop-blur-sm rounded-lg border border-white/5 shadow-md"></div>
                <div className="relative z-10 w-7 h-7 rounded flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-5 h-5 text-emerald-400"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L2 7L12 12L22 7L12 2Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 17L12 22L22 17"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 12L12 17L22 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              <div>
                <span className="text-xl font-bold text-white tracking-tight">
                  NxtWin
                </span>
                <div className="h-[2px] w-8 bg-gradient-to-r from-emerald-400 to-transparent mt-0.5"></div>
              </div>
            </div>
          </div>

          {/* Center: Nav (desktop) */}
          <nav className="hidden md:flex items-center space-x-1 ml-12">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  link.active
                    ? "text-white bg-white/10 shadow-inner shadow-white/5"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
                aria-current={link.active ? "page" : undefined}
              >
                <link.icon
                  className={`h-4 w-4 mr-2 ${
                    link.active
                      ? "text-emerald-400"
                      : "text-white/60 group-hover:text-emerald-300"
                  }`}
                />
                <span>{link.name}</span>
                {link.active && (
                  <div className="ml-2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </Link>
            ))}
          </nav>

          {/* Search (desktop) */}
          <div className="hidden md:flex items-center mx-4 flex-1 max-w-2xl">
            <div className="relative w-full rounded-xl bg-black/30 backdrop-blur-lg shadow-lg shadow-emerald-500/8 ring-1 ring-emerald-500/12">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-emerald-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2.5 bg-transparent border-0 text-white placeholder-white/40 focus:ring-0 focus:outline-none sm:text-sm"
                placeholder="Search markets, assets, pairs..."
                aria-label="Search markets, assets, pairs"
              />
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center space-x-3">
            {/* Notifications - only show when signed in */}
            {shouldShowAuthContent && isSignedIn && (
              <button
                className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/15 relative transition-all group hidden md:block"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-white group-hover:text-emerald-300" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-black" />
              </button>
            )}

            {/* Auth / User */}
            <div className="flex items-center">
              {shouldShowAuthContent ? (
                isSignedIn ? (
                  <div className="flex items-center space-x-3">
                    <div className="hidden md:block mt-1.5 ml-3">
                      <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                          elements: {
                            userButtonAvatarBox: "w-9 h-9",
                            userButtonOuterIdentifier:
                              "text-sm font-medium text-white",
                            userButtonPopoverCard:
                              "bg-black/80 backdrop-blur-2xl border border-white/10 rounded-xl",
                            userButtonPopoverActionButton:
                              "hover:bg-white/5 text-white",
                            userButtonPopoverActionButtonText: "text-sm",
                            userButtonPopoverFooter: "hidden",
                          },
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="hidden md:flex items-center space-x-2">
                    <Link href="/sign-in">
                      <button className="px-4 cursor-pointer py-2.5 text-sm font-medium rounded-xl bg-transparent text-white/80 hover:text-white transition-colors">
                        Sign In
                      </button>
                    </Link>
                    <Link href={"/sign-up"}>
                      <button className="px-4 cursor-pointer py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/10">
                        Sign Up
                      </button>
                    </Link>
                  </div>
                )
              ) : (
                // Loading placeholder to maintain layout
                <div className="hidden md:flex items-center space-x-2">
                  <div className="w-16 h-9 bg-white/5 rounded-xl animate-pulse" />
                  <div className="w-20 h-9 bg-white/5 rounded-xl animate-pulse" />
                </div>
              )}

              {/* Mobile toggle */}
              <button
                className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/15 transition-all ml-2 md:hidden"
                onClick={() => setIsMobileMenuOpen((s) => !s)}
                aria-label="Toggle menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5 text-white" />
                ) : (
                  <Menu className="h-5 w-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            className="md:hidden mt-4 rounded-xl bg-gradient-to-b from-white/8 to-black/50 backdrop-blur-2xl border border-white/5 overflow-hidden transition-all duration-300"
            style={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.9)" }}
          >
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-emerald-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2.5 bg-white/6 border border-white/5 rounded-lg text-white placeholder-white/40 focus:ring-0 focus:outline-none sm:text-sm focus:border-emerald-500/20"
                  placeholder="Search markets, assets, pairs..."
                />
              </div>
            </div>

            <div className="px-2 pt-2 pb-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium ${
                    link.active
                      ? "text-white bg-white/10"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <link.icon
                    className={`h-5 w-5 mr-3 ${
                      link.active ? "text-emerald-400" : "text-white/60"
                    }`}
                  />
                  <span>{link.name}</span>
                  {link.active && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </Link>
              ))}
            </div>

            <div className="p-3 border-t border-white/5">
              {shouldShowAuthContent ? (
                isSignedIn ? (
                  <div className="flex justify-center">
                    <UserButton
                      afterSignOutUrl="/"
                      appearance={{
                        elements: {
                          userButtonAvatarBox: "w-12 h-12",
                          userButtonTrigger:
                            "flex flex-col items-center space-y-2",
                          userButtonOuterIdentifier:
                            "text-sm font-medium text-white",
                        },
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex space-x-3">
                    <a href="/sign-in">
                      <button className="flex-1 px-4 py-3 text-sm font-medium rounded-lg bg-white/10 text-white hover:bg-white/15 transition-colors">
                        Sign In
                      </button>
                    </a>
                    <a href="/sign-up">
                      <button className="flex-1 px-4 py-3 text-sm font-medium rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 transition-all">
                        Sign Up
                      </button>
                    </a>
                  </div>
                )
              ) : (
                // Loading placeholder for mobile auth section
                <div className="flex space-x-3">
                  <div className="flex-1 h-12 bg-white/5 rounded-lg animate-pulse" />
                  <div className="flex-1 h-12 bg-white/5 rounded-lg animate-pulse" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default ProboHeader;
