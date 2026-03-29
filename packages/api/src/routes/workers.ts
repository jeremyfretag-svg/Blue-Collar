import { Router } from 'express'
import {
  listWorkers,
  listMyWorkers,
  createWorker,
  showWorker,
  updateWorker,
  deleteWorker,
  toggleActivation,
} from '../controllers/workers.js'
import { toggleBookmark } from '../controllers/bookmarks.js'
import { createReview, listReviews } from '../controllers/reviews.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { upload, handleMulterError } from '../middleware/upload.js'
import { createWorkerRules } from '../validations/worker.js'

const router = Router()

router.get('/', listWorkers)
router.get('/mine', authenticate, authorize('curator', 'admin'), listMyWorkers)
router.get('/:id', showWorker)
router.post('/', authenticate, authorize('curator'), validate(createWorkerRules), createWorker)
router.put('/:id', authenticate, authorize('curator'), updateWorker)
router.delete('/:id', authenticate, authorize('curator'), deleteWorker)
router.patch('/:id/toggle', authenticate, authorize('curator'), toggleActivation)

// Bookmarks
router.post('/:id/bookmark', authenticate, toggleBookmark)

// Reviews
router.get('/:id/reviews', listReviews)
router.post('/:id/reviews', authenticate, createReview)

export default router
