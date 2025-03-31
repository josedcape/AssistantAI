import { Project, File } from "@shared/schema";

export interface TabType {
  id: string;
  label: string;
  icon?: string;
}

export interface FileWithLanguage extends File {
  language: string; // Derived from file type or extension
}

export interface ProjectWithFiles extends Project {
  files: FileWithLanguage[];
}

export type LanguageIconMapping = {
  [key: string]: string;
};

export const LANGUAGE_ICONS: LanguageIconMapping = {
  html: "ri-html-5-line text-orange-500",
  css: "ri-css-3-line text-blue-500",
  javascript: "ri-javascript-line text-yellow-500",
  js: "ri-javascript-line text-yellow-500",
  typescript: "ri-typescript-line text-blue-600",
  ts: "ri-typescript-line text-blue-600",
  python: "ri-python-line text-green-500",
  py: "ri-python-line text-green-500",
  java: "ri-java-line text-red-500",
  php: "ri-php-line text-purple-500",
  json: "ri-braces-line text-gray-500",
  markdown: "ri-markdown-line text-gray-500",
  md: "ri-markdown-line text-gray-500",
  default: "ri-file-code-line text-gray-500"
};

export function getLanguageIcon(fileType: string): string {
  return LANGUAGE_ICONS[fileType.toLowerCase()] || LANGUAGE_ICONS.default;
}

export function getFileLanguage(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  switch (extension) {
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'js':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'php':
      return 'php';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return extension || 'text';
  }
}

export function getLanguageFromFileType(fileType: string): string {
  switch (fileType.toLowerCase()) {
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'javascript':
    case 'js':
      return 'javascript';
    case 'typescript':
    case 'ts':
      return 'typescript';
    case 'python':
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'php':
      return 'php';
    case 'json':
      return 'json';
    case 'markdown':
    case 'md':
      return 'markdown';
    default:
      return 'text';
  }
}
