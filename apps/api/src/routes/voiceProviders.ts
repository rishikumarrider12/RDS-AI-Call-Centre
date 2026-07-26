import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { VoiceProviderService } from '../services/voiceProvider.service'
import { ProviderCredentialService } from '../services/providerCredential.service'
import { ProviderHealthService } from '../services/providerHealth.service'
import { VoiceModelService } from '../services/voiceModel.service'
import { ProviderSelectionService } from '../services/providerSelection.service'
import { recordAudit } from '../lib/audit'
import { logger } from '../lib/logger'

const router = Router()
const voiceProviderService = new VoiceProviderService()
const credentialService = new ProviderCredentialService()
const healthService = new ProviderHealthService()
const voiceModelService = new VoiceModelService()
const selectionService = new ProviderSelectionService()

const createProviderSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['tts', 'stt', 'both']),
  description: z.string().nullable().optional(),
  configSchema: z.record(z.unknown()).optional(),
  capabilities: z.record(z.unknown()).optional(),
})

const updateProviderSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  configSchema: z.record(z.unknown()).optional(),
  capabilities: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

const saveCredentialSchema = z.object({
  providerKey: z.string().min(1),
  credentials: z.record(z.unknown()),
})

const verifyCredentialSchema = z.object({
  providerKey: z.string().min(1),
  credentials: z.record(z.unknown()).optional(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const providers = await voiceProviderService.listProviders()
    res.status(200).json({ providers })
  } catch (err) {
    logger.error(err, 'list voice providers failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list voice providers' })
  }
})

router.get('/:key', authenticate, async (req: Request, res: Response) => {
  try {
    const provider = await voiceProviderService.getProviderByKey(req.params.key)
    if (!provider) {
      return res.status(404).json({ error: 'Voice provider not found' })
    }
    res.status(200).json({ provider })
  } catch (err) {
    logger.error(err, `get voice provider ${req.params.key} failed`)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get voice provider' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const input = createProviderSchema.parse(req.body)
    const actorId = req.user?.id ?? 'unknown'
    const provider = await voiceProviderService.createProvider(actorId, input)
    res.status(201).json({ provider })
  } catch (err) {
    logger.error(err, 'create voice provider failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create voice provider' })
  }
})

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const input = updateProviderSchema.parse(req.body)
    const actorId = req.user?.id ?? 'unknown'
    const provider = await voiceProviderService.updateProvider(actorId, req.params.id, input)
    res.status(200).json({ provider })
  } catch (err) {
    logger.error(err, `update voice provider ${req.params.id} failed`)
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update voice provider' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const actorId = req.user?.id ?? 'unknown'
    await voiceProviderService.deleteProvider(actorId, req.params.id)
    res.status(204).send()
  } catch (err) {
    logger.error(err, `delete voice provider ${req.params.id} failed`)
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete voice provider' })
  }
})

router.post('/:key/register', authenticate, async (req: Request, res: Response) => {
  try {
    const _actorId = req.user?.id ?? 'unknown'
    const provider = voiceProviderService.getRegistry()?.getProvider(req.params.key)
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found in registry' })
    }
    provider.isActive = true
    res.status(200).json({ provider })
  } catch (err) {
    logger.error(err, `register voice provider ${req.params.key} failed`)
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to register provider' })
  }
})

router.post('/:key/deregister', authenticate, async (req: Request, res: Response) => {
  try {
    const _actorId = req.user?.id ?? 'unknown'
    const provider = voiceProviderService.getRegistry()?.getProvider(req.params.key)
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found in registry' })
    }
    provider.isActive = false
    res.status(200).json({ provider })
  } catch (err) {
    logger.error(err, `deregister voice provider ${req.params.key} failed`)
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to deregister provider' })
  }
})

router.get('/:key/health', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId ?? ''
    const health = await healthService.checkProviderHealth(req.params.key, organizationId)
    res.status(200).json({ health })
  } catch (err) {
    logger.error(err, `health check for provider ${req.params.key} failed`)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to check provider health' })
  }
})

router.get('/health/all', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId ?? ''
    const health = await healthService.checkAllProvidersHealth(organizationId)
    res.status(200).json({ health })
  } catch (err) {
    logger.error(err, 'health check all providers failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to check provider health' })
  }
})

router.post('/credentials', authenticate, async (req: Request, res: Response) => {
  try {
    const input = saveCredentialSchema.parse(req.body)
    const actorId = req.user?.id ?? 'unknown'
    const organizationId = req.user?.organizationId ?? ''
    const credential = await credentialService.saveCredential(actorId, organizationId, input)
    res.status(201).json({ credential })
  } catch (err) {
    logger.error(err, 'save provider credential failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save provider credential' })
  }
})

