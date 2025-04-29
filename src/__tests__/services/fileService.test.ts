import { FileService } from '../../services/fileService';
import * as fs from 'fs';
import { exiftool } from 'exiftool-vendored';

jest.mock('fs');
jest.mock('exiftool-vendored', () => ({
  exiftool: {
    read: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('FileService', () => {
  let fileService: FileService;
  const mockDate = new Date('2024-02-25T12:00:00Z');

  beforeEach(() => {
    fileService = new FileService();
    jest.clearAllMocks();
  });

  describe('isMediaFile', () => {
    test.each([
      ['image.jpg', true],
      ['image.jpeg', true],
      ['photo.png', true],
      ['animation.gif', true],
      ['video.mp4', true],
      ['movie.mov', true],
      ['clip.avi', true],
      ['photo.heic', true],
      ['document.pdf', false],
      ['image.JPG', true],
      ['test.txt', false],
      ['noextension', false],
      ['.hiddenfile', false],
      ['image.JPEG', true],
      ['video.MP4', true],
    ])('should correctly identify media files: %s -> %s', (filename, expected) => {
      expect(fileService.isMediaFile(filename)).toBe(expected);
    });
  });

  describe('getFileDate', () => {
    it('should return birthtime when valid', async () => {
      const mockStats = {
        birthtime: mockDate,
        mtime: new Date('2020-01-01'),
      };
      (fs.statSync as jest.Mock).mockReturnValue(mockStats);

      const result = await fileService.getFileDate('test.jpg');
      expect(result).toEqual(mockDate);
      expect(fs.statSync).toHaveBeenCalledWith('test.jpg');
    });

    it('should fall back to mtime when birthtime is invalid', async () => {
      const mockMtime = new Date('2020-01-01');
      const mockStats = {
        birthtime: new Date(0),
        mtime: mockMtime,
      };
      (fs.statSync as jest.Mock).mockReturnValue(mockStats);

      const result = await fileService.getFileDate('test.jpg');
      expect(result).toEqual(mockMtime);
    });

    it('should handle fs.statSync errors', async () => {
      const error = new Error('ENOENT: File not found');
      (fs.statSync as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(fileService.getFileDate('nonexistent.jpg')).rejects.toThrow(
        'ENOENT: File not found',
      );
    });
  });

  describe('getMediaCreationDate', () => {
    it('should return CreateDate when available', async () => {
      (exiftool.read as jest.Mock).mockResolvedValue({
        CreateDate: mockDate,
      });

      const result = await fileService.getMediaCreationDate('test.jpg');
      expect(result).toEqual(mockDate);
      expect(exiftool.read).toHaveBeenCalledWith('test.jpg');
    });

    it('should use DateTimeOriginal when CreateDate is not available', async () => {
      (exiftool.read as jest.Mock).mockResolvedValue({
        DateTimeOriginal: mockDate,
      });

      const result = await fileService.getMediaCreationDate('test.jpg');
      expect(result).toEqual(mockDate);
    });

    it('should use MediaCreateDate when other dates are not available', async () => {
      (exiftool.read as jest.Mock).mockResolvedValue({
        MediaCreateDate: mockDate,
      });

      const result = await fileService.getMediaCreationDate('test.jpg');
      expect(result).toEqual(mockDate);
    });

    it('should handle string date format', async () => {
      const dateString = '2024-02-25T12:00:00Z';
      (exiftool.read as jest.Mock).mockResolvedValue({
        CreateDate: dateString,
      });

      const result = await fileService.getMediaCreationDate('test.jpg');
      expect(result).toEqual(new Date(dateString));
    });

    it('should fall back to file date when no EXIF data', async () => {
      (exiftool.read as jest.Mock).mockResolvedValue({});
      (fs.statSync as jest.Mock).mockReturnValue({
        birthtime: mockDate,
        mtime: new Date('2020-01-01'),
      });

      const result = await fileService.getMediaCreationDate('test.jpg');
      expect(result).toEqual(mockDate);
    });

    it('should fall back to file date when EXIF read fails', async () => {
      (exiftool.read as jest.Mock).mockRejectedValue(new Error('EXIF read failed'));
      (fs.statSync as jest.Mock).mockReturnValue({
        birthtime: mockDate,
        mtime: new Date('2020-01-01'),
      });

      const result = await fileService.getMediaCreationDate('test.jpg');
      expect(result).toEqual(mockDate);
    });
  });

  describe('listFiles', () => {
    it('should return list of files in directory', () => {
      const mockFiles = ['file1.jpg', 'file2.mp4', 'file3.txt'];
      (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);

      expect(fileService.listFiles('test-dir')).toEqual(mockFiles);
      expect(fs.readdirSync).toHaveBeenCalledWith('test-dir');
    });

    it('should handle empty directories', () => {
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      expect(fileService.listFiles('empty-dir')).toEqual([]);
    });

    it('should handle fs.readdirSync errors', () => {
      const error = new Error('Directory access error');
      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw error;
      });

      expect(() => fileService.listFiles('invalid-dir')).toThrow('Directory access error');
    });
  });

  describe('exists', () => {
    it('should return true when path exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      expect(fileService.exists('existing-path')).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('existing-path');
    });

    it('should return false when path does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(fileService.exists('non-existing-path')).toBe(false);
    });
  });

  describe('renameFile', () => {
    it('should rename file successfully', () => {
      (fs.renameSync as jest.Mock).mockImplementation(() => undefined);

      fileService.renameFile('old.jpg', 'new.jpg');
      expect(fs.renameSync).toHaveBeenCalledWith('old.jpg', 'new.jpg');
    });

    it('should handle fs.renameSync errors', () => {
      const error = new Error('Rename error');
      (fs.renameSync as jest.Mock).mockImplementation(() => {
        throw error;
      });

      expect(() => fileService.renameFile('old.jpg', 'new.jpg')).toThrow('Rename error');
    });
  });
});
