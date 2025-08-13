"use client";
import { SignIn } from "@clerk/nextjs";
import DarkVeil from "../../components/DarkVeil";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black p-6">
      {/* Fullscreen DarkVeil Background */}
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

      {/* Glowing side accents */}
      <div
        className="absolute -left-12 top-1/2 transform -translate-y-1/2 w-24 h-[480px] pointer-events-none animate-glow-left"
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
        className="absolute -right-12 top-1/2 transform -translate-y-1/2 w-24 h-[480px] pointer-events-none animate-glow-right"
        style={{
          background:
            "linear-gradient(180deg, rgba(16,185,129,0.16), rgba(34,197,94,0.03) 40%, rgba(16,185,129,0))",
          mixBlendMode: "screen",
          borderRadius: "1rem",
          filter: "blur(24px)",
          opacity: 0.6,
        }}
      />

      {/* SignIn Glass Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] backdrop-blur-md shadow-2xl p-6">
          <SignIn
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
              },
              elements: {
                card: {
                  backgroundColor: "transparent",
                  boxShadow: "none",
                  border: "none",
                },
                footer: {
                  backgroundColor: "transparent",
                  borderTop: "none",
                  padding: "0",
                },
                footerActionLink: { color: "#60a5fa" },
                footerSecondary: {
                  color: "#9ca3af",
                  backgroundColor: "transparent",
                },
                dividerLine: { backgroundColor: "transparent" },
                dividerText: { color: "#9ca3af" },
                formFieldInput: {
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  color: "#fff",
                  height: "44px",
                  borderRadius: "0.5rem",
                },
                formButtonPrimary: {
                  backgroundColor: "#2563eb",
                  "&:hover": { backgroundColor: "#1d4ed8" },
                  borderRadius: "0.6rem",
                  boxShadow: "0 8px 24px rgba(37,99,235,0.18)",
                },
                socialButtonsBlockButton: {
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  color: "#fff",
                  padding: "0.5rem 0.9rem",
                },
              },
            }}
            redirectUrl="/"
            signUpUrl="/sign-up"
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
      `}</style>
    </div>
  );
}
