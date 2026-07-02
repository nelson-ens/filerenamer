#!/usr/bin/env node

import * as path from 'path';
import dayjs from 'dayjs';
import { FileService } from './services/fileService';
import { exiftool } from 'exiftool-vendored';

interface RenameOptions {
  inputFolder: string;
  suffix: string;
  execute: boolean;
  recursive: boolean;
  organize: boolean;
}

interface RenameOperation {
  oldPath: string;
  newPath: string;
  oldName: string;
  newName: string;
}

export interface RenameConflict {
  operation: RenameOperation;
  reason: string;
}

export function findRenameConflicts(
  operations: RenameOperation[],
  exists: (filePath: string) => boolean,
): RenameConflict[] {
  const conflicts: RenameConflict[] = [];
  const claimedTargets = new Set<string>();

  for (const operation of operations) {
    const { oldPath, newPath, newName } = operation;

    if (oldPath === newPath) {
      continue;
    }

    if (claimedTargets.has(newPath)) {
      conflicts.push({
        operation,
        reason: `Target name already used by another file in this batch: ${newName}`,
      });
      continue;
    }

    if (exists(newPath)) {
      conflicts.push({
        operation,
        reason: `Target file already exists: ${newName}`,
      });
      continue;
    }

    claimedTargets.add(newPath);
  }

  return conflicts;
}

