import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { api } from '@/redux/api'
import toast from 'react-hot-toast'

export const useSSESync = () => {
  const accessToken = useAppSelector((state) => state.auth.accessToken)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!accessToken) return

    const eventSource = new EventSource(`/api/v1/notifications/stream?token=${accessToken}`)

    eventSource.onmessage = () => {
      // heartbeat ping receiver
    }

    eventSource.addEventListener('invalidate', (event: any) => {
      try {
        const tags = JSON.parse(event.data)
        if (Array.isArray(tags)) {
          dispatch(api.util.invalidateTags(tags))
        }
      } catch (err) {
        console.error('Failed to parse SSE invalidate tags:', err)
      }
    })

    eventSource.addEventListener('notification_created', (event: any) => {
      try {
        const notification = JSON.parse(event.data)
        toast.success(`Notification: ${notification.title}\n${notification.message}`, {
          duration: 4000,
          position: 'top-right',
        })
      } catch (err) {
        console.error('Failed to parse SSE notification event:', err)
      }
    })

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err)
    }

    return () => {
      eventSource.close()
    }
  }, [accessToken, dispatch])
}

export default useSSESync
