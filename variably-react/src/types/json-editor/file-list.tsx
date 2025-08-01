// src/components/JSONEditor/FileList.tsx
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, FileJson, AlertCircle, FolderTree, ChevronRight, ChevronDown, Folder, FileText, Upload } from "lucide-react"
import type { FileListProps } from "@/types/json-editor"
import { useState } from "react"
import type { RefObject } from "react"

// Extended FileListProps to include drag and drop functionality
interface ExtendedFileListProps extends FileListProps {
  onDrop?: (e: React.DragEvent) => Promise<void>
  isDragOver?: boolean
  setIsDragOver?: (isDragOver: boolean) => void
  fileInputRef?: RefObject<HTMLInputElement>
}

// JSON Tree Node Component
interface TreeNodeProps {
  data: unknown
  name: string
  level: number
  path: string
}

function TreeNode({ data, name, level, path }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2) // Auto-expand first 2 levels
  const isObject = typeof data === 'object' && data !== null && !Array.isArray(data)
  const isArray = Array.isArray(data)
  const isPrimitive = !isObject && !isArray
  
  const hasChildren = isObject ? Object.keys(data as Record<string, unknown>).length > 0 : isArray ? (data as unknown[]).length > 0 : false
  
  const getValuePreview = () => {
    if (isPrimitive) {
      if (typeof data === 'string') {
        return `"${data.length > 20 ? data.substring(0, 20) + '...' : data}"`
      }
      return String(data)
    }
    if (isArray) {
      return `[${(data as unknown[]).length} items]`
    }
    if (isObject) {
      return `{${Object.keys(data as Record<string, unknown>).length} keys}`
    }
    return ''
  }

  const getIcon = () => {
    if (isArray) return <FolderTree className="h-3 w-3 text-blue-500" />
    if (isObject) return <Folder className="h-3 w-3 text-orange-500" />
    return <FileText className="h-3 w-3 text-gray-500" />
  }

  return (
    <div className="select-none">
      <div 
        className={`
          flex items-center gap-1 px-2 py-1 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer
          ${level === 0 ? 'font-medium' : ''}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          )
        ) : (
          <div className="w-3 h-3 flex-shrink-0" />
        )}
        
        {getIcon()}
        
        <span className="text-sm font-mono">
          {name}
          {isPrimitive && (
            <span className="text-muted-foreground ml-2">
              {getValuePreview()}
            </span>
          )}
        </span>
        
        {!isPrimitive && (
          <span className="text-xs text-muted-foreground ml-auto">
            {getValuePreview()}
          </span>
        )}
      </div>
      
      {isExpanded && hasChildren && (
        <div>
          {isArray ? (
            (data as unknown[]).map((item: unknown, index: number) => (
              <TreeNode
                key={`${path}[${index}]`}
                data={item}
                name={`[${index}]`}
                level={level + 1}
                path={`${path}[${index}]`}
              />
            ))
          ) : isObject ? (
            Object.entries(data as Record<string, unknown>).map(([key, value]) => (
              <TreeNode
                key={`${path}.${key}`}
                data={value}
                name={key}
                level={level + 1}
                path={`${path}.${key}`}
              />
            ))
          ) : null}
        </div>
      )}
    </div>
  )
}

// JSON Tree View Component
interface JSONTreeViewProps {
  data: unknown
  fileName: string
}

function JSONTreeView({ data, fileName }: JSONTreeViewProps) {
  if (!data || typeof data !== 'object') {
    return (
      <div className="p-4 text-center">
        <FileJson className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Invalid JSON structure</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs text-muted-foreground px-2 py-1 border-b flex-shrink-0">
        {fileName} structure
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        <TreeNode
          data={data}
          name="root"
          level={0}
          path=""
        />
      </div>
    </div>
  )
}

export function FileList({ 
  files, 
  onFileSelect, 
  onFileRemove, 
  selectedFileId,
  onDrop,
  isDragOver,
  setIsDragOver
}: ExtendedFileListProps) {
  const selectedFile = files.find(f => f.id === selectedFileId)
  
  if (files.length === 0) {
    return (
      <div className="p-4 text-center">
        <FileJson className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No files loaded</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Drop JSON files to get started</p>
      </div>
    )
  }

  return (
    <Tabs defaultValue="files" className="w-full h-full flex flex-col">
      <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
        <TabsTrigger value="files" className="flex items-center gap-2">
          <FileJson className="h-3 w-3" />
          Files
        </TabsTrigger>
        <TabsTrigger value="structure" className="flex items-center gap-2">
          <FolderTree className="h-3 w-3" />
          Structure
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="files" className="mt-4 flex-1 min-h-0">
        <div className="space-y-2 h-full overflow-y-auto">
          {/* Drop Zone - Positioned under tabs but above file list */}
          {onDrop && (
            <div 
              className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors duration-200 mb-3 ${
                isDragOver 
                  ? 'border-primary/50 bg-primary/5' 
                  : 'border-muted-foreground/30 hover:border-primary/50'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDragOver?.(true)
              }}
              onDragEnter={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDragOver?.(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDragOver?.(false)
              }}
              onDrop={onDrop}
            >
              <Upload className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Drop more JSON files here</p>
            </div>
          )}
          
          {/* File List */}
          {files.map((file) => {
            const isSelected = selectedFileId === file.id
            const hasErrors = file.content === null || file.content === undefined
            
            return (
              <div
                key={file.id}
                className={`
                  group relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors
                  ${isSelected
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                  }
                  ${hasErrors ? 'border-l-2 border-l-destructive' : ''}
                `}
                onClick={() => onFileSelect(file.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileJson className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="truncate font-medium">{file.name}</span>
                      {hasErrors && (
                        <AlertCircle className="h-3 w-3 flex-shrink-0 text-destructive" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{(file.size / 1024).toFixed(1)} KB</span>
                      {file.isModified && (
                        <>
                          <span>•</span>
                          <span className="text-primary font-medium">Modified</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {file.isModified && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                      Modified
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-accent-foreground/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      onFileRemove(file.id)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </TabsContent>
      
      <TabsContent value="structure" className="mt-4 flex-1 min-h-0">
        {selectedFile && selectedFile.content ? (
          <div className="h-full">
            <JSONTreeView data={selectedFile.content} fileName={selectedFile.name} />
          </div>
        ) : (
          <div className="p-4 text-center h-full flex items-center justify-center">
            <div>
              <FolderTree className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Select a file to view structure</p>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}