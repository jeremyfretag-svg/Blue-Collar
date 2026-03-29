import { Router } from 'express'
import { listMyBookmarks } from '../controllers/bookmarks.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/me/bookmarks', authenticate, listMyBookmarks)

export default router
