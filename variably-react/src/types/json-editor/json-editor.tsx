// src/components/JSONEditor/JSONEditor.tsx
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Code, Plus, Trash2, Copy, GripVertical } from "lucide-react"
import type { JSONEditorProps } from "@/types/json-editor"
import DynamicTable from '@atlaskit/dynamic-table'
import InlineEdit from '@atlaskit/inline-edit'

// Drag configuration types
interface DragConfig {
  allowedTypes?: string[]
  allowedDepths?: number[] | { min: number; max: number }
  allowedKeyPatterns?: RegExp[]
  parentContextRules?: {
    parentType?: string
    parentKeyPatterns?: RegExp[]
  }
  customValidation?: (node: any, path: string, depth: number, parentNode?: any) => boolean
}

// Default drag configuration - allow dragging most items except root level
const defaultDragConfig: DragConfig = {
  allowedTypes: ['object', 'array', 'string', 'number', 'boolean'],
  allowedDepths: { min: 1, max: 10 }, // Don't allow dragging root level items
  allowedKeyPatterns: [/.*/], // Allow all key patterns by default
  parentContextRules: {
    parentType: 'object', // Only allow dragging from object parents
  },
  customValidation: (node: any, path: string, depth: number, parentNode?: any) => {
    // Custom validation: don't allow dragging if parent is an array and this is a primitive
    if (Array.isArray(parentNode) && typeof node !== 'object') {
      return false
    }
    return true
  }
}

// Utility function to check if a node can be dragged
function canDragNode(
  node: any, 
  path: string, 
  depth: number, 
  parentNode: any, 
  config: DragConfig = defaultDragConfig
): boolean {
  const nodeType = Array.isArray(node) ? 'array' : typeof node
  
  // Check allowed types
  if (config.allowedTypes && !config.allowedTypes.includes(nodeType)) {
    return false
  }
  
  // Check allowed depths
  if (config.allowedDepths) {
    if (Array.isArray(config.allowedDepths)) {
      if (!config.allowedDepths.includes(depth)) {
        return false
      }
    } else {
      if (depth < config.allowedDepths.min || depth > config.allowedDepths.max) {
        return false
      }
    }
  }
  
  // Check key patterns
  if (config.allowedKeyPatterns) {
    const key = path.split('.').pop() || ''
    const matchesPattern = config.allowedKeyPatterns.some(pattern => pattern.test(key))
    if (!matchesPattern) {
      return false
    }
  }
  
  // Check parent context rules
  if (config.parentContextRules) {
    const parentType = Array.isArray(parentNode) ? 'array' : typeof parentNode
    if (config.parentContextRules.parentType && parentType !== config.parentContextRules.parentType) {
      return false
    }
    
    if (config.parentContextRules.parentKeyPatterns) {
      const parentKey = path.split('.').slice(-2, -1)[0] || ''
      const matchesParentPattern = config.parentContextRules.parentKeyPatterns.some(pattern => pattern.test(parentKey))
      if (!matchesParentPattern) {
        return false
      }
    }
  }
  
  // Run custom validation
  if (config.customValidation) {
    if (!config.customValidation(node, path, depth, parentNode)) {
      return false
    }
  }
  
  return true
}


interface VisualJSONEditorProps {
  data: Record<string, unknown> | unknown[]
  onStructureChange: (newData: Record<string, unknown> | unknown[]) => void
}

// Convert JSON data to table format
function convertJSONToTableData(data: Record<string, unknown> | unknown[]) {
  const tableData: Array<{
    key: string
    path: string
    value: unknown
    type: string
    depth: number
    parentNode?: unknown
    canDrag: boolean
  }> = []

  function traverse(obj: unknown, path: string[] = [], depth: number = 0, parentNode?: unknown) {
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          const currentPath = [...path, index.toString()]
          const canDrag = canDragNode(item, currentPath.join('.'), depth, parentNode)
          tableData.push({
            key: index.toString(),
            path: currentPath.join('.'),
            value: item,
            type: Array.isArray(item) ? 'array' : typeof item,
            depth,
            parentNode,
            canDrag
          })
          traverse(item, currentPath, depth + 1, obj)
        })
      } else {
        Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
          const currentPath = [...path, key]
          const canDrag = canDragNode(value, currentPath.join('.'), depth, parentNode)
          tableData.push({
            key,
            path: currentPath.join('.'),
            value,
            type: Array.isArray(value) ? 'array' : typeof value,
            depth,
            parentNode,
            canDrag
          })
          traverse(value, currentPath, depth + 1, obj)
        })
      }
    }
  }

  traverse(data)
  return tableData
}

