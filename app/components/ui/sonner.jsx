"use client";

import { useEffect, useState } from "react";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Sonner
      theme="dark" // Explicitly set to dark
      className="toaster group"
      toastOptions={{
        style: {
          background: "rgb(2 6 23)", // slate-950
          border: "1px solid rgb(30 41 59)", // slate-800
          color: "rgb(248 250 252)", // slate-50
        },
        classNames: {
          description: "text-slate-400",
          actionButton: "bg-slate-50 text-slate-900",
          cancelButton: "bg-slate-800 text-slate-400",
        },
      }}
      position="top-right"
      closeButton
      richColors={false} // Disable rich colors to use custom styles
      {...props}
    />
  );
};

export { Toaster };
