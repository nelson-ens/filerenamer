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
        metadata.CreateDate || metadata.DateTimeOriginal || metadata.MediaCreateDate;

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
      '.raf'
    ]);
    return mediaExtensions.has(path.extname(filename).toLowerCase());
  }

  renameFile(oldPath: string, newPath: string): void {
    fs.renameSync(oldPath, newPath);
  }

  listFiles(dirPath: string): string[] {
    return fs.readdirSync(dirPath);
  }

  exists(path: string): boolean {
    return fs.existsSync(path);
  }
}
