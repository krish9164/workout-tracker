import { PropsWithChildren } from "react";
export function Card({ children }: PropsWithChildren) {
  return <div className="card p-5">{children}</div>;
}
export function CardHeader({ children }: PropsWithChildren) {
  return <div className="mb-3"><h2 className="text-xl font-semibold">{children}</h2></div>;
}
export function CardFooter({ children }: PropsWithChildren) {
  return <div className="mt-3">{children}</div>;
}
