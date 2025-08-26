import { ButtonHTMLAttributes } from "react";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };

export default function Button({ variant="primary", className="", ...props }: Props) {
  const base = "btn " + (variant === "primary" ? "btn-primary" : "btn-ghost");
  return <button {...props} className={`${base} ${className}`} />;
}
