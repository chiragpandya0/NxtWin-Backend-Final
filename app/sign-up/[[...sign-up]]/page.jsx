"use client";
import { SignUp } from "@clerk/nextjs";
import Iridescence from "../../components/Iridescence";
import DarkVeil from "../../components/DarkVeil";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black p-4 sm:p-6">
      {/* Fullscreen Iridescence Background */}
      <div className="absolute inset-0 z-0">
        <DarkVeil
          hueShift={44}
          speed={2.8}
          scanlineFrequency={0.5}
          scanlineIntensity={0.8}
          warpAmount={1}
        />
        {/* Optional dark vignette for better text contrast */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_40%,rgba(0,0,0,0.75)_100%)]" />
      </div>

      {/* Glowing side accents - hidden on mobile */}
      <div
        className="hidden sm:block absolute -left-12 top-1/2 transform -translate-y-1/2 w-24 h-[480px] pointer-events-none animate-glow-left"
        style={{
          background:
            "linear-gradient(180deg, rgba(37,99,235,0.18), rgba(59,130,246,0.04) 40%, rgba(37,99,235,0))",
          mixBlendMode: "screen",
          borderRadius: "1rem",
          filter: "blur(24px)",
          opacity: 0.6,
        }}
      />
      <div
        className="hidden sm:block absolute -right-12 top-1/2 transform -translate-y-1/2 w-24 h-[480px] pointer-events-none animate-glow-right"
        style={{
          background:
            "linear-gradient(180deg, rgba(16,185,129,0.16), rgba(34,197,94,0.03) 40%, rgba(16,185,129,0))",
          mixBlendMode: "screen",
          borderRadius: "1rem",
          filter: "blur(24px)",
          opacity: 0.6,
        }}
      />

      {/* Mobile-specific subtle accent lines */}
      <div
        className="sm:hidden absolute left-0 top-1/4 w-1 h-32 pointer-events-none opacity-30"
        style={{
          background:
            "linear-gradient(180deg, rgba(37,99,235,0.4), transparent)",
          borderRadius: "0 2px 2px 0",
        }}
      />
      <div
        className="sm:hidden absolute right-0 bottom-1/4 w-1 h-32 pointer-events-none opacity-30"
        style={{
          background:
            "linear-gradient(180deg, rgba(16,185,129,0.4), transparent)",
          borderRadius: "2px 0 0 2px",
        }}
      />

      {/* Signup/Signin Glass Card */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md mx-auto">
        <div className="rounded-xl sm:rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] backdrop-blur-md shadow-2xl p-4 sm:p-6">
          <SignUp
            appearance={{
              variables: {
                colorPrimary: "#2563eb",
                colorBackground: "transparent",
                colorInputBackground: "rgba(255,255,255,0.02)",
                colorInputText: "#ffffff",
                colorText: "#e6eef8",
                colorTextSecondary: "#9ca3af",
                colorDanger: "#ef4444",
                borderRadius: "0.75rem",
                fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system",
                fontSize: "14px",
                fontSizeButtons: "14px",
              },
              elements: {
                card: {
                  backgroundColor: "transparent",
                  boxShadow: "none",
                  border: "none",
                  padding: "0",
                  margin: "0",
                },
                header: {
                  padding: "0 0 1rem 0",
                },
                headerTitle: {
                  fontSize: "1.5rem",
                  fontWeight: "600",
                  "@media (max-width: 640px)": {
                    fontSize: "1.25rem",
                  },
                },
                headerSubtitle: {
                  fontSize: "0.875rem",
                  "@media (max-width: 640px)": {
                    fontSize: "0.8rem",
                  },
                },
                footer: {
                  backgroundColor: "transparent",
                  borderTop: "none",
                  padding: "1rem 0 0 0",
                },
                formFieldInput: {
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  color: "#fff",
                  height: "44px",
                  borderRadius: "0.5rem",
                  fontSize: "14px",
                  "@media (max-width: 640px)": {
                    height: "42px",
                    fontSize: "16px", // Prevents zoom on iOS
                  },
                },
                formFieldLabel: {
                  fontSize: "0.875rem",
                  "@media (max-width: 640px)": {
                    fontSize: "0.8rem",
                  },
                },
                formButtonPrimary: {
                  backgroundColor: "#2563eb",
                  "&:hover": { backgroundColor: "#1d4ed8" },
                  borderRadius: "0.6rem",
                  boxShadow: "0 8px 24px rgba(37,99,235,0.18)",
                  height: "44px",
                  fontSize: "14px",
                  fontWeight: "500",
                  "@media (max-width: 640px)": {
                    height: "42px",
                    fontSize: "14px",
                  },
                },
                socialButtonsBlockButton: {
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  color: "#fff",
                  padding: "0.5rem 0.9rem",
                  height: "44px",
                  "@media (max-width: 640px)": {
                    height: "42px",
                    padding: "0.5rem 0.8rem",
                  },
                },
                socialButtonsBlockButtonText: {
                  fontSize: "14px",
                  "@media (max-width: 640px)": {
                    fontSize: "13px",
                  },
                },
                dividerLine: { backgroundColor: "transparent" },
                dividerText: {
                  color: "#9ca3af",
                  fontSize: "0.875rem",
                  "@media (max-width: 640px)": {
                    fontSize: "0.8rem",
                  },
                },
                footerActionLink: {
                  color: "#60a5fa",
                  fontSize: "0.875rem",
                  "@media (max-width: 640px)": {
                    fontSize: "0.8rem",
                  },
                },
                formFieldRow: {
                  gap: "0.75rem",
                  "@media (max-width: 640px)": {
                    gap: "0.5rem",
                  },
                },
              },
            }}
            signInUrl="/sign-in"
          />
        </div>
      </div>

      <style jsx global>{`
        @keyframes glowLeft {
          0% {
            transform: translateY(-8px) scale(1);
          }
          50% {
            transform: translateY(8px) scale(1.02);
          }
          100% {
            transform: translateY(-8px) scale(1);
          }
        }
        @keyframes glowRight {
          0% {
            transform: translateY(8px) scale(1);
          }
          50% {
            transform: translateY(-8px) scale(1.02);
          }
          100% {
            transform: translateY(8px) scale(1);
          }
        }
        .animate-glow-left {
          animation: glowLeft 7s ease-in-out infinite;
        }
        .animate-glow-right {
          animation: glowRight 8s ease-in-out infinite;
        }

        .clerk-root .clerk-footer__branding,
        .clerk-root .clerk-branding {
          display: none !important;
        }
        .clerk-root .clerk-card,
        .clerk-root .clerk-root__container,
        .clerk-root .clerk-root__card {
          background: transparent !important;
          border: none !important;
        }

        /* Mobile-specific adjustments */
        @media (max-width: 640px) {
          .clerk-root {
            width: 100%;
          }

          .clerk-root .clerk-main {
            width: 100%;
            max-width: none;
          }

          .clerk-root .clerk-card {
            width: 100%;
            padding: 0;
          }

          /* Ensure proper touch targets on mobile */
          .clerk-root button,
          .clerk-root input,
          .clerk-root a {
            min-height: 42px;
          }

          /* Improve readability on small screens */
          .clerk-root .clerk-headerTitle {
            line-height: 1.3;
          }

          .clerk-root .clerk-headerSubtitle {
            line-height: 1.4;
          }
        }

        /* Landscape phone adjustments */
        @media (max-width: 896px) and (max-height: 414px) and (orientation: landscape) {
          .min-h-screen {
            min-height: 100vh;
            padding: 1rem;
          }

          .clerk-root .clerk-headerTitle {
            font-size: 1.125rem !important;
          }

          .clerk-root .clerk-card {
            max-height: 90vh;
            overflow-y: auto;
          }
        }
      `}</style>
    </div>
  );
}