router.get('/credentials', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId ?? ''
    const credentials = await credentialService.listCredentials(organizationId)
    res.status(200).json({ credentials })
  } catch (err) {
    logger.error(err, 'list provider credentials failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list provider credentials' })
  }
})

router.get('/credentials/:providerKey', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId ?? ''
    const credential = await credentialService.getCredential(organizationId, req.params.providerKey)
    if (!credential) {
      return res.status(404).json({ error: 'Provider credential not found' })
    }
    res.status(200).json({ credential })
  } catch (err) {
    logger.error(err, `get provider credential ${req.params.providerKey} failed`)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get provider credential' })
  }
})

router.put('/credentials/:providerKey', authenticate, async (req: Request, res: Response) => {
  try {
    const input = saveCredentialSchema.parse(req.body)
    const actorId = req.user?.id ?? 'unknown'
    const organizationId = req.user?.organizationId ?? ''
    const credential = await credentialService.saveCredential(actorId, organizationId, input)
    res.status(200).json({ credential })
  } catch (err) {
    logger.error(err, `update provider credential ${req.params.providerKey} failed`)
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update provider credential' })
  }
})

router.delete('/credentials/:providerKey', authenticate, async (req: Request, res: Response) => {
  try {
    const actorId = req.user?.id ?? 'unknown'
    const organizationId = req.user?.organizationId ?? ''
    await credentialService.deleteCredential(actorId, organizationId, req.params.providerKey)
    res.status(204).send()
  } catch (err) {
    logger.error(err, `delete provider credential ${req.params.providerKey} failed`)
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete provider credential' })
  }
})

router.post('/credentials/:providerKey/verify', authenticate, async (req: Request, res: Response) => {
  try {
    const _input = verifyCredentialSchema.parse(req.body)
    const organizationId = req.user?.organizationId ?? ''
    const result = await credentialService.verifyCredential(organizationId, req.params.providerKey)
    res.status(200).json({ result })
  } catch (err) {
    logger.error(err, `verify provider credential ${req.params.providerKey} failed`)
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to verify provider credential' })
  }
})

router.post('/:key/stream', authenticate, async (req: Request, res: Response) => {
  try {
    const _organizationId = req.user?.organizationId ?? ''
    const providerKey = req.params.key
    const { text, voiceId, options } = req.body as { text: string; voiceId: string; options?: Record<string, unknown> }

    if (!text || !voiceId) {
      return res.status(400).json({ error: 'text and voiceId are required for streaming' })
    }

    const DI = voiceProviderService.getDIContainer()
    const provider = DI.getProvider(providerKey)
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' })
    }

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Transfer-Encoding', 'chunked')

    const stream = await provider.streamAudio(text, voiceId, options)
    const reader = stream.getReader()

    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(Buffer.from(value))
        }
        res.end()
      } catch (streamErr) {
        res.status(500).json({ error: 'Stream failed: ' + (streamErr instanceof Error ? streamErr.message : 'Unknown error') })
      }
    }

    pump()
  } catch (err) {
    logger.error(err, `stream audio for provider ${req.params.key} failed`)
    if (!res.headersSent) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to stream audio' })
    }
  }
})

router.post('/:key/stream-stt', authenticate, async (req: Request, res: Response) => {
  try {
    const _organizationId = req.user?.organizationId ?? ''
    const providerKey = req.params.key
    const { language, options } = req.body as { language?: string; options?: Record<string, unknown> }

    const DI = voiceProviderService.getDIContainer()
    const provider = DI.getProvider(providerKey)
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' })
    }

    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', async () => {
      try {
        const combined = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0))
        let offset = 0
        for (const c of chunks) {
          combined.set(c, offset)
          offset += c.length
        }

        const audioStream = new ReadableStream({
          start(controller) {
            controller.enqueue(combined)
            controller.close()
          },
        })

        const result = await provider.streamTranscription(audioStream, language, options)
        res.status(200).json({ result })
      } catch (streamErr) {
        logger.error(streamErr, `stream STT for provider ${providerKey} failed`)
        res.status(500).json({ error: 'Stream transcription failed: ' + (streamErr instanceof Error ? streamErr.message : 'Unknown error') })
      }
    })

    req.on('error', (err) => {
      logger.error(err, `request error for stream STT provider ${providerKey}`)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Request error' })
      }
    })
  } catch (err) {
    logger.error(err, `stream STT for provider ${req.params.key} failed`)
    if (!res.headersSent) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to stream transcription' })
    }
  }
})

