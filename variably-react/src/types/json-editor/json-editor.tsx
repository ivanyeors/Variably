// src/components/JSONEditor/JSONEditor.tsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Code, Plus, Trash2, Copy, GripVertical, ChevronRight, ChevronDown, Edit3 } from "lucide-react"
import type { JSONEditorProps } from "@/types/json-editor"
import React from 'react'
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'

// Tree item interface
interface TreeItem {
  id: string
  key: string
  value: unknown
  type: string
  depth: number
  path: string
  parentId: string | null
  children: TreeItem[]
  isExpanded?: boolean
  canDrag: boolean
}

// Tree context for drag and drop
interface TreeContextValue {
  registerTreeItem: (itemId: string, element: HTMLElement) => () => void
  getPathToItem: (targetId: string) => TreeItem[]
  getMoveTargets: (itemId: string) => TreeItem[]
  getChildrenOfItem: (itemId: string) => TreeItem[]
  dispatch: (action: TreeAction) => void
  uniqueContextId: symbol
}

// Tree actions
type TreeAction = 
  | { type: 'instruction'; instruction: unknown; itemId: string; targetId: string }
  | { type: 'expand'; itemId: string }
  | { type: 'collapse'; itemId: string }
  | { type: 'update'; itemId: string; value: unknown }
  | { type: 'delete'; itemId: string }
  | { type: 'add'; parentId: string | null; item: TreeItem }

// Create tree context
const TreeContext = React.createContext<TreeContextValue | null>(null)

// Utility functions
function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

function getNodeType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  return typeof value
}

function canDragNode(node: { id: string; key: string; value: unknown; type: string; depth: number; path: string; parentId: string | null; children: TreeItem[] }): boolean {
  // Allow dragging all items except null values
  if (node.type === 'null') return false
  
  // Allow dragging all items including root level items
  return true
}

// Convert JSON to tree structure
function convertJSONToTree(data: unknown, parentId: string | null = null, path: string[] = [], depth: number = 0): TreeItem[] {
  const items: TreeItem[] = []
  
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      data.forEach((value, index) => {
        const key = index.toString()
        const currentPath = [...path, key]
        const id = generateId()
        const type = getNodeType(value)
        const canDrag = canDragNode({ id, key, value, type, depth, path: currentPath.join('.'), parentId, children: [] })
        
        const item: TreeItem = {
          id,
          key,
          value,
          type,
          depth,
          path: currentPath.join('.'),
          parentId,
          children: convertJSONToTree(value, id, currentPath, depth + 1),
          isExpanded: depth < 2, // Auto-expand first few levels
          canDrag
        }
        
        items.push(item)
      })
    } else {
      Object.entries(data).forEach(([key, value]) => {
        const currentPath = [...path, key]
        const id = generateId()
        const type = getNodeType(value)
        const canDrag = canDragNode({ id, key, value, type, depth, path: currentPath.join('.'), parentId, children: [] })
        
        const item: TreeItem = {
          id,
          key,
          value,
          type,
          depth,
          path: currentPath.join('.'),
          parentId,
          children: convertJSONToTree(value, id, currentPath, depth + 1),
          isExpanded: depth < 2, // Auto-expand first few levels
          canDrag
        }
        
        items.push(item)
      })
    }
  }
  
  return items
}

// Convert tree back to JSON
function convertTreeToJSON(items: TreeItem[]): unknown {
  const result: Record<string, unknown> = {}
  const arrayItems: Record<string, unknown> = {}
  let isArray = false
  
  // Check if this should be an array
  const keys = items.map(item => item.key)
  const numericKeys = keys.every(key => !isNaN(Number(key)) && Number(key) >= 0)
  if (numericKeys) {
    isArray = true
  }
  
  items.forEach(item => {
    const value = item.children.length > 0 ? convertTreeToJSON(item.children) : item.value
    if (isArray) {
      arrayItems[item.key] = value
    } else {
      result[item.key] = value
    }
  })
  
  if (isArray) {
    const array = []
    for (let i = 0; i < Object.keys(arrayItems).length; i++) {
      array.push(arrayItems[i.toString()])
    }
    return array
  }
  
  return result
}

