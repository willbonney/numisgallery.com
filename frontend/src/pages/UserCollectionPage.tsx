import { Center, Container, Loader, Text, Title } from '@mantine/core'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Gallery } from '../components/Gallery'
import type { User } from '../contexts/types'
import { useAuth } from '../hooks/useAuth'
import pb from '../lib/pocketbase'
import { banknoteService } from '../services/banknotes'
import type { Banknote } from '../types/banknote'

export function UserCollectionPage() {
  const { userId } = useParams<{ userId: string }>()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [banknotes, setBanknotes] = useState<Banknote[]>([])
  const [collectionOwner, setCollectionOwner] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingOwner, setLoadingOwner] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Check if viewing own collection
  const isOwner = user?.id === userId
  const banknoteId = searchParams.get('banknote')

  const loadBanknotes = useCallback(async () => {
    if (!userId) return
    
    try {
      setLoading(true)
      setError(null)
      const data = await banknoteService.getUserBanknotes(userId)
      setBanknotes(data)
    } catch (error) {
      console.error('Failed to load collection:', error)
      const err = error as { status?: number; response?: { code?: number } }
      if (err?.status === 403 || err?.response?.code === 403) {
        setError('This collection is private or the API rules do not allow public access. Please sign in to view your own collection.')
      } else if (err?.status === 404 || err?.response?.code === 404) {
        setError('Collection not found. The user may not exist or have no public banknotes.')
      } else {
        setError('Failed to load collection. It may be private or not exist.')
      }
    } finally {
      setLoading(false)
    }
  }, [userId])

  const loadCollectionOwner = useCallback(async () => {
    if (!userId) return
    
    try {
      setLoadingOwner(true)
      const owner = await pb.collection('users').getOne<User>(userId)
      setCollectionOwner(owner)
    } catch (error) {
      console.error('Failed to load collection owner:', error)
      setCollectionOwner(null)
    } finally {
      setLoadingOwner(false)
    }
  }, [userId])

  useEffect(() => {
    loadBanknotes()
    loadCollectionOwner()
  }, [loadBanknotes, loadCollectionOwner])

  if (loading || loadingOwner) {
    return (
      <Center h={400}>
        <Loader />
      </Center>
    )
  }

  if (error) {
    return (
      <Container size="xl" py="md">
        <Title order={2} mb="xs">Collection</Title>
        <Text c="red">{error}</Text>
      </Container>
    )
  }

  const ownerName = collectionOwner?.username || collectionOwner?.name || collectionOwner?.email?.split('@')[0] || 'Unknown User'
  const collectionTitle = isOwner ? 'Your Collection' : `${ownerName}'s Collection`

  if (banknotes.length === 0) {
    return (
      <Container size="xl" py="md">
        <Title order={2} mb="xs">
          {collectionTitle}
        </Title>
        <Text c="dimmed">No banknotes in this collection yet.</Text>
      </Container>
    )
  }

  return (
    <Container size="xl" py="md">
      <Title order={2} mb="xs">
        {collectionTitle}
      </Title>
      <Text c="dimmed" size="sm" mb="lg">
        {banknotes.length} banknote{banknotes.length !== 1 ? 's' : ''}
        {!isOwner && ' (public)'}
      </Text>
      <Gallery 
        banknotes={banknotes} 
        showOwner={!isOwner} 
        gateFilters={false}
        initialBanknoteId={banknoteId || undefined}
      />
    </Container>
  )
}
