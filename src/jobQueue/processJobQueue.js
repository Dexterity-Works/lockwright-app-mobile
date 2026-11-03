import { JobStatus } from './constants'
import { deleteAttachmentsFolder, deleteJobFile } from './JobFileReader'
import { processJob } from './JobWorker'
import { acquireDbWriteGuard, releaseDbWriteGuard } from '../utils/dbGuard'
import { logger } from '../utils/logger'

// The vault core's words for a write without the current epoch key. The
// worklet's reply puts its own prefix in front of them.
const KEY_ERRORS = [
  'Vault key not available yet',
  'Vault key must rotate first'
]
const isKeyError = (message) =>
  typeof message === 'string' && KEY_ERRORS.some((m) => message.includes(m))
// Refusals that pass on their own: a missing key, or a vault view still
// moving under a large sync.
const mustWait = (message) =>
  isKeyError(message) ||
  (typeof message === 'string' &&
    message.includes('the vault view kept moving'))

/**
 * Orchestrates job queue processing.
 *
 * @param {Object} params
 * @param {Function} params.createRecord - From useCreateRecord hook.
 * @param {Function} params.getRecord - Fetches a record by ID from the active vault.
 * @param {Function} params.updateRecord - Updates a record in the active vault.
 * @param {string} params.activeVaultId - The currently active vault ID.
 * @param {Object} params.vaultClient - The PearpassVaultClient instance.
 * @returns {Promise<{ processed: number, succeeded: number, failed: number, errors: Array, notSaved: Array }>}
 */
export const processJobQueue = async ({
  createRecord,
  getRecord,
  updateRecord,
  activeVaultId,
  vaultClient
}) => {
  const result = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
    notSaved: []
  }

  const guardAcquired = acquireDbWriteGuard()
  if (!guardAcquired) {
    logger.log('[jobQueue] DB write guard not acquired, skipping processing')
    return result
  }

  try {
    let jobs
    try {
      jobs = await vaultClient.readJobQueue()
    } catch (error) {
      logger.error('[jobQueue] Failed to read job queue:', error)
      return result
    }

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return result
    }

    const pendingJobs = jobs.filter((j) => j.status === JobStatus.PENDING)

    for (const job of pendingJobs) {
      if (job.vaultId !== activeVaultId) {
        logger.log(
          `[jobQueue] Skipping job ${job.id}: target vault ${job.vaultId} !== active vault ${activeVaultId}`
        )
        continue
      }

      result.processed++
      job.status = JobStatus.IN_PROGRESS
      job.updatedAt = Date.now()

      try {
        await processJob(job, { createRecord, getRecord, updateRecord })

        job.status = JobStatus.COMPLETED
        job.updatedAt = Date.now()
        result.succeeded++
      } catch (error) {
        job.updatedAt = Date.now()
        job.error = error.message
        // A missing or owed vault key is a wait, not a failed save: the job
        // holds the passkey's private key and the site already has the
        // passkey, so it stays queued until the key arrives.
        if (mustWait(error.message)) {
          job.status = JobStatus.PENDING
          logger.log(`[jobQueue] Job ${job.id} waits for the vault key`)
          continue
        }
        job.retryCount = (job.retryCount || 0) + 1

        if (job.retryCount >= (job.maxRetries || 3)) {
          job.status = JobStatus.FAILED
        } else {
          job.status = JobStatus.PENDING
        }

        result.failed++
        result.errors.push({
          jobId: job.id,
          error: error.message
        })

        logger.error(
          `[jobQueue] Job ${job.id} failed (attempt ${job.retryCount}):`,
          error
        )
      }
    }

    // A FAILED job is never retried or offered again, and it holds the
    // passkey's private key. The site already has the passkey, so the user
    // must hear it wasn't saved.
    result.notSaved = jobs
      .filter((j) => j.status === JobStatus.FAILED)
      .map((job) => ({
        jobId: job.id,
        type: job.type,
        site: job.payload?.rpId || job.payload?.rpName || '',
        keyMissing: isKeyError(job.error)
      }))

    const remainingJobs = jobs.filter(
      (j) => j.status !== JobStatus.COMPLETED && j.status !== JobStatus.FAILED
    )

    if (remainingJobs.length === 0) {
      await deleteJobFile()
      await deleteAttachmentsFolder()
    } else {
      try {
        await vaultClient.writeJobQueue(remainingJobs)
      } catch (error) {
        logger.error('[jobQueue] Failed to write remaining jobs:', error)
      }
    }

    return result
  } finally {
    releaseDbWriteGuard()
  }
}