// Export the VisualJSONEditor component
export function VisualJSONEditor({ data, onStructureChange }: VisualJSONEditorProps) {
  const [jsonData, setJsonData] = useState(data)
  const [tableData, setTableData] = useState(convertJSONToTableData(data))
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  useEffect(() => {
    setJsonData(data)
    setTableData(convertJSONToTableData(data))
  }, [data])

  // Handle drag start
  const handleDragStart = useCallback((path: string) => {
    setDraggedItem(path)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedItem(null)
  }, [])

  // Handle drop/reorder
  const handleReorder = useCallback((sourcePath: string, targetPath: string) => {
    // Implementation for reordering JSON structure
    console.log('Reordering:', sourcePath, 'to', targetPath)
    // This would require complex JSON manipulation logic
    // For now, we'll just log the operation
  }, [])

  // Create table headers
  const tableHead = {
    cells: [
      {
        key: 'key',
        content: 'Key',
        width: 20,
      },
      {
        key: 'type',
        content: 'Type',
        width: 15,
      },
      {
        key: 'value',
        content: 'Value',
        width: 45,
      },
      {
        key: 'actions',
        content: 'Actions',
        width: 20,
      },
    ],
  }

  // Handle multi-edit for key - renames all instances of the same key
  const handleKeyEdit = useCallback((path: string, newKey: string) => {
    const newData = JSON.parse(JSON.stringify(jsonData))
    const pathArray = path.split('.')
    const oldKey = pathArray[pathArray.length - 1]
    
    // Find all paths that contain the same key name
    const allPaths = tableData
      .filter(item => item.key === oldKey)
      .map(item => item.path)
    
    // Update all instances of this key
    allPaths.forEach(currentPath => {
      const currentPathArray = currentPath.split('.')
      let current = newData
      
      // Navigate to the parent object
      for (let i = 0; i < currentPathArray.length - 1; i++) {
        current = current[currentPathArray[i]]
      }
      
      const currentOldKey = currentPathArray[currentPathArray.length - 1]
      const value = current[currentOldKey]
      
      if (Array.isArray(current)) {
        // For arrays, we can't change the key (index)
        console.log('Cannot rename array index')
      } else {
        delete current[currentOldKey]
        current[newKey] = value
      }
    })
    
    setJsonData(newData)
    onStructureChange(newData)
  }, [jsonData, onStructureChange, tableData])

  // Handle inline edit for value - improved to handle all types
  const handleValueEdit = useCallback((path: string, newValue: string) => {
    const newData = JSON.parse(JSON.stringify(jsonData))
    const pathArray = path.split('.')
    let current = newData
    
    for (let i = 0; i < pathArray.length - 1; i++) {
      current = current[pathArray[i]]
    }
    
    const key = pathArray[pathArray.length - 1]
    
    // Try to parse the value based on the original type
    let parsedValue: unknown = newValue
    const originalValue = current[key]
    
    if (typeof originalValue === 'number') {
      const numValue = Number(newValue)
      if (isNaN(numValue)) {
        // If parsing fails, keep as string
        parsedValue = newValue
      } else {
        parsedValue = numValue
      }
    } else if (typeof originalValue === 'boolean') {
      parsedValue = newValue === 'true'
    } else if (originalValue === null) {
      // Handle null values
      if (newValue === 'null') {
        parsedValue = null
      } else {
        parsedValue = newValue
      }
    } else if (typeof originalValue === 'object') {
      // For objects and arrays, try to parse as JSON
      try {
        parsedValue = JSON.parse(newValue)
      } catch {
        // If parsing fails, keep as string
        parsedValue = newValue
      }
    }
    // Keep as string for other types
    
    current[key] = parsedValue
    setJsonData(newData)
    onStructureChange(newData)
  }, [jsonData, onStructureChange])

  // Create table rows
  const tableRows = tableData.map((item) => ({
    key: item.path,
    cells: [
      {
        key: 'key',
        content: (
          <div style={{ paddingLeft: `${item.depth * 20}px` }} className="flex items-center gap-2">
            {item.canDrag && (
              <div
                className="cursor-grab hover:text-foreground transition-colors p-1"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', item.path)
                  handleDragStart(item.path)
                }}
                onDragEnd={handleDragEnd}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <InlineEdit
              defaultValue={item.key}
              onConfirm={(newKey) => handleKeyEdit(item.path, newKey)}
              readView={() => (
                <span 
                  className={`hover:bg-accent/50 px-1 py-0.5 rounded transition-colors ${
                    item.canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                  } ${!item.canDrag ? 'opacity-60' : ''}`}
                  draggable={item.canDrag}
                  onDragStart={(e) => {
                    if (item.canDrag) {
                      e.dataTransfer.setData('text/plain', item.path)
                      handleDragStart(item.path)
                    }
                  }}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => {
                    e.preventDefault()
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const sourcePath = e.dataTransfer.getData('text/plain')
                    if (sourcePath && sourcePath !== item.path) {
                      handleReorder(sourcePath, item.path)
                    }
                  }}
                >
                  {item.key}
                </span>
              )}
              editView={(fieldProps) => (
                <input
                  {...fieldProps}
                  className="w-full px-2 py-1 text-sm border rounded bg-background text-foreground"
                />
              )}
              readViewFitContainerWidth
            />
          </div>
        ),
      },
      {
        key: 'type',
        content: (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs capitalize">
              {item.type}
            </Badge>
            {item.canDrag && (
              <Badge variant="secondary" className="text-xs">
                Draggable
              </Badge>
            )}
          </div>
        ),
      },
      {
        key: 'value',
        content: (
          <div className="text-sm text-muted-foreground truncate">
            {typeof item.value === 'object' && item.value !== null ? (
              <InlineEdit
                defaultValue={JSON.stringify(item.value)}
                onConfirm={(newValue) => handleValueEdit(item.path, newValue)}
                readView={() => (
                  <span className="hover:bg-accent/50 px-1 py-0.5 rounded cursor-pointer transition-colors text-blue-500">
                    {Array.isArray(item.value) ? '[Array]' : '[Object]'}
                  </span>
                )}
                editView={(fieldProps) => (
                  <input
                    {...fieldProps}
                    className="w-full px-2 py-1 text-sm border rounded bg-background text-foreground"
                  />
                )}
                readViewFitContainerWidth
              />
            ) : (
              <InlineEdit
                defaultValue={item.value === null ? 'null' : String(item.value)}
                onConfirm={(newValue) => handleValueEdit(item.path, newValue)}
                readView={() => (
                  <span className="hover:bg-accent/50 px-1 py-0.5 rounded cursor-pointer transition-colors">
                    {item.value === null ? 'null' : String(item.value)}
                  </span>
                )}
                editView={(fieldProps) => (
                  <input
                    {...fieldProps}
                    className="w-full px-2 py-1 text-sm border rounded bg-background text-foreground"
                  />
                )}
                readViewFitContainerWidth
              />
            )}
          </div>
        ),
      },
      {
        key: 'actions',
        content: (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-accent/50"
              onClick={() => {
                // Handle duplicate logic here
                console.log('Duplicate:', item.path)
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
              onClick={() => {
                // Handle delete logic here
                console.log('Delete:', item.path)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ),
      },
    ],
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          JSON structure editor with conditional dragging. {tableData.filter(item => item.canDrag).length} of {tableData.length} items are draggable.
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newData = JSON.parse(JSON.stringify(jsonData))
              const timestamp = Date.now()
              if (Array.isArray(newData)) {
                newData.push({})
              } else {
                newData[`new_item_${timestamp}`] = {}
              }
              setJsonData(newData)
              onStructureChange(newData)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Root Node
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const formatted = JSON.stringify(jsonData, null, 2)
              navigator.clipboard.writeText(formatted)
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy JSON
          </Button>
        </div>
      </div>
      
      <div className="relative bg-background border rounded-lg p-4 [&_.ak-dynamic-table]:bg-transparent [&_.ak-dynamic-table__head]:bg-muted [&_.ak-dynamic-table__head]:border-b [&_.ak-dynamic-table__head]:border-border [&_.ak-dynamic-table__head-cell]:text-foreground [&_.ak-dynamic-table__head-cell]:font-medium [&_.ak-dynamic-table__row]:border-b [&_.ak-dynamic-table__row]:border-border [&_.ak-dynamic-table__row:hover]:bg-accent [&_.ak-dynamic-table__cell]:text-foreground [&_.ak-dynamic-table__cell]:bg-transparent [&_.ak-inline-edit__read-view]:bg-transparent [&_.ak-inline-edit__edit-view]:bg-background [&_.ak-inline-edit__edit-view]:border [&_.ak-inline-edit__edit-view]:border-border [&_.ak-inline-edit__edit-view]:rounded">
        <style dangerouslySetInnerHTML={{
          __html: `
            .ak-dynamic-table__row {
              --ds-background-neutral-subtle-hovered: hsl(var(--accent)) !important;
              --ds-background-neutral-subtle-pressed: hsl(var(--accent)) !important;
              --ds-background-selected: hsl(var(--primary)) !important;
              --ds-background-selected-hovered: hsl(var(--primary)) !important;
              --ds-border-focused: hsl(var(--ring)) !important;
              --ds-border: hsl(var(--border)) !important;
              --local-dynamic-table-hover-bg: hsl(var(--accent)) !important;
              --local-dynamic-table-highlighted-bg: hsl(var(--primary)) !important;
              --local-dynamic-table-hover-highlighted-bg: hsl(var(--primary)) !important;
              --local-dynamic-table-row-focus-outline: hsl(var(--ring)) !important;
            }
            .ak-dynamic-table__row:hover {
              background-color: hsl(var(--accent)) !important;
            }
            .ak-dynamic-table__row:hover td {
              background-color: hsl(var(--accent)) !important;
            }
            [style*="--local-dynamic-table-hover-bg"] {
              --local-dynamic-table-hover-bg: hsl(var(--accent)) !important;
            }
            [style*="--local-dynamic-table-highlighted-bg"] {
              --local-dynamic-table-highlighted-bg: hsl(var(--primary)) !important;
            }
            [style*="--local-dynamic-table-hover-highlighted-bg"] {
              --local-dynamic-table-hover-highlighted-bg: hsl(var(--primary)) !important;
            }
            [style*="--local-dynamic-table-row-focus-outline"] {
              --local-dynamic-table-row-focus-outline: hsl(var(--ring)) !important;
            }
            [style*="--ds-background-neutral-subtle-hovered"] {
              --ds-background-neutral-subtle-hovered: hsl(var(--accent)) !important;
            }
            [style*="--ds-background-selected"] {
              --ds-background-selected: hsl(var(--primary)) !important;
            }
            [style*="--ds-background-selected-hovered"] {
              --ds-background-selected-hovered: hsl(var(--primary)) !important;
            }
            [style*="--ds-border-focused"] {
              --ds-border-focused: hsl(var(--ring)) !important;
            }
            [style*="--ds-border"] {
              --ds-border: hsl(var(--border)) !important;
            }
          `
        }} />
        <DynamicTable
          head={tableHead}
          rows={tableRows}
          isFixedSize
        />
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
          <VisualJSONEditor
            data={file.content}
            onStructureChange={(newData) => {
              onContentChange(file.id, newData)
            }}
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