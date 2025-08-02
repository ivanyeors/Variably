// src/components/JSONEditor/JSONEditor.tsx
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Code, Plus, Trash2, Copy, GripVertical, Edit3 } from "lucide-react"
import type { JSONEditorProps } from "@/types/json-editor"
import React from 'react'
import InlineEdit from '@atlaskit/inline-edit'
import Tree from '@atlaskit/tree'
import type { TreeData, TreeItem, ItemId } from '@atlaskit/tree'

// Utility function
function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

// Styled wrapper for official Atlassian TreeComponent
function StyledAtlassianTreeComponent({ data, onStructureChange }: { data: unknown; onStructureChange: (newData: unknown) => void }) {
  // Convert our JSON data to Atlassian tree format
  const convertToAtlassianTree = useCallback((jsonData: unknown): TreeData => {
    const items: Record<ItemId, TreeItem> = {}
    const rootId = 'root'
    
    // Helper function to recursively build tree items
    const buildTreeItems = (data: unknown, parentId: string, path: string[] = []): ItemId[] => {
      const children: ItemId[] = []
      
      if (typeof data === 'object' && data !== null) {
        if (Array.isArray(data)) {
          data.forEach((value, index) => {
            const id = `array-${parentId}-${index}`
            const currentPath = [...path, index.toString()]
            children.push(id)
            
            // Determine if this item has children
            const hasChildren = typeof value === 'object' && value !== null && 
              (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0)
            
            items[id] = {
              id,
              children: hasChildren ? buildTreeItems(value, id, currentPath) : [],
              data: { 
                title: `[${index}]`, 
                value, 
                type: Array.isArray(value) ? 'array' : typeof value === 'object' ? 'object' : typeof value,
                path: currentPath.join('.')
              },
              hasChildren,
              isExpanded: path.length < 2 // Auto-expand first few levels
            }
          })
        } else {
          Object.entries(data).forEach(([key, value]) => {
            const id = `object-${parentId}-${key}`
            const currentPath = [...path, key]
            children.push(id)
            
            // Determine if this item has children
            const hasChildren = typeof value === 'object' && value !== null && 
              (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0)
            
            items[id] = {
              id,
              children: hasChildren ? buildTreeItems(value, id, currentPath) : [],
              data: { 
                title: key, 
                value, 
                type: Array.isArray(value) ? 'array' : typeof value === 'object' ? 'object' : typeof value,
                path: currentPath.join('.')
              },
              hasChildren,
              isExpanded: path.length < 2 // Auto-expand first few levels
            }
          })
        }
      }
      
      return children
    }
    
    // Build the root item
    const rootChildren = buildTreeItems(jsonData, rootId)
    items[rootId] = {
      id: rootId,
      children: rootChildren,
      data: { title: 'root', type: 'root' },
      hasChildren: rootChildren.length > 0,
      isExpanded: true
    }
    
    return { rootId, items }
  }, [])

  // Convert Atlassian tree back to JSON
  const convertFromAtlassianTree = useCallback((treeData: TreeData): unknown => {
    const { rootId, items } = treeData
    const rootItem = items[rootId]
    
    if (!rootItem || rootItem.children.length === 0) return {}
    
    // Helper function to recursively convert tree items back to JSON
    const convertItemsToJson = (itemIds: ItemId[]): unknown => {
      if (itemIds.length === 0) return {}
      
      // Check if this should be an array (all items have numeric titles)
      const isArray = itemIds.every(itemId => {
        const item = items[itemId]
        return item && !isNaN(Number(item.data?.title?.replace(/[[\]]/g, '')))
      })
      
      if (isArray) {
        // Sort by index for arrays
        const sortedItems = itemIds
          .map(itemId => {
            const item = items[itemId]
            const index = parseInt(item.data?.title?.replace(/[[\]]/g, '') || '0')
            return { itemId, index, item }
          })
          .sort((a, b) => a.index - b.index)
        
        return sortedItems.map(({ item }) => {
          if (item.children.length > 0) {
            return convertItemsToJson(item.children)
          } else {
            return item.data?.value || {}
          }
        })
      } else {
        // Object structure
        const result: Record<string, unknown> = {}
        itemIds.forEach(itemId => {
          const item = items[itemId]
          if (item) {
            const key = item.data?.title || ''
            if (item.children.length > 0) {
              result[key] = convertItemsToJson(item.children)
            } else {
              result[key] = item.data?.value || {}
            }
          }
        })
        return result
      }
    }
    
    return convertItemsToJson(rootItem.children)
  }, [])

  // Initial tree state
  const initialTreeData = useMemo(() => {
    const treeData = convertToAtlassianTree(data)
    console.log('Tree data structure:', treeData)
    return treeData
  }, [data, convertToAtlassianTree])
  const [treeData, setTreeData] = useState<TreeData>(initialTreeData)
  
  // Convert tree back to JSON when state changes
  useEffect(() => {
    const newData = convertFromAtlassianTree(treeData)
    onStructureChange(newData)
  }, [treeData, convertFromAtlassianTree, onStructureChange])

  // Custom renderer for tree items to match your design
  const renderItem = useCallback(({ item, depth, onExpand, onCollapse, provided, snapshot }: {
    item: TreeItem;
    depth: number;
    onExpand: (itemId: ItemId) => void;
    onCollapse: (itemId: ItemId) => void;
    provided: {
      draggableProps: React.HTMLAttributes<HTMLDivElement> & { style?: React.CSSProperties };
      dragHandleProps: React.HTMLAttributes<HTMLDivElement> | null;
      innerRef: (element: HTMLElement | null) => void;
    };
    snapshot: { isDragging: boolean };
  }) => {
    const itemData = item.data || {}
    const title = itemData.title || 'Unknown'
    const itemType = itemData.type || 'value'
    const hasChildren = item.children.length > 0
    const isExpanded = item.isExpanded || false
    
    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        className={`group relative transition-all ${
          snapshot.isDragging ? 'opacity-50 scale-95 shadow-lg' : ''
        }`}
        style={{
          ...provided.draggableProps.style,
          position: 'relative',
          zIndex: snapshot.isDragging ? 1 : 'auto',
          transform: snapshot.isDragging ? 'scale(0.95)' : 'none',
          transition: 'all 0.2s ease-in-out',
          paddingLeft: `${depth * 20}px`
        }}
      >
        <div className="flex items-center gap-2 py-1 px-2 hover:bg-accent/50 transition-colors cursor-pointer">
          {/* Drag handle */}
          <div 
            {...provided.dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
          >
            <GripVertical className="h-3 w-3" />
          </div>
          
          {/* Expand/collapse button */}
          {hasChildren && (
            <button
              onClick={() => {
                if (isExpanded) {
                  onCollapse(item.id)
                } else {
                  onExpand(item.id)
                }
              }}
              className="p-1 hover:bg-accent/50 rounded transition-colors flex-shrink-0"
            >
              {isExpanded ? (
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          )}
          
          {/* Type badge */}
          <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
            {itemType}
          </Badge>
          
          {/* Title */}
          <div className="flex-1 min-w-0">
            <InlineEdit
              key={`title-${item.id}-${title}`}
              defaultValue={title}
              onConfirm={(newTitle) => {
                if (newTitle !== title && newTitle.trim() !== '') {
                  const updatedTreeData = updateItemTitle(treeData, item.id, newTitle.trim())
                  setTreeData(updatedTreeData)
                }
              }}
              validate={(value) => {
                if (!value || value.trim() === '') {
                  return 'Title cannot be empty'
                }
                return undefined
              }}
              readView={() => (
                <span className="font-medium text-sm hover:bg-accent/50 px-1 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 group/title">
                  {title}
                  <Edit3 className="h-3 w-3 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                </span>
              )}
              editView={(fieldProps, ref) => (
                <input
                  ref={ref}
                  type="text"
                  {...fieldProps}
                  className="font-medium text-sm bg-background border border-input rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  autoFocus
                />
              )}
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-accent/50"
              onClick={() => {
                // Handle duplicate logic here
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
              onClick={() => {
                const updatedTreeData = removeItem(treeData, item.id)
                setTreeData(updatedTreeData)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    )
  }, [treeData])

  // Helper function to update item title
  const updateItemTitle = (treeData: TreeData, itemId: ItemId, newTitle: string): TreeData => {
    const { rootId, items } = treeData
    const updatedItems = { ...items }
    
    if (updatedItems[itemId]) {
      updatedItems[itemId] = {
        ...updatedItems[itemId],
        data: {
          ...updatedItems[itemId].data,
          title: newTitle
        }
      }
    }
    
    return { rootId, items: updatedItems }
  }

  // Helper function to remove item
  const removeItem = (treeData: TreeData, itemId: ItemId): TreeData => {
    const { rootId, items } = treeData
    const updatedItems = { ...items }
    
    // Remove the item
    delete updatedItems[itemId]
    
    // Remove from parent's children
    Object.keys(updatedItems).forEach(parentId => {
      const parent = updatedItems[parentId]
      if (parent.children.includes(itemId)) {
        updatedItems[parentId] = {
          ...parent,
          children: parent.children.filter(id => id !== itemId)
        }
      }
    })
    
    return { rootId, items: updatedItems }
  }

  // Event handlers
  const handleExpand = useCallback((itemId: ItemId) => {
    const updatedItems = { ...treeData.items }
    if (updatedItems[itemId]) {
      updatedItems[itemId] = {
        ...updatedItems[itemId],
        isExpanded: true
      }
      setTreeData({ ...treeData, items: updatedItems })
    }
  }, [treeData])

  const handleCollapse = useCallback((itemId: ItemId) => {
    const updatedItems = { ...treeData.items }
    if (updatedItems[itemId]) {
      updatedItems[itemId] = {
        ...updatedItems[itemId],
        isExpanded: false
      }
      setTreeData({ ...treeData, items: updatedItems })
    }
  }, [treeData])

  const handleDragStart = useCallback((itemId: ItemId) => {
    console.log('Drag started for item:', itemId)
  }, [])

  const handleDragEnd = useCallback((sourcePosition: { parentId: ItemId; index: number }, destinationPosition?: { parentId: ItemId; index?: number }) => {
    console.log('Drag ended:', sourcePosition, destinationPosition)
    // Handle drag and drop logic here
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Tree structure editor with official Atlassian TreeComponent. {Object.keys(treeData.items).length - 1} items available.
          <br />
          <span className="text-xs">
            • Drag to reorder • Click to expand/collapse • Double-click to edit
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newId = generateId()
              const updatedItems = { ...treeData.items }
              updatedItems[newId] = {
                id: newId,
                children: [],
                data: { title: `new_item_${Date.now()}`, type: 'object' }
              }
              updatedItems[treeData.rootId] = {
                ...updatedItems[treeData.rootId],
                children: [...updatedItems[treeData.rootId].children, newId]
              }
              setTreeData({ ...treeData, items: updatedItems })
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
      
      <div className="relative bg-background border rounded-lg p-4 transition-colors" style={{ zIndex: 0 }}>
        <Tree
          tree={treeData}
          renderItem={renderItem}
          onExpand={handleExpand}
          onCollapse={handleCollapse}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          offsetPerLevel={20}
          isDragEnabled={true}
          isNestingEnabled={true}
        />
        
        {Object.keys(treeData.items).length <= 1 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p className="text-sm">No items in tree. Add a root node to get started.</p>
          </div>
        )}
      </div>
    </div>
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
          <StyledAtlassianTreeComponent
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