router.get('/:key/health-detailed', authenticate, async (req: Request, res: Response) => {
  try {
    const provider = voiceProviderService.getRegistry()?.getProvider(req.params.key)
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' })
    }
    const health = await provider.healthCheck()
    res.status(200).json({ health })
  } catch (err) {
    logger.error(err, `detailed health check for provider ${req.params.key} failed`)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to check provider health' })
  }
})

router.get('/failover/status', authenticate, async (req: Request, res: Response) => {
  try {
    const DI = voiceProviderService.getDIContainer()
    const failover = DI.getFailover()
    const allProviders = failover.getAllProviders()
    const result = allProviders.map((provider) => {
      const health = failover.getHealthStatus(provider.key)
      return {
        key: provider.key,
        name: provider.name,
        category: provider.category,
        isActive: provider.isActive,
        circuitOpen: health?.circuitOpen ?? false,
        failureCount: health?.failureCount ?? 0,
        lastFailureAt: health?.lastFailureAt ?? null,
        priority: health?.priority ?? 0,
      }
    })
    res.status(200).json({ failover: result })
  } catch (err) {
    logger.error(err, 'failover status check failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get failover status' })
  }
})

router.get('/failover/status/:key', authenticate, async (req: Request, res: Response) => {
  try {
    const DI = voiceProviderService.getDIContainer()
    const failover = DI.getFailover()
    const provider = DI.getProvider(req.params.key)
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' })
    }
    const health = failover.getHealthStatus(provider.key)
    res.status(200).json({
      key: provider.key,
      name: provider.name,
      category: provider.category,
      isActive: provider.isActive,
      circuitOpen: health?.circuitOpen ?? false,
      failureCount: health?.failureCount ?? 0,
      lastFailureAt: health?.lastFailureAt ?? null,
      priority: health?.priority ?? 0,
    })
  } catch (err) {
    logger.error(err, `failover status check for provider ${req.params.key} failed`)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get failover status' })
  }
})

router.post('/failover/test/:key', authenticate, async (req: Request, res: Response) => {
  try {
    const DI = voiceProviderService.getDIContainer()
    const failover = DI.getFailover()
    const provider = DI.getProvider(req.params.key)
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' })
    }
    const health = await provider.healthCheck()
    if (health.status === 'healthy') {
      failover.recordSuccess(provider.key)
    } else {
      failover.recordFailure(provider.key)
    }
    const updatedHealth = failover.getHealthStatus(provider.key)
    res.status(200).json({
      key: provider.key,
      name: provider.name,
      health,
      failover: updatedHealth,
    })
  } catch (err) {
    logger.error(err, `failover test for provider ${req.params.key} failed`)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to test failover' })
  }
})

router.get('/voices', authenticate, async (req: Request, res: Response) => {
  try {
    const { providerKey, type, language, gender } = req.query as {
      providerKey?: string
      type?: string
      language?: string
      gender?: string
    }
    const voices = await voiceModelService.listModels(
      providerKey ?? '',
      type
    )
    const filtered = voices.filter((v) => {
      if (language && v.language !== language) return false
      if (gender && v.gender !== gender) return false
      return true
    })
    res.status(200).json({ voices: filtered })
  } catch (err) {
    logger.error(err, 'list voices failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list voices' })
  }
})

