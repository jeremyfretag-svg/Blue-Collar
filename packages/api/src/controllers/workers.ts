import type { Request, Response } from 'express'
import { db } from '../db.js'

// Haversine distance in km between two lat/lng points
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function listWorkers(req: Request, res: Response) {
  const { category, page = '1', limit = '20', lat, lng, radius } = req.query

  // Geo search: if lat/lng/radius provided, filter by proximity using Haversine
  if (lat && lng) {
    const userLat = Number(lat)
    const userLng = Number(lng)
    const radiusKm = radius ? Number(radius) : 10

    if (isNaN(userLat) || isNaN(userLng) || isNaN(radiusKm))
      return res.status(400).json({ status: 'error', message: 'Invalid lat, lng, or radius', code: 400 })

    // Bounding box pre-filter (1 degree ≈ 111 km)
    const delta = radiusKm / 111
    const workers = await db.worker.findMany({
      where: {
        isActive: true,
        latitude: { gte: userLat - delta, lte: userLat + delta },
        longitude: { gte: userLng - delta, lte: userLng + delta },
        ...(category ? { categoryId: String(category) } : {}),
      },
      include: { category: true },
    })

    const withDistance = workers
      .map(w => ({ ...w, distanceKm: haversine(userLat, userLng, w.latitude!, w.longitude!) }))
      .filter(w => w.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)

    const pageNum = Number(page)
    const limitNum = Number(limit)
    const paginated = withDistance.slice((pageNum - 1) * limitNum, pageNum * limitNum)
    return res.json({ data: paginated, status: 'success', code: 200 })
  }

  const workers = await db.worker.findMany({
    where: {
      isActive: true,
      ...(category ? { categoryId: String(category) } : {}),
    },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
    include: { category: true },
  })
  return res.json({ data: workers, status: 'success', code: 200 })
}

export async function showWorker(req: Request, res: Response) {
  const worker = await db.worker.findUnique({
    where: { id: req.params.id },
    include: { category: true, portfolio: { orderBy: { order: 'asc' } } },
  })
  if (!worker) return res.status(404).json({ status: 'error', message: 'Not found', code: 404 })
  return res.json({ data: worker, status: 'success', code: 200 })
}

export async function createWorker(req: Request, res: Response) {
  const worker = await db.worker.create({ data: { ...req.body, curatorId: req.user!.id } })
  return res.status(201).json({ data: worker, status: 'success', code: 201 })
}

export async function updateWorker(req: Request, res: Response) {
  const worker = await db.worker.update({ where: { id: req.params.id }, data: req.body })
  return res.json({ data: worker, status: 'success', code: 200 })
}

export async function deleteWorker(req: Request, res: Response) {
  await db.worker.delete({ where: { id: req.params.id } })
  return res.status(204).send()
}

export async function toggleActivation(req: Request, res: Response) {
  const worker = await db.worker.findUnique({ where: { id: req.params.id } })
  if (!worker) return res.status(404).json({ status: 'error', message: 'Not found', code: 404 })
  const updated = await db.worker.update({
    where: { id: req.params.id },
    data: { isActive: !worker.isActive },
  })
  return res.json({ data: updated, status: 'success', code: 200 })
}
