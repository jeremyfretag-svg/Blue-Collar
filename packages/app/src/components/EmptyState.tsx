import Link from "next/link";
import { Search, Bookmark, Star, Users } from "lucide-react";

type Variant = "no-workers" | "no-bookmarks" | "no-reviews" | "no-search-results";

interface EmptyStateProps {
  variant: Variant;
  /** Override the default CTA href */
  ctaHref?: string;
}

const config: Record<
  Variant,
  { icon: React.ReactNode; title: string; description: string; cta: string; defaultHref: string }
> = {
  "no-workers": {
    icon: <Users size={40} className="text-blue-200" />,
    title: "No workers listed yet",
    description: "Be the first to add a skilled worker to the community.",
    cta: "Add a Worker",
    defaultHref: "/dashboard/workers/new",
  },
  "no-bookmarks": {
    icon: <Bookmark size={40} className="text-blue-200" />,
    title: "No saved workers yet",
    description: "Bookmark workers you like to find them quickly later.",
    cta: "Browse Workers",
    defaultHref: "/workers",
  },
  "no-reviews": {
    icon: <Star size={40} className="text-blue-200" />,
    title: "No reviews yet",
    description: "Be the first to share your experience with this worker.",
    cta: "Write a Review",
    defaultHref: "#review-form",
  },
  "no-search-results": {
    icon: <Search size={40} className="text-blue-200" />,
    title: "No results found",
    description: "Try different keywords, a broader location, or remove some filters.",
    cta: "Clear Filters",
    defaultHref: "/workers",
  },
};

export default function EmptyState({ variant, ctaHref }: EmptyStateProps) {
  const { icon, title, description, cta, defaultHref } = config[variant];
  const href = ctaHref ?? defaultHref;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border bg-white py-20 px-6 text-center shadow-sm">
      <div className="mb-4">{icon}</div>
      <p className="text-lg font-semibold text-gray-700">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-gray-500">{description}</p>
      <Link
        href={href}
        className="mt-5 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        {cta}
      </Link>
    </div>
  );
}
