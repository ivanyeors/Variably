// src/components/JSONEditor/JSONEditor.tsx
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle, Code, Eye, Table } from "lucide-react"
import { JSONStructureViewer } from "./json-structure-viewer"
import type { JSONEditorProps } from "@/types/json-editor"

export function JSONEditor({ file, onContentChange }: JSONEditorProps) {
  const [jsonText, setJsonText] = useState('')
  const [isValid, setIsValid] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setJsonText(JSON.stringify(file.content, null, 2))
  }, [file.content])

  const validateAndUpdate = (text: string) => {
    setJsonText(text)
    try {
      const parsed = JSON.parse(text)
      setIsValid(true)
      setError('')
      onContentChange(file.id, parsed)
    } catch (err) {
      setIsValid(false)
      setError(err instanceof Error ? err.message : 'Invalid JSON')
    }
  }

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(jsonText)
      setJsonText(JSON.stringify(parsed, null, 2))
      setIsValid(true)
      setError('')
    } catch {
      setIsValid(false)
      setError('Cannot format invalid JSON')
    }
  }

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
        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="editor" className="flex items-center gap-1">
              <Code className="h-3 w-3" />
              <span className="hidden sm:inline">Editor</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span className="hidden sm:inline">Preview</span>
            </TabsTrigger>
            <TabsTrigger value="structure" className="flex items-center gap-1">
              <Table className="h-3 w-3" />
              <span className="hidden sm:inline">Structure</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="editor" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">JSON Content</label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={formatJSON}
                  className="text-xs"
                >
                  Format JSON
                </Button>
              </div>
              <div className="relative">
                <Textarea
                  value={jsonText}
                  onChange={(e) => validateAndUpdate(e.target.value)}
                  className={`
                    min-h-[400px] font-mono text-sm
                    resize-none focus:ring-2 focus:ring-primary/20
                    ${!isValid ? 'border-destructive focus:border-destructive' : ''}
                  `}
                  placeholder="Enter JSON content..."
                />
                {!isValid && (
                  <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-destructive">
                        <p className="font-medium mb-1">JSON Error:</p>
                        <p className="text-destructive/80">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="preview" className="mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">JSON Preview</label>
              <div className={`
                border rounded-md p-4 bg-muted/50 
                min-h-[400px] overflow-auto
                ${!isValid ? 'border-destructive/50 bg-destructive/5' : ''}
              `}>
                {isValid ? (
                  <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                    {JSON.stringify(file.content, null, 2)}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
                      <p className="text-sm">Cannot preview invalid JSON</p>
                      <p className="text-xs text-muted-foreground">Fix the errors in the editor first</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="structure" className="mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">JSON Structure</label>
              <div className={`
                border rounded-md p-4 bg-muted/50 
                min-h-[400px] overflow-auto
                ${!isValid ? 'border-destructive/50 bg-destructive/5' : ''}
              `}>
                {isValid ? (
                  <JSONStructureViewer 
                    data={file.content} 
                    title={`${file.name} Structure`}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
                      <p className="text-sm">Cannot view structure of invalid JSON</p>
                      <p className="text-xs text-muted-foreground">Fix the errors in the editor first</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}