export interface CreateWorkerBody {
  name: string
  categoryId: string
  phone?: string
  email?: string
  bio?: string
  avatar?: string
  walletAddress?: string
  locationId?: string
}

export interface UpdateWorkerBody extends Partial<CreateWorkerBody> {}

export interface WorkerQuery {
  category?: string
  page?: string
  limit?: string
}
