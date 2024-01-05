type NodeStyleCallback<T> = (error: string, result: T) => void;

import type {
  StatSyncFn,
  StatSyncOptions,
  WriteFileOptions
} from 'node:fs';

declare module "fs-plus" {
  export function getHomeDirectory(): string;
  export function absolute(relativePath: string): string;
  export function normalize(pathToNormalize: string): string;
  export function tildify(pathToTildify: string): string;
  export function getAppDataDirectory(): string;
  export function isAbsolute(pathToCheck: string): boolean;
  export function existsSync(pathToCheck: string): boolean;
  export function isDirectorySync(directoryPath: string): boolean;
  export function isDirectory(directoryPath: string): boolean;
  export function isFileSync(filePath: string): boolean;
  export function isSymbolicLinkSync(symlinkPath: string): boolean;
  export function isSymbolicLink(symlinkPath: string, callback: NodeStyleCallback<boolean>): void;
  export function isExecutableSync(pathToCheck: string): boolean;
  export function getSizeSync(pathToCheck: string): number;
  export function listSync(rootPath: string, extensions: string[] | undefined): string[];
  export function list(rootPath: string, extensions: string[] | undefined, callback: NodeStyleCallback<string[]>): void;
  export function listTreeSync(rootPath: string): string[];
  export function moveSync(source: string, target: string): void;
  export function removeSync(pathToRemove: string, target: string): void;
  export function writeFileSync(filePath: string, content: string, options: WriteFileOptions): void;
  export function writeFile(filePath: string, content: string, options: WriteFileOptions, callback: NodeStyleCallback<void>): void;
  export function copySync(sourcePath: string, destinationPath: string): void;
  export function makeTreeSync(directoryPath: string): void;
  export function makeTree(directoryPath: string, callback: NodeStyleCallback<void>): void;
  export function traverseTreeSync(
    rootPath: string,
    onFile: (p: string) => void,
    onDirectory: (d: string) => void
  ): void;
  export function traverseTree(
    rootPath: string,
    onFile: (p: string) => void,
    onDirectory: (d: string) => void,
    onDone: NodeStyleCallback<void>
  ): void;
  export function md5ForPath(pathToDigest: string): string;
  export function resolve(loadPaths: string[], pathToResolve: string, extensions: string[] | undefined): string;
  export function resolveOnLoadPath(pathToResolve: string, extensions: string[] | undefined): string;
  export function resolveExtension(pathToResolve: string, extensions: string[] | undefined): string;
  export function isCompressedExtension(ext: string): boolean;
  export function isImageExtension(ext: string): boolean;
  export function isPdfExtension(ext: string): boolean;
  export function isBinaryExtension(ext: string): boolean;
  export function isReadmePath(readmePath: string): boolean;
  export function isMarkdownExtension(ext: string): boolean;
  export function isCaseInsensitive(): boolean;
  export function isCaseSensitive(): boolean;
  export function statSyncNoException(path: string, options: StatSyncOptions): ReturnType<StatSyncFn>;
  export function lstatSyncNoException(path: string, options: StatSyncOptions): ReturnType<StatSyncFn>;
}
