// src/components/JSONEditor/FileDropZone.tsx
import { useState, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileList } from "./file-list"
import { JSONEditor } from "./json-editor"
import { FileActions } from "./file-actions"
import { ThemeToggle } from "@/components/theme-toggle"
import { CheckCircle, Upload, Lock, Zap, Menu, X, Loader2, FileJson } from "lucide-react"
import { toast } from "sonner"
import type { JSONFile } from "@/types/json-editor"

export function FileDropZone() {
  const [files, setFiles] = useState<JSONFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFileId, setSelectedFileId] = useState<string>()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Add global drag event listeners
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(true)
    }

    const handleGlobalDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(true)
    }

    const handleGlobalDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      // Only set to false if we're leaving the window entirely
      if (e.clientX <= 0 || e.clientY <= 0 || 
          e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsDragOver(false)
      }
    }

    const handleGlobalDrop = async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      
      if (e.dataTransfer?.files) {
        setIsProcessing(true)
        try {
          const newFiles = await processFiles(e.dataTransfer.files)
          setFiles(prev => [...prev, ...newFiles])
          if (!selectedFileId && newFiles.length > 0) {
            setSelectedFileId(newFiles[0].id)
          }
          if (newFiles.length > 0) {
            toast.success(`${newFiles.length} file(s) loaded successfully`)
          }
        } finally {
          setIsProcessing(false)
        }
      }
    }

    // Add event listeners to document body
    document.body.addEventListener('dragover', handleGlobalDragOver)
    document.body.addEventListener('dragenter', handleGlobalDragEnter)
    document.body.addEventListener('dragleave', handleGlobalDragLeave)
    document.body.addEventListener('drop', handleGlobalDrop)

    // Cleanup
    return () => {
      document.body.removeEventListener('dragover', handleGlobalDragOver)
      document.body.removeEventListener('dragenter', handleGlobalDragEnter)
      document.body.removeEventListener('dragleave', handleGlobalDragLeave)
      document.body.removeEventListener('drop', handleGlobalDrop)
    }
  }, [selectedFileId])

  const processFiles = useCallback(async (fileList: FileList): Promise<JSONFile[]> => {
    const jsonFiles: JSONFile[] = []
    const errors: string[] = []
    
    for (const file of Array.from(fileList)) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        try {
          const content = await file.text()
          const parsedContent = JSON.parse(content)
          
          jsonFiles.push({
            id: crypto.randomUUID(),
            name: file.name,
            path: file.webkitRelativePath || file.name,
            content: parsedContent,
            originalContent: parsedContent,
            isModified: false,
            size: file.size
          })
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error)
          errors.push(file.name)
        }
      }
    }
    
    if (errors.length > 0) {
      toast.error(`Failed to load ${errors.length} file(s): ${errors.join(', ')}`)
    }
    
    return jsonFiles
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const droppedFiles = e.dataTransfer.files
    setIsProcessing(true)
    try {
      const newFiles = await processFiles(droppedFiles)
      setFiles(prev => [...prev, ...newFiles])
      
      // Auto-select first file if none selected
      if (!selectedFileId && newFiles.length > 0) {
        setSelectedFileId(newFiles[0].id)
      }
    } finally {
      setIsProcessing(false)
    }
  }, [processFiles, selectedFileId])

  const handleFileSelect = useCallback((fileId: string) => {
    setSelectedFileId(fileId)
    // Close sidebar on mobile when file is selected
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false)
    }
  }, [])

  const handleFileRemove = useCallback((fileId: string) => {
    const fileToRemove = files.find(f => f.id === fileId)
    setFiles(prev => prev.filter(f => f.id !== fileId))
    if (selectedFileId === fileId) {
      setSelectedFileId(files.find(f => f.id !== fileId)?.id)
    }
    if (fileToRemove) {
      toast.success(`Removed ${fileToRemove.name}`)
    }
  }, [selectedFileId, files])

  const handleContentChange = useCallback((fileId: string, content: unknown) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, content, isModified: true }
        : file
    ))
  }, [])

  const handleSave = useCallback((fileId: string, saveAsNew = false) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return

    try {
      if (saveAsNew) {
        // Create download link for new file
        const blob = new Blob([JSON.stringify(file.content, null, 2)], {
          type: 'application/json'
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${file.name.replace('.json', '')}_modified.json`
        a.click()
        URL.revokeObjectURL(url)
        toast.success(`Saved as ${file.name.replace('.json', '')}_modified.json`)
      } else {
        // Update original file (in browser context, this would typically
        // trigger a download since we can't directly modify local files)
        const blob = new Blob([JSON.stringify(file.content, null, 2)], {
          type: 'application/json'
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
        toast.success(`Saved ${file.name}`)
      }

      // Mark as not modified
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, originalContent: f.content, isModified: false }
          : f
      ))
    } catch {
      toast.error(`Failed to save ${file.name}`)
    }
  }, [files])

  const selectedFile = files.find(f => f.id === selectedFileId)
  const modifiedCount = files.filter(f => f.isModified).length

  return (
    <div className="min-h-screen bg-background">
      {/* Global Drop Zone */}
      <div
        className={`fixed inset-0 z-[9999] transition-all duration-300 ${
          isDragOver 
            ? 'bg-primary/20 backdrop-blur-sm pointer-events-auto border-4 border-dashed border-primary/50' 
            : 'pointer-events-none'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDragOver(true)
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          // Only set drag over to false if we're leaving the entire drop zone
          if (e.currentTarget === e.target) {
            setIsDragOver(false)
          }
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDragOver(false)
          handleDrop(e)
        }}
      />
      
      {/* Drag Overlay - Always visible when dragging */}
      {isDragOver && (
        <div className="fixed inset-0 z-[9999] bg-primary/30 backdrop-blur-sm border-4 border-dashed border-primary flex items-center justify-center">
          <div className="text-center bg-background/90 rounded-lg p-8 shadow-lg">
            <Upload className="w-20 h-20 mx-auto mb-4 text-primary animate-pulse" />
            <h2 className="text-2xl font-bold text-primary mb-2">Drop JSON Files Here</h2>
            <p className="text-lg text-muted-foreground">Release to load your JSON files</p>
          </div>
        </div>
      )}
      
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-[10000] bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center bg-background rounded-lg p-8 shadow-lg border">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Processing Files</h2>
            <p className="text-muted-foreground">Please wait while we load your JSON files...</p>
          </div>
        </div>
      )}
      
      {/* Site Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <a className="mr-6 flex items-center space-x-2" href="#">
              <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                <FileJson className="size-4" />
              </div>
              <span className="hidden font-bold sm:inline-block">
                Variably
              </span>
            </a>
          </div>
          
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="flex items-center gap-2">
              {files.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{files.length} file(s)</span>
                  {modifiedCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-primary font-medium">{modifiedCount} modified</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <ThemeToggle />
              
              {/* Mobile Menu Button */}
              {files.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="md:hidden"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        {files.length > 0 && (
          <aside className="hidden md:block w-96 shrink-0 border-r bg-background">
            <div className="py-6 pr-2 lg:py-8">
              <div className="space-y-4">
                <div className="px-3 py-2">
                  <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                    Files
                  </h2>
                  <div className="space-y-1">
                    <FileList
                      files={files}
                      onFileSelect={handleFileSelect}
                      onFileRemove={handleFileRemove}
                      selectedFileId={selectedFileId}
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}
        
        {/* Mobile Sidebar */}
        {isSidebarOpen && (
          <aside className="fixed top-14 left-0 z-50 h-[calc(100vh-3.5rem)] w-96 border-r bg-background md:hidden">
            <div className="py-6 pr-2">
              <div className="space-y-4">
                <div className="px-3 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="px-4 text-lg font-semibold tracking-tight">
                      Files
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <FileList
                      files={files}
                      onFileSelect={handleFileSelect}
                      onFileRemove={handleFileRemove}
                      selectedFileId={selectedFileId}
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-h-0 p-4 md:p-6 lg:p-8">
            {files.length === 0 ? (
            /* Modern Empty State - Inspired by shadcn/ui blocks */
            <div className="flex w-full h-full">
              <div className="flex items-center justify-center w-full h-full">
                <div className="w-full h-full">
                  {/* Main Drop Zone */}
                  <Card className="relative overflow-hidden border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors duration-200">
                    <CardContent className="p-8 sm:p-16 text-center">
                      {/* Upload Icon */}
                      <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center">
                        <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />
                      </div>
                      
                      {/* Main Text */}
                      <h2 className="text-2xl sm:text-3xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Drop your JSON files here
                      </h2>
                      <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto">
                        Drag and drop JSON files anywhere in this window to start editing them instantly
                      </p>
                      
                      {/* Or Divider */}
                      <div className="flex items-center justify-center mb-6 sm:mb-8">
                        <div className="flex-1 h-px bg-border"></div>
                        <span className="px-4 text-sm text-muted-foreground font-medium">or</span>
                        <div className="flex-1 h-px bg-border"></div>
                      </div>
                      
                      {/* Browse Button */}
                      <Button 
                        size="lg" 
                        className="px-6 sm:px-8 py-2 sm:py-3 text-base font-medium"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Browse Files
                      </Button>
                      
                      {/* Hidden File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".json"
                        className="hidden"
                        onChange={async (e) => {
                          if (e.target.files) {
                            setIsProcessing(true)
                            try {
                              const newFiles = await processFiles(e.target.files)
                              setFiles(prev => [...prev, ...newFiles])
                              if (!selectedFileId && newFiles.length > 0) {
                                setSelectedFileId(newFiles[0].id)
                              }
                            } finally {
                              setIsProcessing(false)
                            }
                          }
                        }}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Features Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 sm:mt-8">
                    <Card className="p-4 sm:p-6 text-center border-0 bg-muted/30">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-3 sm:mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2 text-sm sm:text-base">Multiple Files</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Support for multiple JSON files at once</p>
                    </Card>
                    
                    <Card className="p-4 sm:p-6 text-center border-0 bg-muted/30">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-3 sm:mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Lock className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2 text-sm sm:text-base">Secure & Private</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Files processed locally, never uploaded</p>
                    </Card>
                    
                    <Card className="p-4 sm:p-6 text-center border-0 bg-muted/30 sm:col-span-2 lg:col-span-1">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-3 sm:mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Zap className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2 text-sm sm:text-base">Instant Editing</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Real-time JSON editing with syntax highlighting</p>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* File Editor Layout */
            <div className="flex-1 space-y-4 h-full">
              {selectedFile ? (
                <div className="space-y-4">
                  <FileActions
                    file={selectedFile}
                    onSave={handleSave}
                  />
                  <JSONEditor
                    file={selectedFile}
                    onContentChange={handleContentChange}
                  />
                </div>
              ) : (
                <Card className="h-96 flex items-center justify-center">
                  <CardContent className="text-center">
                    <FileJson className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Select a file from the sidebar to start editing
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}