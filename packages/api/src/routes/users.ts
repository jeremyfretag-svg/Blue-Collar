import { Router } from 'express'
import { listMyBookmarks } from '../controllers/bookmarks.js'
import { savePushSubscription, deletePushSubscription } from '../controllers/users.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/me/bookmarks', authenticate, listMyBookmarks)
router.post('/me/push-subscription', authenticate, savePushSubscription)
router.delete('/me/push-subscription', authenticate, deletePushSubscription)

export default router
