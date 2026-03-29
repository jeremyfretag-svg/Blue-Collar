import type { Request, Response } from 'express'
import * as categoryService from '../services/category.service.js'
import { handleError } from '../utils/handleError.js'
import { CategoryResource, CategoryCollection } from '../resources/index.js'

/**
 * GET /api/categories
 * List all available worker categories.
 *
 * @param _req - Unused.
 * @param res - JSON `{ data: Category[], status, code: 200 }`.
 */
export async function listCategories(_req: Request, res: Response) {
  try {
    const categories = await categoryService.listCategories()
    return res.json({ data: CategoryCollection(categories as any), status: 'success', code: 200 })
  } catch (err) {
    return handleError(res, err)
  }
}

/**
 * GET /api/categories/:id
 * Get a single category by id.
 *
 * @param req - Route param `id`.
 * @param res - JSON `{ data: Category, status, code: 200 }` or 404.
 */
export async function getCategory(req: Request, res: Response) {
  try {
    const category = await categoryService.getCategory(req.params.id as string)
    if (!category) {
      return res.status(404).json({ status: 'error', message: 'Category not found', code: 404 })
    }
    return res.json({ data: CategoryResource(category as any), status: 'success', code: 200 })
  } catch (err) {
    return handleError(res, err)
  }
}
