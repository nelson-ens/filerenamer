import * as fs from 'fs';
import { exiftool, ExifDateTime } from 'exiftool-vendored';
import { FileService } from '../../services/fileService';

jest.mock('fs');
jest.mock('exiftool-vendored');

describe('FileService', () => {
  const fileService = new FileService();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFileDate', () => {
    it('should return birthtime if it exists', async () => {
      const mockStats = { birthtime: new Date('2023-01-01'), mtime: new Date('2023-02-01') };
      (fs.statSync as jest.Mock).mockReturnValue(mockStats);

      const result = await fileService.getFileDate('test.jpg');
      expect(result).toEqual(mockStats.birthtime);
    });

    it('should return mtime if birthtime is 0', async () => {
      const mockStats = { birthtime: new Date(0), mtime: new Date('2023-02-01') };
      (fs.statSync as jest.Mock).mockReturnValue(mockStats);

      const result = await fileService.getFileDate('test.jpg');
      expect(result).toEqual(mockStats.mtime);
    });

    it('should throw an error if file does not exist', async () => {
      (fs.statSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT: File not found');
      });

      await expect(fileService.getFileDate('nonexistent.jpg')).rejects.toThrow(
        'ENOENT: File not found',
      );
    });
  });

  describe('getMediaCreationDate', () => {
    it('should return EXIF CreateDate if available', async () => {
      const mockExifData = { CreateDate: new ExifDateTime(2023, 1, 1, 0, 0, 0) };
      (exiftool.read as jest.Mock).mockResolvedValue(mockExifData);
      mockExifData.CreateDate.toDate = jest.fn(() => new Date('2023-01-01'));

      const result = await fileService.getMediaCreationDate('test.jpg');
      expect(result).toEqual(new Date('2023-01-01'));
    });

    it('should return EXIF DateTimeOriginal if CreateDate is not available', async () => {
      const mockExifData = { DateTimeOriginal: '2023-01-01T12:00:00' };
      (exiftool.read as jest.Mock).mockResolvedValue(mockExifData);

      const result = await fileService.getMediaCreationDate('test.jpg');
      expect(result).toEqual(new Date('2023-01-01T12:00:00'));
    });

    it('should fall back to file system date if EXIF data is unavailable', async () => {
      (exiftool.read as jest.Mock).mockRejectedValue(new Error('EXIF data not found'));
      const mockStats = { birthtime: new Date('2023-01-01'), mtime: new Date('2023-02-01') };
      (fs.statSync as jest.Mock).mockReturnValue(mockStats);

      const result = await fileService.getMediaCreationDate('test.jpg');
      expect(result).toEqual(mockStats.birthtime);
    });

    it('should fall back to file system date if EXIF data is unavailable', async () => {
      const mockExifData = {
        CreateDate: undefined,
        DateTimeOriginal: undefined,
        MediaCreateDate: undefined,
      };
      (exiftool.read as jest.Mock).mockResolvedValue(mockExifData);
      const mockStats = { birthtime: new Date('2023-01-01'), mtime: new Date('2023-02-01') };
      (fs.statSync as jest.Mock).mockReturnValue(mockStats);

      const result = await fileService.getMediaCreationDate('test.jpg');
      expect(result).toEqual(mockStats.birthtime);
    });
  });

  describe('isMediaFile', () => {
    it('should return true for supported media file extensions', () => {
      expect(fileService.isMediaFile('image.jpg')).toBe(true);
      expect(fileService.isMediaFile('video.mp4')).toBe(true);
    });

    it('should return false for unsupported file extensions', () => {
      expect(fileService.isMediaFile('document.pdf')).toBe(false);
    });
  });

  describe('renameFile', () => {
    it('should rename a file', () => {
      fileService.renameFile('oldPath.jpg', 'newPath.jpg');
      expect(fs.renameSync).toHaveBeenCalledWith('oldPath.jpg', 'newPath.jpg');
    });
  });

  describe('listFiles', () => {
    it('should list files in a directory', () => {
      const mockFiles = ['file1.jpg', 'file2.png'];
      (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);

      const result = fileService.listFiles('/test');
      expect(result).toEqual(mockFiles);
    });
  });

  describe('exists', () => {
    it('should return true if a path exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = fileService.exists('/test');
      expect(result).toBe(true);
    });

    it('should return false if a path does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = fileService.exists('/test');
      expect(result).toBe(false);
    });
  });
});
