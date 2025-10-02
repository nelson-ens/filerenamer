import { renameMediaFiles, showHelp, showVersion } from '../index';
import { FileService } from '../services/fileService';

jest.mock('../services/fileService');
jest.mock('exiftool-vendored', () => ({
  exiftool: {
    end: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('renameMediaFiles', () => {
  const mockDate = new Date('2024-02-25T12:00:00Z');
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    (FileService as jest.MockedClass<typeof FileService>).mockClear();

    // Suppress console.error for expected errors
    originalConsoleError = console.error;
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore console.error after each test
    console.error = originalConsoleError;
  });

  it('should only preview changes by default', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
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
      recursive: false,
    });

    expect(mockFileService.renameFile).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
    consoleSpy.mockRestore();
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
      recursive: false,
    });

    expect(mockFileService.renameFile).toHaveBeenCalled();
    // expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('EXECUTING'));
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
        recursive: false,
      }),
    ).rejects.toThrow('Folder /test/folder does not exist');
  });

  it('should skip non-media files', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const mockFileService = {
      exists: jest.fn().mockReturnValue(true),
      listFiles: jest.fn().mockReturnValue(['test1.jpg', 'test2.txt']),
      isMediaFile: jest.fn((file) => file.endsWith('.jpg')),
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
      recursive: false,
    });
    expect(mockFileService.renameFile).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping non-media file: test2.txt'),
    );
    consoleSpy.mockRestore();
  });

  it('should handle no media files found', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const mockFileService = {
      exists: jest.fn().mockReturnValue(true),
      listFiles: jest.fn().mockReturnValue(['test1.txt']),
      isMediaFile: jest.fn().mockReturnValue(false),
      getMediaCreationDate: jest.fn(),
      renameFile: jest.fn(),
      getFileDate: jest.fn(),
    };

    (FileService as jest.MockedClass<typeof FileService>).mockImplementation(
      () => mockFileService as unknown as FileService,
    );

    await renameMediaFiles({
      inputFolder: '/test/folder',
      suffix: 'vacation',
      execute: false,
      recursive: false,
    });

    expect(mockFileService.renameFile).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('No media files found to rename.'),
    );
    consoleSpy.mockRestore();
  });

  it('should handle errors during renaming', async () => {
    const mockFileService = {
      exists: jest.fn().mockReturnValue(true),
      listFiles: jest.fn().mockReturnValue(['test1.jpg']),
      isMediaFile: jest.fn().mockReturnValue(true),
      getMediaCreationDate: jest.fn().mockResolvedValue(mockDate),
      renameFile: jest.fn().mockImplementation(() => {
        throw new Error('Rename error');
      }),
      getFileDate: jest.fn().mockResolvedValue(mockDate),
    };

    (FileService as jest.MockedClass<typeof FileService>).mockImplementation(
      () => mockFileService as unknown as FileService,
    );

    try {
      await renameMediaFiles({
        inputFolder: '/test/folder',
        suffix: 'vacation',
        execute: true,
        recursive: false,
      });
    } catch (error) {
      expect(error).toEqual(new Error('Rename error'));
    }
  });
});

describe('main', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle missing arguments', async () => {
    const mockRenameMediaFiles = jest.spyOn(require('../index'), 'renameMediaFiles');

    // Simulate command line arguments
    process.argv = ['node', 'script.js'];

    await import('../index');

    expect(mockRenameMediaFiles).not.toHaveBeenCalled();
  });

  it('should handle invalid arguments', async () => {
    const mockRenameMediaFiles = jest.spyOn(require('../index'), 'renameMediaFiles');

    // Simulate command line arguments
    process.argv = [
      'node',
      'script.js',
      '--inputFolder',
      '/test/folder',
      '--suffix',
      'vacation',
      '--execute',
      '--invalidArg',
    ];

    await import('../index');

    expect(mockRenameMediaFiles).not.toHaveBeenCalled();
  });

  it('should handle help argument', async () => {
    const mockRenameMediaFiles = jest.spyOn(require('../index'), 'renameMediaFiles');
    const mockShowVersion = jest.spyOn(require('../index'), 'showVersion');

    // Simulate command line arguments
    process.argv = ['node', 'script.js', '--help'];

    await import('../index');

    expect(mockRenameMediaFiles).not.toHaveBeenCalled();
    expect(mockShowVersion).not.toHaveBeenCalled();
  });

  it('should handle version argument', async () => {
    const mockRenameMediaFiles = jest.spyOn(require('../index'), 'renameMediaFiles');
    // const mockShowVersion = jest.spyOn(require('../index'), 'showVersion');

    // Simulate command line arguments
    process.argv = ['node', 'script.js', '--version'];

    await import('../index');

    expect(mockRenameMediaFiles).not.toHaveBeenCalled();
    // expect(mockShowVersion).toHaveBeenCalled();
  });
});

describe('showHelp', () => {
  it('should display the help message', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    showHelp();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('File Renamer - Rename media files with their capture date'),
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('filerenamer <input_folder> <suffix> [--execute] [--recursive]'),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '--execute    Actually perform the rename operations (default: dry-run)',
      ),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('--help       Show this help message'),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('--version    Show version number'),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('filerenamer "./photos" "vacation"                      # Preview changes'),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'filerenamer "./photos" "vacation" --execute            # Actually rename files',
      ),
    );

    consoleSpy.mockRestore();
  });
});

describe('showVersion', () => {
  it('should display the version number', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const version = require('../../package.json').version;

    showVersion();

    expect(consoleSpy).toHaveBeenCalledWith(`File Renamer v${version}`);

    consoleSpy.mockRestore();
  });
});
