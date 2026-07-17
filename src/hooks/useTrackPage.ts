import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { addRecentPage } from '@/store/slices/appSlice'

export function useTrackPage() {
  const location = useLocation()
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(addRecentPage(location.pathname))
  }, [location.pathname, dispatch])
}
