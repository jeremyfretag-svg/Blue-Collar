import { db } from '../db.js'
import { AppError } from './AppError.js'

/**
 * Return all categories ordered by name.
 *
 * @returns Array of all `Category` records.
 */
export async function listCategories() {
  return db.category.findMany()
}

/**
 * Get a single category by id.
 *
 * @param id - The category's database id.
 * @returns The `Category` record.
 * @throws AppError 404 if no category exists with the given id.
 */
export async function getCategory(id: string) {
  const category = await db.category.findUnique({ where: { id } })
  if (!category) throw new AppError('Not found', 404)
  return category
}
