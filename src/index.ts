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
}

interface RenameOperation {
  oldPath: string;
  newPath: string;
  oldName: string;
  newName: string;
}

export async function renameMediaFiles({
  inputFolder,
  suffix,
  execute,
  recursive,
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
      if (originalFileName.match(/^\d{8}\.\d{6}/)) {
        console.log(`Skipping file with timestamp: ${file}`);
        continue;
      }

      const creationDate = await fileService.getMediaCreationDate(filePath);
      const dateString = dayjs(creationDate).format('YYYYMMDD.HHmmss');
      const newFileName = `${dateString}-${suffix}-${originalFileName}${extension}`;
      const newFileRelativePath = path.join(fileDirectory, newFileName);
      const newFilePath = path.join(inputFolder, newFileRelativePath);

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

    console.log('\nPlanned rename operations:');
    console.log('-------------------------');
    operations.forEach(({ oldName, newName }) => {
      console.log(`${oldName} -> ${newName}`);
    });
    console.log('-------------------------');
    console.log(`Total files to rename: ${operations.length}`);

    // Execute operations only if execute flag is true
    if (execute) {
      console.log('\n⚠️  EXECUTING rename operations...');
      operations.forEach(({ oldPath, newPath, oldName, newName }) => {
        fileService.renameFile(oldPath, newPath);
        console.log(`✓ Renamed: ${oldName} -> ${newName}`);
      });
      console.log('\n✨ All files renamed successfully!');
    } else {
      console.log(
        '\n📝 DRY RUN: This was a preview. Use --execute flag to perform the actual renaming.',
      );
      console.log('Example: pnpm start "/path/to/folder" "suffix" --execute');
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
  console.log('  filerenamer <input_folder> <suffix> [--execute] [--recursive]');
  console.log('\nOptions:');
  console.log('  --execute    Actually perform the rename operations (default: dry-run)');
  console.log('  --recursive, -r  Process files in subdirectories recursively');
  console.log('  --help       Show this help message');
  console.log('  --version    Show version number');
  console.log('\nExamples:');
  console.log('  filerenamer "./photos" "vacation"                      # Preview changes');
  console.log('  filerenamer "./photos" "vacation" --execute            # Actually rename files');
  console.log('  filerenamer "./photos" "vacation" --recursive          # Process subdirectories');
  console.log('  filerenamer "./photos" "vacation" --execute -r         # Rename recursively');
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

  if (args.length < 2 || args.length > 3) {
    showHelp();
    process.exit(1);
  }

  const [inputFolder, suffix] = args;
  const execute = args.includes('--execute');
  const recursive = args.includes('--recursive') || args.includes('-r');

  try {
    await renameMediaFiles({ inputFolder, suffix, execute, recursive });
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