router.post('/voices/discover', authenticate, async (req: Request, res: Response) => {
  try {
    const DI = voiceProviderService.getDIContainer()
    const providers = DI.getActiveProviders()
    const results: Array<{
      providerKey: string
      providerName: string
      discovered: number
      error?: string
    }> = []

    for (const provider of providers) {
      try {
        const voices = await provider.getAvailableVoices()
        for (const voice of voices) {
          const existing = await voiceModelService.listModels(provider.key, voice.type)
          const match = existing.find(
            (v) => v.modelId === voice.modelId && v.providerKey === provider.key
          )
          if (!match) {
            await voiceModelService.createModel(
              '',
              'system',
              {
                providerKey: provider.key,
                modelId: voice.modelId,
                name: voice.name,
                type: voice.type,
                language: voice.language,
                gender: voice.gender,
                metadata: voice.metadata ?? {},
              }
            )
          }
        }
        results.push({
          providerKey: provider.key,
          providerName: provider.name,
          discovered: voices.length,
        })
      } catch (err) {
        results.push({
          providerKey: provider.key,
          providerName: provider.name,
          discovered: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    res.status(200).json({ results })
  } catch (err) {
    logger.error(err, 'discover voices failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to discover voices' })
  }
})

router.get('/voices/:providerKey', authenticate, async (req: Request, res: Response) => {
  try {
    const provider = voiceProviderService.getDIContainer()?.getProvider(req.params.providerKey)
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' })
    }
    const voices = await provider.getAvailableVoices()
    res.status(200).json({ provider: provider.key, name: provider.name, voices })
  } catch (err) {
    logger.error(err, `discover voices for provider ${req.params.providerKey} failed`)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to discover voices' })
  }
})

router.post('/voices/:providerKey/refresh', authenticate, async (req: Request, res: Response) => {
  try {
    const DI = voiceProviderService.getDIContainer()
    const provider = DI.getProvider(req.params.providerKey)
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' })
    }
    const voices = await provider.getAvailableVoices()
    const existing = await voiceModelService.listModels(req.params.providerKey, undefined)
    const existingIds = new Set(existing.map((v) => v.modelId))

    for (const voice of voices) {
      if (!existingIds.has(voice.modelId)) {
        await voiceModelService.createModel(
          '',
          'system',
          {
            providerKey: provider.key,
            modelId: voice.modelId,
            name: voice.name,
            type: voice.type,
            language: voice.language,
            gender: voice.gender,
            metadata: voice.metadata ?? {},
          }
        )
      }
    }

    res.status(200).json({ providerKey: provider.key, refreshed: voices.length, discovered: voices.length })
  } catch (err) {
    logger.error(err, `refresh voices for provider ${req.params.providerKey} failed`)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to refresh voices' })
  }
})

router.put('/voices/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, isActive, metadata } = req.body as {
      name?: string
      isActive?: boolean
      metadata?: Record<string, unknown>
    }
    const voice = await voiceModelService.updateModel('', '', req.params.id, {
      name,
      isActive,
      metadata,
    })
    res.status(200).json({ voice })
  } catch (err) {
    logger.error(err, `update voice ${req.params.id} failed`)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update voice' })
  }
})

router.delete('/voices/:id', authenticate, async (req: Request, res: Response) => {
  try {
    await voiceModelService.deleteModel('', '', req.params.id)
    res.status(204).send()
  } catch (err) {
    logger.error(err, `delete voice ${req.params.id} failed`)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete voice' })
  }
})

router.get('/selection/tts', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId ?? ''
    const preferredProvider = req.query.preferredProvider as string | undefined
    const provider = await selectionService.selectTtsProvider(organizationId, preferredProvider)
    res.status(200).json({ provider })
  } catch (err) {
    logger.error(err, 'select TTS provider failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to select TTS provider' })
  }
})

router.get('/selection/stt', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId ?? ''
    const preferredProvider = req.query.preferredProvider as string | undefined
    const provider = await selectionService.selectSttProvider(organizationId, preferredProvider)
    res.status(200).json({ provider })
  } catch (err) {
    logger.error(err, 'select STT provider failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to select STT provider' })
  }
})

const getVoicesSchema = z.object({
  providerKey: z.string().min(1),
  language: z.string().optional(),
})

router.get('/selection/voices', authenticate, async (req: Request, res: Response) => {
  try {
    const input = getVoicesSchema.parse(req.query)
    const voices = await selectionService.getAvailableVoices(input.providerKey, input.language)
    res.status(200).json({ voices })
  } catch (err) {
    logger.error(err, 'get available voices failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get available voices' })
  }
})

const getLanguagesSchema = z.object({
  providerKey: z.string().optional(),
})

router.get('/selection/languages', authenticate, async (req: Request, res: Response) => {
  try {
    const input = getLanguagesSchema.parse(req.query)
    const languages = await selectionService.getSupportedLanguages(input.providerKey)
    res.status(200).json({ languages })
  } catch (err) {
    logger.error(err, 'get supported languages failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get supported languages' })
  }
})

router.get('/selection/providers', authenticate, async (req: Request, res: Response) => {
  try {
    const providers = await selectionService.listAllProviders()
    const result = providers.map((p) => ({
      key: p.key,
      name: p.name,
      category: p.category,
      isActive: p.isActive,
      capabilities: p.capabilities,
    }))
    res.status(200).json({ providers: result })
  } catch (err) {
    logger.error(err, 'list all providers failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list providers' })
  }
})

export default router