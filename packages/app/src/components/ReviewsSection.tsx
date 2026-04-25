"use client";

import { useState } from "react";
import ReviewCard from "./ReviewCard";
import ReviewForm from "./ReviewForm";
import RatingBreakdown from "./RatingBreakdown";
import EmptyState from "./EmptyState";
import type { Review, RatingDistributionEntry } from "@/types";
import { getWorkerReviews } from "@/lib/api";

interface Props {
  workerId: string;
  initialReviews: Review[];
  reviewCount: number;
  averageRating: number | null;
  distribution: RatingDistributionEntry[];
}

export default function ReviewsSection({
  workerId,
  initialReviews,
  reviewCount,
  averageRating,
  distribution,
}: Props) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [count, setCount] = useState<number>(reviewCount);
  const [filteredReviews, setFilteredReviews] = useState<Review[] | null>(null);
  const [filterLoading, setFilterLoading] = useState(false);

  const handleReviewCreated = (review: Review) => {
    setReviews((prev: Review[]) => [review, ...prev]);
    setCount((c: number) => c + 1);
  };

  const handleFilterChange = async (rating: number | null) => {
    if (rating === null) {
      setFilteredReviews(null);
      return;
    }
    setFilterLoading(true);
    try {
      const res = await getWorkerReviews(workerId, { rating: String(rating), limit: "50" });
      setFilteredReviews(res.data);
    } catch {
      setFilteredReviews(null);
    } finally {
      setFilterLoading(false);
    }
  };

  const displayed = filteredReviews ?? reviews;

  return (
    <div className="mt-8 border-t pt-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Reviews {count > 0 && `(${count})`}
      </h2>

      {count > 0 && (
        <RatingBreakdown
          averageRating={averageRating}
          reviewCount={count}
          distribution={distribution}
          onFilterChange={handleFilterChange}
        />
      )}

      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">Leave a review</p>
        <ReviewForm workerId={workerId} onReviewCreated={handleReviewCreated} />
      </div>

      {filterLoading ? (
        <div className="py-6 text-center text-sm text-gray-400">Loading...</div>
      ) : displayed.length > 0 ? (
        <div>
          {displayed.map((review: Review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <EmptyState variant="no-reviews" ctaHref="#review-form" />
      )}
    </div>
  );
}
