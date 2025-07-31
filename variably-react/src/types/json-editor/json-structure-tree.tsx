"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, FileJson, Folder, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface JSONNode {
  key: string
  value: any
  type: "object" | "array" | "string" | "number" | "boolean" | "null"
  path: string[]
}

interface JSONStructureTreeProps {
  data: any
  onNodeSelect?: (path: string[], value: any) => void
  selectedPath?: string[]
}

function renderJSONNode(
  key: string,
  value: any,
  path: string[],
  level: number = 0,
  onNodeSelect?: (path: string[], value: any) => void,
  selectedPath?: string[]
): JSONNode[] {
  const currentPath = [...path, key]
  const isSelected = selectedPath && selectedPath.join('.') === currentPath.join('.')
  
  if (value === null) {
    return [{
      key,
      value,
      type: "null",
      path: currentPath
    }]
  }
  
  if (typeof value === "object" && !Array.isArray(value)) {
    return [{
      key,
      value,
      type: "object",
      path: currentPath
    }, ...Object.entries(value).flatMap(([k, v]) => 
      renderJSONNode(k, v, currentPath, level + 1, onNodeSelect, selectedPath)
    )]
  }
  
  if (Array.isArray(value)) {
    return [{
      key,
      value,
      type: "array",
      path: currentPath
    }, ...value.flatMap((v, index) => 
      renderJSONNode(index.toString(), v, currentPath, level + 1, onNodeSelect, selectedPath)
    )]
  }
  
  return [{
    key,
    value,
    type: typeof value as "string" | "number" | "boolean",
    path: currentPath
  }]
}

function getNodeIcon(type: string, isExpanded?: boolean) {
  switch (type) {
    case "object":
      return isExpanded ? <FolderOpen className="h-3 w-3" /> : <Folder className="h-3 w-3" />
    case "array":
      return <FileJson className="h-3 w-3" />
    default:
      return null
  }
}

function getValuePreview(value: any, type: string): string {
  if (type === "null") return "null"
  if (type === "object") return "{...}"
  if (type === "array") return `[${Array.isArray(value) ? value.length : 0}]`
  if (type === "string") return `"${String(value).slice(0, 20)}${String(value).length > 20 ? '...' : ''}"`
  return String(value)
}

export function JSONStructureTree({ data, onNodeSelect, selectedPath }: JSONStructureTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  
  const toggleNode = (path: string[]) => {
    const pathKey = path.join('.')
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(pathKey)) {
      newExpanded.delete(pathKey)
    } else {
      newExpanded.add(pathKey)
    }
    setExpandedNodes(newExpanded)
  }
  
  const nodes = renderJSONNode("root", data, [], 0, onNodeSelect, selectedPath)
  
  return (
    <div className="space-y-1">
      {nodes.map((node, index) => {
        const pathKey = node.path.join('.')
        const isExpanded = expandedNodes.has(pathKey)
        const isExpandable = node.type === "object" || node.type === "array"
        const level = node.path.length - 1
        const isSelected = selectedPath && selectedPath.join('.') === pathKey
        
        return (
          <div key={index} className="relative">
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                isSelected && "bg-accent text-accent-foreground",
                level > 0 && "ml-4"
              )}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
              onClick={() => {
                if (isExpandable) {
                  toggleNode(node.path)
                }
                onNodeSelect?.(node.path, node.value)
              }}
            >
              {isExpandable && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleNode(node.path)
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              )}
              
              {getNodeIcon(node.type, isExpanded)}
              
              <span className="font-medium">{node.key}</span>
              
              {node.type !== "object" && node.type !== "array" && (
                <span className="text-muted-foreground ml-1">
                  {getValuePreview(node.value, node.type)}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
} 