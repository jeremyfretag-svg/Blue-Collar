import { db } from '../db.js'
import { AppError } from './AppError.js'

export async function listWorkers(opts: {
  category?: string
  page?: number
  limit?: number
}) {
  const { category, page = 1, limit = 20 } = opts
  return db.worker.findMany({
    where: { isActive: true, ...(category ? { categoryId: category } : {}) },
    skip: (page - 1) * limit,
    take: limit,
    include: { category: true },
  })
}

export async function getWorker(id: string) {
  const worker = await db.worker.findUnique({ where: { id }, include: { category: true } })
  if (!worker) throw new AppError('Not found', 404)
  return worker
}

export async function createWorker(data: Record<string, unknown>, curatorId: string) {
  return db.worker.create({ data: { ...data, curatorId } as any })
}

export async function updateWorker(id: string, data: Record<string, unknown>) {
  return db.worker.update({ where: { id }, data: data as any })
}

export async function deleteWorker(id: string) {
  await db.worker.delete({ where: { id } })
}

export async function toggleWorker(id: string) {
  const worker = await db.worker.findUnique({ where: { id } })
  if (!worker) throw new AppError('Not found', 404)
  return db.worker.update({ where: { id }, data: { isActive: !worker.isActive } })
}