// Helper function to add item to children recursively
function addItemToChildren(children: TreeItem[], parentId: string, item: TreeItem): TreeItem[] {
  return children.map(child => {
    if (child.id === parentId) {
      return {
        ...child,
        children: [...child.children, item]
      }
    }
    return {
      ...child,
      children: addItemToChildren(child.children, parentId, item)
    }
  })
}

// Tree item component
function TreeItemComponent({ item, level }: { item: TreeItem; level: number }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isOver, setIsOver] = useState(false)
  const [canDropHere, setCanDropHere] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)
  const context = React.useContext(TreeContext)
  
  const { registerTreeItem, dispatch } = context || { 
    registerTreeItem: () => () => {}, 
    dispatch: () => {}
  }
  
  // canDrop function to determine if an item can be dropped on this target
  const canDrop = (targetId: string, sourceId: string, context: TreeContextValue): boolean => {
    // Don't allow dropping on itself
    if (targetId === sourceId) return false
    
    // Don't allow dropping on null values
    if (item.type === 'null') return false
    
    // Don't allow dropping on primitive values (strings, numbers, booleans)
    if (item.type === 'string' || item.type === 'number' || item.type === 'boolean') return false
    
    // Only allow dropping on objects and arrays
    if (item.type !== 'object' && item.type !== 'array') return false
    
    // Check if the source item is a valid move target for this item
    const moveTargets = context.getMoveTargets(sourceId)
    const isValidTarget = moveTargets.some(target => target.id === targetId)
    
    // Additional validation: prevent circular references
    if (isValidTarget) {
      // Check if dropping would create a circular reference
      const pathToSource = context.getPathToItem(sourceId)
      
      // If source is in the path to target, it would create a circular reference
      if (pathToSource.some(pathItem => pathItem.id === targetId)) {
        return false
      }
    }
    
    return isValidTarget
  }
  
  useEffect(() => {
    if (elementRef.current && context) {
      return registerTreeItem(item.id, elementRef.current)
    }
  }, [item.id, context, registerTreeItem])
  
  // Pragmatic Drag & Drop setup
  useEffect(() => {
    if (!elementRef.current || !item.canDrag) return

    const cleanup = draggable({
      element: elementRef.current,
      dragHandle: elementRef.current.querySelector('[data-drag-handle]') as HTMLElement,
      getInitialData: () => ({
        id: item.id,
        type: 'tree-item',
        uniqueContextId: context?.uniqueContextId
      }),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        // Create custom drag preview
        const preview = document.createElement('div')
        preview.className = 'bg-background border rounded-lg shadow-lg p-2 text-sm'
        preview.innerHTML = `
          <div class="flex items-center gap-2">
            <div class="text-muted-foreground">${item.key}</div>
            <div class="text-xs bg-muted px-1 rounded">${item.type}</div>
          </div>
        `
        document.body.appendChild(preview)
        if (nativeSetDragImage) {
          nativeSetDragImage(preview, 0, 0)
        }
        
        return () => {
          document.body.removeChild(preview)
        }
      },
      onDragStart: () => {
        setIsDragging(true)
      },
      onDrop: () => {
        setIsDragging(false)
      }
    })

    return cleanup
  }, [item.id, item.canDrag, item.key, item.type, context?.uniqueContextId])

  // Drop target setup
  useEffect(() => {
    if (!elementRef.current) return

    const cleanup = dropTargetForElements({
      element: elementRef.current,
      canDrop: ({ source }) => {
        if (!context) return false
        const data = source.data as { id: string; uniqueContextId: symbol }
        if (data.uniqueContextId !== context.uniqueContextId) return false
        return canDrop(item.id, data.id, context)
      },
      onDragEnter: () => {
        setIsOver(true)
        setCanDropHere(true)
      },
      onDragLeave: () => {
        setIsOver(false)
        setCanDropHere(false)
      },
      onDrop: ({ source }) => {
        if (!context) return
        const data = source.data as { id: string; uniqueContextId: symbol }
        if (data.uniqueContextId !== context.uniqueContextId) return
        
        if (canDrop(item.id, data.id, context)) {
          dispatch({
            type: 'instruction',
            instruction: { type: 'reparent', targetId: item.id },
            itemId: data.id,
            targetId: item.id
          })
        }
        
        setIsOver(false)
        setCanDropHere(false)
      }
    })

    return cleanup
  }, [item.id, context, dispatch])

  const toggleExpanded = () => {
    if (item.children.length > 0) {
      dispatch({
        type: item.isExpanded ? 'collapse' : 'expand',
        itemId: item.id
      })
    }
  }
  

  
  const handleDelete = () => {
    dispatch({
      type: 'delete',
      itemId: item.id
    })
  }
  
  const renderValue = () => {
    if (item.type === 'object' || item.type === 'array') {
      return (
        <span className="text-blue-500 hover:bg-accent/50 px-1 py-0.5 rounded cursor-pointer transition-colors">
          {item.type === 'array' ? '[Array]' : '[Object]'}
        </span>
      )
    }
    
    return (
      <span className="hover:bg-accent/50 px-1 py-0.5 rounded cursor-pointer transition-colors">
        {item.value === null ? 'null' : String(item.value)}
      </span>
    )
  }
  
  return (
    <div
      ref={elementRef}
      data-item-id={item.id}
      className={`group relative border-l-2 transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${isOver && canDropHere ? 'border-l-primary bg-accent/20' : 'border-l-transparent'} ${
        isOver && !canDropHere ? 'border-l-destructive bg-destructive/10' : ''
      }`}
    >
      <div className={`flex items-center gap-2 py-1 px-2 hover:bg-accent/50 transition-colors ${
        !item.canDrag ? 'opacity-60' : ''
      }`}>
        {/* Drag handle */}
        {item.canDrag && (
          <div 
            data-drag-handle
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
          >
            <GripVertical className="h-3 w-3" />
          </div>
        )}
        
        {/* Indentation */}
        <div style={{ width: `${level * 20}px` }} />
        
        {/* Expand/collapse button */}
        {item.children.length > 0 && (
          <button
            onClick={toggleExpanded}
            className="p-1 hover:bg-accent/50 rounded transition-colors"
          >
            {item.isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
        
        {/* Key */}
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">
            {item.key}
          </span>
        </div>
        
        {/* Type badge */}
        <Badge variant="outline" className="text-xs capitalize">
          {item.type}
        </Badge>
        
        {/* Draggable badge */}
        {item.canDrag && (
          <Badge variant="secondary" className="text-xs">
            Draggable
          </Badge>
        )}
        
        {/* Drop target indicator */}
        {isOver && (
          <Badge 
            variant={canDropHere ? "default" : "destructive"} 
            className="text-xs"
          >
            {canDropHere ? "Drop Here" : "Cannot Drop"}
          </Badge>
        )}
        
        {/* Value */}
        <div className="flex-1 min-w-0 text-sm text-muted-foreground">
          {renderValue()}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-accent/50"
            onClick={() => {
              // Handle duplicate logic here
              console.log('Duplicate:', item.id)
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Children */}
      {item.isExpanded && item.children.length > 0 && (
        <div className="ml-4">
          {item.children.map((child) => (
            <TreeItemComponent
              key={child.id}
              item={child}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Tree component
function TreeComponent({ data, onStructureChange }: { data: unknown; onStructureChange: (newData: unknown) => void }) {
  const uniqueContextId = useMemo(() => Symbol('unique-id'), [])
  
  // Store the latest onStructureChange callback in a ref to avoid dependency issues
  const onStructureChangeRef = useRef(onStructureChange)
  onStructureChangeRef.current = onStructureChange
  
  // Convert data to tree on mount and when data changes
  const initialTreeItems = useMemo(() => convertJSONToTree(data), [data])
  
  // Convert tree back to JSON when tree changes
  const treeStateReducer = (state: TreeItem[], action: TreeAction): TreeItem[] => {
    switch (action.type) {
      case 'expand':
        return state.map(item => 
          item.id === action.itemId 
            ? { ...item, isExpanded: true }
            : item
        )
      
      case 'collapse':
        return state.map(item => 
          item.id === action.itemId 
            ? { ...item, isExpanded: false }
            : item
        )
      
      case 'update':
        return state.map(item => 
          item.id === action.itemId 
            ? { ...item, value: action.value }
            : item
        )
      
      case 'delete':
        return state.filter(item => item.id !== action.itemId)
      
      case 'add':
        if (action.parentId === null) {
          return [...state, action.item]
        } else {
          return state.map(item => {
            if (item.id === action.parentId) {
              return {
                ...item,
                children: [...item.children, action.item]
              }
            }
            return {
              ...item,
              children: addItemToChildren(item.children, action.parentId!, action.item)
            }
          })
        }
      
      case 'instruction': {
        // Handle drag and drop instructions
        const instruction = action.instruction as { type: string }
        if (instruction.type === 'reparent') {
          // Find the item to move
          const findAndRemoveItem = (items: TreeItem[]): [TreeItem | null, TreeItem[]] => {
            for (let i = 0; i < items.length; i++) {
              if (items[i].id === action.itemId) {
                const [removed] = items.splice(i, 1)
                return [removed, items]
              }
              const [found, updatedChildren] = findAndRemoveItem(items[i].children)
              if (found) {
                items[i].children = updatedChildren
                return [found, items]
              }
            }
            return [null, items]
          }
          
          const [movedItem, updatedItems] = findAndRemoveItem([...state])
          
          if (movedItem) {
            // Find target and add as child
            const addAsChild = (items: TreeItem[]): TreeItem[] => {
              return items.map(item => {
                if (item.id === action.targetId) {
                  return {
                    ...item,
                    children: [...item.children, { ...movedItem, parentId: item.id }]
                  }
                }
                return {
                  ...item,
                  children: addAsChild(item.children)
                }
              })
            }
            
            return addAsChild(updatedItems)
          }
        }
        return state
      }
      
      default:
        return state
    }
  }
  
  const [state, dispatch] = React.useReducer(treeStateReducer, initialTreeItems)
  
  // Convert tree back to JSON when state changes
  useEffect(() => {
    const newData = convertTreeToJSON(state)
    onStructureChangeRef.current(newData)
  }, [state])
  
  // Helper function to find item by ID
  const findItemById = useCallback((items: TreeItem[], targetId: string): TreeItem | null => {
    for (const item of items) {
      if (item.id === targetId) return item
      const found = findItemById(item.children, targetId)
      if (found) return found
    }
    return null
  }, [])
  
  // Helper function to get path to item
  const getPathToItemHelper = useCallback((items: TreeItem[], targetId: string, currentPath: TreeItem[] = []): TreeItem[] => {
    for (const item of items) {
      const newPath = [...currentPath, item]
      if (item.id === targetId) return newPath
      const found = getPathToItemHelper(item.children, targetId, newPath)
      if (found.length > 0) return found
    }
    return []
  }, [])
  
  // Helper function to get all items as flat array
  const getAllItems = useCallback((items: TreeItem[]): TreeItem[] => {
    const result: TreeItem[] = []
    for (const item of items) {
      result.push(item)
      result.push(...getAllItems(item.children))
    }
    return result
  }, [])
  
  // Stable registerTreeItem function
  const registerTreeItem = useCallback((itemId: string, element: HTMLElement) => {
    // Store element reference for drag and drop operations
    console.log(`Registered tree item: ${itemId}`, element)
    return () => {
      // Cleanup logic
      console.log(`Unregistered tree item: ${itemId}`)
    }
  }, [])
  
  // Store current state in ref to avoid dependency issues
  const stateRef = useRef(state)
  stateRef.current = state
  
  const contextValue: TreeContextValue = useMemo(() => ({
    registerTreeItem,
    getPathToItem: (targetId: string) => {
      // Get the path from root to the target item
      return getPathToItemHelper(stateRef.current, targetId)
    },
    getMoveTargets: (itemId: string) => {
      // Get all valid drop targets for the given item
      // Exclude the item itself and its descendants
      const allItems = getAllItems(stateRef.current)
      const item = findItemById(stateRef.current, itemId)
      if (!item) return []
      
      // Get all descendants of the item
      const getDescendants = (items: TreeItem[]): TreeItem[] => {
        const descendants: TreeItem[] = []
        for (const child of items) {
          descendants.push(child)
          descendants.push(...getDescendants(child.children))
        }
        return descendants
      }
      
      const descendants = getDescendants(item.children)
      const descendantIds = new Set(descendants.map(d => d.id))
      descendantIds.add(itemId)
      
      return allItems.filter(item => !descendantIds.has(item.id))
    },
    getChildrenOfItem: (itemId: string) => {
      // Get children of the specified item
      const item = findItemById(stateRef.current, itemId)
      return item ? item.children : []
    },
    dispatch,
    uniqueContextId
  }), [dispatch, uniqueContextId, registerTreeItem, findItemById, getAllItems, getPathToItemHelper])
  
  return (
    <TreeContext.Provider value={contextValue}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Tree structure editor with Pragmatic Drag & Drop. {state.filter(item => item.canDrag).length} of {state.length} items are draggable.
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newItem: TreeItem = {
                  id: generateId(),
                  key: `new_item_${Date.now()}`,
                  value: {},
                  type: 'object',
                  depth: 0,
                  path: `new_item_${Date.now()}`,
                  parentId: null,
                  children: [],
                  isExpanded: true,
                  canDrag: true
                }
                dispatch({
                  type: 'add',
                  parentId: null,
                  item: newItem
                })
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Root Node
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const formatted = JSON.stringify(data, null, 2)
                navigator.clipboard.writeText(formatted)
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy JSON
            </Button>
          </div>
        </div>
        
        <div className="relative bg-background border rounded-lg p-4 transition-colors">
          {state.map((item) => (
            <TreeItemComponent
              key={item.id}
              item={item}
              level={0}
            />
          ))}
          
          {state.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm">No items in tree. Add a root node to get started.</p>
            </div>
          )}
        </div>
      </div>
    </TreeContext.Provider>
  )
}

export function JSONEditor({ file, onContentChange }: JSONEditorProps) {
  const [isValid, setIsValid] = useState(true)

  useEffect(() => {
    try {
      JSON.stringify(file.content)
      setIsValid(true)
    } catch {
      setIsValid(false)
    }
  }, [file.content])

  // Memoize the onStructureChange callback to prevent unnecessary re-renders
  const handleStructureChange = useCallback((newData: unknown) => {
    onContentChange(file.id, newData)
  }, [file.id, onContentChange])

  const getFileSize = () => {
    const size = JSON.stringify(file.content).length
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm sm:text-base">
          <div className="flex items-center gap-2 min-w-0">
            <Code className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{file.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {file.isModified && (
              <Badge variant="destructive" className="text-xs">
                Modified
              </Badge>
            )}
            <Badge variant={isValid ? "default" : "destructive"} className="text-xs">
              {isValid ? (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Valid
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Invalid
                </div>
              )}
            </Badge>
          </div>
        </CardTitle>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Size: {getFileSize()}</span>
          <span>Last modified: {new Date().toLocaleTimeString()}</span>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isValid ? (
          <TreeComponent
            data={file.content}
            onStructureChange={handleStructureChange}
          />
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p className="text-sm">Cannot edit structure of invalid JSON</p>
              <p className="text-xs text-muted-foreground">Fix the JSON format first</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}