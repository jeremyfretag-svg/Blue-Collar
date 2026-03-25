import type { Request, Response } from 'express'
import { AppError } from '../services/AppError.js'
import * as categoryService from '../services/category.service.js'

function handleError(res: Response, err: unknown) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ status: 'error', message: err.message, code: err.statusCode })
  }
  console.error(err)
  return res.status(500).json({ status: 'error', message: 'Internal server error', code: 500 })
}

export async function listCategories(_req: Request, res: Response) {
  const categories = await categoryService.listCategories()
  return res.json({ data: categories, status: 'success', code: 200 })
}

export async function getCategory(req: Request, res: Response) {
  try {
    const category = await categoryService.getCategory(req.params.id)
    return res.json({ data: category, status: 'success', code: 200 })
  } catch (err) {
    return handleError(res, err)
  }
}
