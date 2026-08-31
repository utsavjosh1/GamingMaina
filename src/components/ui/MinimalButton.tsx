import React from "react";

interface MinimalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "outline";
}

export function MinimalButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: MinimalButtonProps) {
  const baseStyle =
    "relative px-6 py-3 md:px-8 md:py-4 font-sans font-medium tracking-wide transition-all duration-300 ease-out cursor-pointer text-sm uppercase";
  const variants = {
    primary: "bg-white text-black hover:bg-zinc-200 border border-transparent",
    outline:
      "bg-transparent text-white border border-white hover:bg-white hover:text-black",
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
