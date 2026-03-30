import type { Request, Response } from 'express'
import { db } from '../db.js'

export async function savePushSubscription(req: Request, res: Response) {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized', code: 401 })

  const { endpoint, keys } = req.body
  if (!endpoint || !keys?.auth || !keys?.p256dh) {
    return res.status(400).json({ status: 'error', message: 'Invalid subscription', code: 400 })
  }

  try {
    const subscription = await db.pushSubscription.upsert({
      where: { userId_endpoint: { userId, endpoint } },
      update: { auth: keys.auth, p256dh: keys.p256dh },
      create: { userId, endpoint, auth: keys.auth, p256dh: keys.p256dh },
    })

    return res.json({ data: subscription, status: 'success', code: 201 })
  } catch (error) {
    console.error('[savePushSubscription] error:', error)
    return res.status(500).json({ status: 'error', message: 'Failed to save subscription', code: 500 })
  }
}

export async function deletePushSubscription(req: Request, res: Response) {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized', code: 401 })

  const { endpoint } = req.body
  if (!endpoint) {
    return res.status(400).json({ status: 'error', message: 'Endpoint required', code: 400 })
  }

  try {
    await db.pushSubscription.delete({
      where: { userId_endpoint: { userId, endpoint } },
    })

    return res.json({ status: 'success', message: 'Unsubscribed', code: 200 })
  } catch (error) {
    console.error('[deletePushSubscription] error:', error)
    return res.status(500).json({ status: 'error', message: 'Failed to unsubscribe', code: 500 })
  }
}
