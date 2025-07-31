// src/components/JSONEditor/FileList.tsx
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, FileJson, AlertCircle, FolderTree } from "lucide-react"
import { JSONStructureTree } from "./json-structure-tree"
import type { FileListProps } from "@/types/json-editor"

export function FileList({ files, onFileSelect, onFileRemove, selectedFileId }: FileListProps) {
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
    <Tabs defaultValue="files" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="files" className="flex items-center gap-2">
          <FileJson className="h-3 w-3" />
          Files
        </TabsTrigger>
        <TabsTrigger value="structure" className="flex items-center gap-2">
          <FolderTree className="h-3 w-3" />
          Structure
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="files" className="mt-4">
        <div className="space-y-2">
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
      
      <TabsContent value="structure" className="mt-4">
        {selectedFile && selectedFile.content ? (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground px-2 py-1">
              {selectedFile.name} structure
            </div>
            <JSONStructureTree 
              data={selectedFile.content}
              onNodeSelect={(path, value) => {
                console.log('Selected node:', path, value)
                // You can implement navigation or highlighting here
              }}
            />
          </div>
        ) : (
          <div className="p-4 text-center">
            <FolderTree className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Select a file to view structure</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}