// Matches a UUID/GUID like 10D69C2B-85A8-40CC-BC40-9739D0B70047, optionally
// preceded by a prefix (e.g. "IMG_"). Shortens to prefix + first 8 hex chars.
const GUID_PATTERN = /^(.*?)([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// Matches an embedded date like 2026-02-06 (e.g. "Screenshot 2026-02-06 at 1.57.16 PM").
const TIMESTAMP_PATTERN = /^(.*?)\d{4}-\d{2}-\d{2}/;

export function shortenFileName(fileName: string): string {
  const guidMatch = fileName.match(GUID_PATTERN);
  if (guidMatch) {
    return `${guidMatch[1]}${guidMatch[2]}`;
  }

  const timestampMatch = fileName.match(TIMESTAMP_PATTERN);
  if (timestampMatch) {
    const prefix = timestampMatch[1].replace(/[-_\s]+$/, '');
    if (prefix) {
      return prefix;
    }
  }

  return fileName;
}

export function getQuarter(month: number): number {
  return Math.ceil(month / 3);
}

export function getOrganizeFolder(inputFolder: string, date: Date): string {
  const year = dayjs(date).year();
  const month = dayjs(date).month() + 1;
  return path.join(inputFolder, String(year), `Q${getQuarter(month)}`);
}

export async function renameMediaFiles({
  inputFolder,
  suffix,
  execute,
  recursive,
  organize,
}: RenameOptions): Promise<void> {
  const fileService = new FileService();
  const operations: RenameOperation[] = [];

  try {
    if (!fileService.exists(inputFolder)) {
      throw new Error(`Folder ${inputFolder} does not exist`);
    }

    const files = fileService.listFiles(inputFolder, recursive);

    // First, collect all operations
    for (const file of files) {
      const filePath = path.join(inputFolder, file);
      const extension = path.extname(file);
      const originalFileName = path.basename(file, extension);
      const fileDirectory = path.dirname(file);

      if (!fileService.isMediaFile(file)) {
        console.log(`Skipping non-media file: ${file}`);
        continue;
      }

      // if already starts with timestamp, skip
      if (originalFileName.match(/^\d{8}[._]\d{6}/)) {
        console.log(`Skipping file with timestamp: ${file}`);
        continue;
      }

      const creationDate = await fileService.getMediaCreationDate(filePath);
      const dateString = dayjs(creationDate).format('YYYYMMDD.HHmmss');
      const shortenedFileName = shortenFileName(originalFileName);
      const newFileName = `${dateString}-${suffix}-${shortenedFileName}${extension}`;

      let newFilePath: string;
      let newFileRelativePath: string;

      if (organize) {
        const organizeDir = getOrganizeFolder(inputFolder, creationDate);
        newFilePath = path.join(organizeDir, newFileName);
        newFileRelativePath = path.relative(inputFolder, newFilePath);
      } else {
        newFileRelativePath = path.join(fileDirectory, newFileName);
        newFilePath = path.join(inputFolder, newFileRelativePath);
      }

      operations.push({
        oldPath: filePath,
        newPath: newFilePath,
        oldName: file,
        newName: newFileRelativePath,
      });
    }

    // Report planned operations
    if (operations.length === 0) {
      console.log('No media files found to rename.');
      return;
    }

    const conflicts = findRenameConflicts(operations, (filePath) => fileService.exists(filePath));
    const conflictedOperations = new Set(conflicts.map(({ operation }) => operation));
    const executableOperations = operations.filter(
      (operation) => !conflictedOperations.has(operation),
    );

    const operationLabel = organize ? 'organize' : 'rename';

    console.log(`\nPlanned ${operationLabel} operations:`);
    console.log('-------------------------');
    operations.forEach(({ oldName, newName }) => {
      console.log(`${oldName} -> ${newName}`);
    });
    console.log('-------------------------');
    console.log(`Total files to ${operationLabel}: ${operations.length}`);

    if (conflicts.length > 0) {
      console.log(`\nSkipped ${operationLabel} operations (target already exists):`);
      console.log('-------------------------');
      conflicts.forEach(({ operation, reason }) => {
        console.log(`${operation.oldName} -> ${operation.newName}`);
        console.log(`  Reason: ${reason}`);
      });
      console.log('-------------------------');
      console.log(`Total skipped: ${conflicts.length}`);
    }

    // Execute operations only if execute flag is true
    if (execute) {
      const executeLabel = organize ? 'organize' : 'rename';
      console.log(`\n⚠️  EXECUTING ${executeLabel} operations...`);
      let renamedCount = 0;

      for (const { oldPath, newPath, oldName, newName } of executableOperations) {
        if (oldPath === newPath) {
          console.log(`Skipping (already named): ${oldName}`);
          continue;
        }

        if (organize) {
          fileService.ensureDirectory(path.dirname(newPath));
        }

        fileService.renameFile(oldPath, newPath);
        console.log(`✓ ${organize ? 'Organized' : 'Renamed'}: ${oldName} -> ${newName}`);
        renamedCount++;
      }

      if (renamedCount === 0 && conflicts.length > 0) {
        console.log(`\nNo files were ${executeLabel}d due to existing target names.`);
      } else if (conflicts.length > 0) {
        console.log(
          `\n✨ ${organize ? 'Organized' : 'Renamed'} ${renamedCount} file(s); skipped ${conflicts.length} due to existing target names.`,
        );
      } else {
        console.log(`\n✨ All files ${executeLabel}d successfully!`);
      }
    } else {
      const action = organize ? 'organizing' : 'renaming';
      console.log(
        `\n📝 DRY RUN: This was a preview. Use --execute flag to perform the actual ${action}.`,
      );
      console.log(
        organize
          ? 'Example: pnpm start "/path/to/folder" "suffix" --organize --execute'
          : 'Example: pnpm start "/path/to/folder" "suffix" --execute',
      );
    }
  } catch (error) {
    console.error('Error processing files:', error);
    throw error;
  } finally {
    await exiftool.end();
  }
}

export function showHelp(): void {
  console.log('\nFile Renamer - Rename media files with their capture date');
  console.log('\nUsage:');
  console.log('  filerenamer <input_folder> <suffix> [--execute] [--recursive] [--organize]');
  console.log('\nOptions:');
  console.log('  --execute    Actually perform the rename operations (default: dry-run)');
  console.log('  --recursive, -r  Process files in subdirectories recursively');
  console.log('  --organize   Rename files and move them into year/quarter folders (YYYY/Qn)');
  console.log('  --help       Show this help message');
  console.log('  --version    Show version number');
  console.log('\nExamples:');
  console.log('  filerenamer "./photos" "vacation"                      # Preview changes');
  console.log('  filerenamer "./photos" "vacation" --execute            # Actually rename files');
  console.log('  filerenamer "./photos" "vacation" --recursive          # Process subdirectories');
  console.log('  filerenamer "./photos" "vacation" --execute -r         # Rename recursively');
  console.log(
    '  filerenamer "./photos" "family" --organize --execute     # Rename and move to year/Q folders',
  );
}

export function showVersion(): void {
  const version = require('../package.json').version;
  console.log(`File Renamer v${version}`);
}

export async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    showVersion();
    process.exit(0);
  }

  const positionalArgs = args.filter((arg) => !arg.startsWith('-'));

  if (positionalArgs.length < 2) {
    showHelp();
    process.exit(1);
  }

  const [inputFolder, suffix] = positionalArgs;
  const execute = args.includes('--execute');
  const recursive = args.includes('--recursive') || args.includes('-r');
  const organize = args.includes('--organize');

  try {
    await renameMediaFiles({ inputFolder, suffix, execute, recursive, organize });
    console.log(execute ? '\n🎉 Rename operations completed.' : '\n✨ Preview completed.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
