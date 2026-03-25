import { db } from '../db.js'
import { AppError } from './AppError.js'

export async function listCategories() {
  return db.category.findMany()
}

export async function getCategory(id: string) {
  const category = await db.category.findUnique({ where: { id } })
  if (!category) throw new AppError('Not found', 404)
  return category
}
