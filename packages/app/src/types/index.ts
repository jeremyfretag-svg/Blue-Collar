export interface Category {
  id: string;
  name: string;
  icon?: string | null;
}

export interface Worker {
  id: string;
  name: string;
  bio?: string | null;
  avatar?: string | null;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  isVerified: boolean;
  locationId?: string | null;
  walletAddress?: string | null;
  category: Category;
  averageRating?: number | null;
  reviewCount?: number;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  workerId: string;
  authorId: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string | null;
  };
}

export interface Meta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: Meta;
  status: string;
  code: number;
}
