import { renameMediaFiles } from '../index';
import { FileService } from '../services/fileService';

jest.mock('../services/fileService');
jest.mock('exiftool-vendored', () => ({
  exiftool: {
    end: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('renameMediaFiles', () => {
  const mockDate = new Date('2024-02-25T12:00:00Z');
  const consoleSpy = jest.spyOn(console, 'log');

  beforeEach(() => {
    jest.clearAllMocks();
    (FileService as jest.MockedClass<typeof FileService>).mockClear();
    consoleSpy.mockClear();
  });

  it('should only preview changes by default', async () => {
    const mockFileService = {
      exists: jest.fn().mockReturnValue(true),
      listFiles: jest.fn().mockReturnValue(['test1.jpg', 'test2.jpg']),
      isMediaFile: jest.fn().mockReturnValue(true),
      getMediaCreationDate: jest.fn().mockResolvedValue(mockDate),
      renameFile: jest.fn(),
      getFileDate: jest.fn().mockResolvedValue(mockDate),
    };

    (FileService as jest.MockedClass<typeof FileService>).mockImplementation(
      () => mockFileService as unknown as FileService,
    );

    await renameMediaFiles({
      inputFolder: '/test/folder',
      suffix: 'vacation',
      execute: false,
    });

    expect(mockFileService.renameFile).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
  });

  it('should execute rename operations when execute flag is true', async () => {
    const mockFileService = {
      exists: jest.fn().mockReturnValue(true),
      listFiles: jest.fn().mockReturnValue(['test1.jpg', 'test2.jpg']),
      isMediaFile: jest.fn().mockReturnValue(true),
      getMediaCreationDate: jest.fn().mockResolvedValue(mockDate),
      renameFile: jest.fn(),
      getFileDate: jest.fn().mockResolvedValue(mockDate),
    };

    (FileService as jest.MockedClass<typeof FileService>).mockImplementation(
      () => mockFileService as unknown as FileService,
    );

    await renameMediaFiles({
      inputFolder: '/test/folder',
      suffix: 'vacation',
      execute: true,
    });

    expect(mockFileService.renameFile).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('EXECUTING'));
  });

  it('should handle errors when folder does not exist', async () => {
    const mockFileService = {
      exists: jest.fn().mockReturnValue(false),
      listFiles: jest.fn(),
      isMediaFile: jest.fn(),
      getMediaCreationDate: jest.fn(),
      renameFile: jest.fn(),
      getFileDate: jest.fn(),
    };

    (FileService as jest.MockedClass<typeof FileService>).mockImplementation(
      () => mockFileService as unknown as FileService,
    );

    await expect(
      renameMediaFiles({
        inputFolder: '/test/folder',
        suffix: 'vacation',
        execute: false,
      }),
    ).rejects.toThrow('Folder /test/folder does not exist');
  });
});
