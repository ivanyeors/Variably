// src/components/JSONEditor/FileActions.tsx
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Save, Download, RotateCcw, AlertCircle } from "lucide-react"
import type { JSONFile } from "@/types/json-editor"

interface FileActionsProps {
  file: JSONFile;
  onSave: (fileId: string, saveAsNew?: boolean) => void;
}

export function FileActions({ file, onSave }: FileActionsProps) {
  const hasErrors = file.content === null || file.content === undefined

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium truncate">{file.name}</span>
            {file.isModified && (
              <Badge variant="destructive" className="text-xs">
                Modified
              </Badge>
            )}
            {hasErrors && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Error
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {(file.size / 1024).toFixed(1)} KB • Last modified: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button
          onClick={() => onSave(file.id, false)}
          disabled={!file.isModified || hasErrors}
          className="flex items-center gap-2 flex-1 sm:flex-none"
          size="sm"
        >
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">Save</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={() => onSave(file.id, true)}
          disabled={hasErrors}
          className="flex items-center gap-2 flex-1 sm:flex-none"
          size="sm"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Save As</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={() => {
            // Reset to original content
            // This would need to be implemented in the parent component
          }}
          disabled={!file.isModified}
          className="flex items-center gap-2 flex-1 sm:flex-none"
          size="sm"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="hidden sm:inline">Reset</span>
        </Button>
      </div>
      
      {file.isModified && (
        <div className="w-full sm:w-auto text-center sm:text-left">
          <span className="text-xs text-muted-foreground">
            ⚠️ Unsaved changes
          </span>
        </div>
      )}
    </div>
  )
}