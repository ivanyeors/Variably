import { createContext, useContext } from 'react'

// Global drag state context
export const DragStateContext = createContext<{
  isDragging: boolean
  setIsDragging: (dragging: boolean) => void
}>({
  isDragging: false,
  setIsDragging: () => {}
})

export const useDragState = () => useContext(DragStateContext) 