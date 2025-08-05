// src/types/json-editor.ts
export interface JSONFile {
    id: string;
    name: string;
    path: string;
    content: any;
    originalContent: any;
    isModified: boolean;
    size: number;
    // New properties for manifest.json support
    isManifest?: boolean;
    dependencies?: string[]; // Files this file depends on
    dependents?: string[]; // Files that depend on this file
    manifestData?: {
      files: string[];
      dependencies: Record<string, string[]>;
    };
  }
  
  export interface FileDropZoneProps {
    onFilesLoaded: (files: JSONFile[]) => void;
  }
  
  export interface FileListProps {
    files: JSONFile[];
    onFileSelect: (fileId: string) => void;
    onFileRemove: (fileId: string) => void;
    selectedFileId?: string;
  }
  
  export interface JSONEditorProps {
    file: JSONFile;
    onContentChange: (fileId: string, content: any) => void;
  }