import * as fs from 'fs';
import * as path from 'path';
import { exiftool, ExifDateTime } from 'exiftool-vendored';

export class FileService {
  async getFileDate(filePath: string): Promise<Date> {
    const stats = fs.statSync(filePath);
    return stats.birthtime.getTime() === 0 ? stats.mtime : stats.birthtime;
  }

  async getMediaCreationDate(filePath: string): Promise<Date> {
    try {
      const metadata = await exiftool.read(filePath);
      // Try different metadata fields for creation date
      const dateCreated =
        metadata.CreationDate ||
        metadata.CreateDate ||
        metadata.DateTimeOriginal ||
        metadata.MediaCreateDate;

      if (dateCreated) {
        // Handle ExifDateTime type properly
        if (dateCreated instanceof ExifDateTime) {
          return dateCreated.toDate();
        }
        // Handle string type
        if (typeof dateCreated === 'string') {
          return new Date(dateCreated);
        }
      }

      return await this.getFileDate(filePath);
    } catch (error) {
      console.log(`Error reading EXIF data for ${filePath}, falling back to file system date`);
      return await this.getFileDate(filePath);
    }
  }

  isMediaFile(filename: string): boolean {
    const mediaExtensions = new Set([
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.mp4',
      '.mov',
      '.avi',
      '.heic',
      '.cr2',
      '.cr3',
      '.nef',
      '.raf',
    ]);
    return mediaExtensions.has(path.extname(filename).toLowerCase());
  }

  ensureDirectory(dirPath: string): void {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  renameFile(oldPath: string, newPath: string): void {
    if (oldPath !== newPath && fs.existsSync(newPath)) {
      throw new Error(`Cannot rename: target already exists: ${newPath}`);
    }
    fs.renameSync(oldPath, newPath);
  }

  listFiles(dirPath: string, recursive = false): string[] {
    if (!recursive) {
      return fs.readdirSync(dirPath);
    }

    const files: string[] = [];

    const scanDirectory = (currentPath: string, relativePath = '') => {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(currentPath, item.name);
        const relativeItemPath = path.join(relativePath, item.name);

        if (item.isDirectory()) {
          scanDirectory(itemPath, relativeItemPath);
        } else if (item.isFile()) {
          files.push(relativeItemPath);
        }
      }
    };

    scanDirectory(dirPath);
    return files;
  }

  exists(path: string): boolean {
    return fs.existsSync(path);
  }
}
