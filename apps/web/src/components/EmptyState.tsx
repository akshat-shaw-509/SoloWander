import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
      <Icon className="mx-auto h-12 w-12 text-gray-400" />
      <h2 className="mt-4 text-xl font-bold">{title}</h2>
      <p className="mt-2 text-gray-500">{description}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
