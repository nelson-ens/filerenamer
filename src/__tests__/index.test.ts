import {
  findRenameConflicts,
  getOrganizeFolder,
  getQuarter,
  renameMediaFiles,
  shortenFileName,
  showHelp,
  showVersion,
} from '../index';
import { FileService } from '../services/fileService';
import * as path from 'path';

jest.mock('../services/fileService');
jest.mock('exiftool-vendored', () => ({
  exiftool: {
    end: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('renameMediaFiles', () => {
  const mockDate = new Date('2024-02-25T12:00:00Z');
  const inputFolder = '/test/folder';
  let originalConsoleError: typeof console.error;

  const folderExists = (path: string) => path === inputFolder;

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
      exists: jest.fn(folderExists),
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
      inputFolder,
      suffix: 'vacation',
      execute: false,
      recursive: false,
      organize: false,
    });

    expect(mockFileService.renameFile).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
    consoleSpy.mockRestore();
  });

  it('should execute rename operations when execute flag is true', async () => {
    const mockFileService = {
      exists: jest.fn(folderExists),
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
      inputFolder,
      suffix: 'vacation',
      execute: true,
      recursive: false,
      organize: false,
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
        inputFolder,
        suffix: 'vacation',
        execute: false,
        recursive: false,
        organize: false,
      }),
    ).rejects.toThrow(`Folder ${inputFolder} does not exist`);
  });

  it('should skip non-media files', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const mockFileService = {
      exists: jest.fn(folderExists),
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
      inputFolder,
      suffix: 'vacation',
      execute: false,
      recursive: false,
      organize: false,
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
      exists: jest.fn(folderExists),
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
      inputFolder,
      suffix: 'vacation',
      execute: false,
      recursive: false,
      organize: false,
    });

    expect(mockFileService.renameFile).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('No media files found to rename.'),
    );
    consoleSpy.mockRestore();
  });

  it('should handle errors during renaming', async () => {
    const mockFileService = {
      exists: jest.fn(folderExists),
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
        inputFolder,
        suffix: 'vacation',
        execute: true,
        recursive: false,
        organize: false,
      });
    } catch (error) {
      expect(error).toEqual(new Error('Rename error'));
    }
  });

  it('should skip renames when the target already exists on disk', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const targetPath = '/test/folder/20240225.040000-vacation-test1.jpg';
    const mockFileService = {
      exists: jest.fn((path: string) => path === inputFolder || path === targetPath),
      listFiles: jest.fn().mockReturnValue(['test1.jpg']),
      isMediaFile: jest.fn().mockReturnValue(true),
      getMediaCreationDate: jest.fn().mockResolvedValue(mockDate),
      renameFile: jest.fn(),
      getFileDate: jest.fn().mockResolvedValue(mockDate),
    };

    (FileService as jest.MockedClass<typeof FileService>).mockImplementation(
      () => mockFileService as unknown as FileService,
    );

    await renameMediaFiles({
      inputFolder,
      suffix: 'vacation',
      execute: true,
      recursive: false,
      organize: false,
    });

    expect(mockFileService.renameFile).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipped rename operations (target already exists)'),
    );
    consoleSpy.mockRestore();
  });

  it('should skip duplicate target names within the same batch', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const mockFileService = {
      exists: jest.fn(folderExists),
      listFiles: jest.fn().mockReturnValue([
        'IMG_AAAAAAAA-1111-1111-1111-111111111111.jpg',
        'IMG_AAAAAAAA-2222-2222-2222-222222222222.jpg',
      ]),
      isMediaFile: jest.fn().mockReturnValue(true),
      getMediaCreationDate: jest.fn().mockResolvedValue(mockDate),
      renameFile: jest.fn(),
      getFileDate: jest.fn().mockResolvedValue(mockDate),
    };

    (FileService as jest.MockedClass<typeof FileService>).mockImplementation(
      () => mockFileService as unknown as FileService,
    );

    await renameMediaFiles({
      inputFolder,
      suffix: 'vacation',
      execute: true,
      recursive: false,
      organize: false,
    });

    expect(mockFileService.renameFile).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Target name already used by another file in this batch'),
    );
    consoleSpy.mockRestore();
  });

  it('should organize files into year/quarter folders when --organize is set', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const marchDate = new Date('2026-03-27T12:00:00Z');
    const mockFileService = {
      exists: jest.fn(folderExists),
      listFiles: jest.fn().mockReturnValue(['IMG_9626.jpeg']),
      isMediaFile: jest.fn().mockReturnValue(true),
      getMediaCreationDate: jest.fn().mockResolvedValue(marchDate),
      ensureDirectory: jest.fn(),
      renameFile: jest.fn(),
      getFileDate: jest.fn().mockResolvedValue(marchDate),
    };

    (FileService as jest.MockedClass<typeof FileService>).mockImplementation(
      () => mockFileService as unknown as FileService,
    );

    await renameMediaFiles({
      inputFolder,
      suffix: 'family',
      execute: true,
      recursive: false,
      organize: true,
    });

    const expectedDir = getOrganizeFolder(inputFolder, marchDate);
    expect(mockFileService.ensureDirectory).toHaveBeenCalledWith(expectedDir);
    expect(mockFileService.renameFile).toHaveBeenCalledWith(
      `${inputFolder}/IMG_9626.jpeg`,
      expect.stringContaining(`${expectedDir}${path.sep}20260327.`),
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Planned organize operations'));
    consoleSpy.mockRestore();
  });

  it('should not create folders during organize dry run', async () => {
    const marchDate = new Date('2026-03-27T12:00:00Z');
    const mockFileService = {
      exists: jest.fn(folderExists),
      listFiles: jest.fn().mockReturnValue(['IMG_9626.jpeg']),
      isMediaFile: jest.fn().mockReturnValue(true),
      getMediaCreationDate: jest.fn().mockResolvedValue(marchDate),
      ensureDirectory: jest.fn(),
      renameFile: jest.fn(),
      getFileDate: jest.fn().mockResolvedValue(marchDate),
    };

    (FileService as jest.MockedClass<typeof FileService>).mockImplementation(
      () => mockFileService as unknown as FileService,
    );

    await renameMediaFiles({
      inputFolder,
      suffix: 'family',
      execute: false,
      recursive: false,
      organize: true,
    });

    expect(mockFileService.ensureDirectory).not.toHaveBeenCalled();
    expect(mockFileService.renameFile).not.toHaveBeenCalled();
  });
});

describe('getQuarter', () => {
  it.each([
    [1, 1],
    [3, 1],
    [4, 2],
    [6, 2],
    [7, 3],
    [9, 3],
    [10, 4],
    [12, 4],
  ])('maps month %i to Q%i', (month, quarter) => {
    expect(getQuarter(month)).toBe(quarter);
  });
});

describe('getOrganizeFolder', () => {
  it('returns year and quarter folder for a March date', () => {
    expect(getOrganizeFolder('/photos', new Date('2026-03-27T12:00:00Z'))).toBe(
      path.join('/photos', '2026', 'Q1'),
    );
  });

  it('returns year and quarter folder for a May date', () => {
    expect(getOrganizeFolder('/photos', new Date('2026-05-24T12:00:00Z'))).toBe(
      path.join('/photos', '2026', 'Q2'),
    );
  });
});

describe('findRenameConflicts', () => {
  it('flags duplicate target names in the same batch', () => {
    const operations = [
      {
        oldPath: '/photos/a.jpg',
        newPath: '/photos/target.jpg',
        oldName: 'a.jpg',
        newName: 'target.jpg',
      },
      {
        oldPath: '/photos/b.jpg',
        newPath: '/photos/target.jpg',
        oldName: 'b.jpg',
        newName: 'target.jpg',
      },
    ];

    const conflicts = findRenameConflicts(operations, () => false);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].operation.oldName).toBe('b.jpg');
  });

  it('flags targets that already exist on disk', () => {
    const operations = [
      {
        oldPath: '/photos/a.jpg',
        newPath: '/photos/target.jpg',
        oldName: 'a.jpg',
        newName: 'target.jpg',
      },
    ];

    const conflicts = findRenameConflicts(operations, (path) => path === '/photos/target.jpg');

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].reason).toContain('Target file already exists');
  });
});

describe('shortenFileName', () => {
  it('shortens a bare GUID to its first segment', () => {
    expect(shortenFileName('10D69C2B-85A8-40CC-BC40-9739D0B70047')).toBe('10D69C2B');
  });

  it('shortens a prefixed GUID to prefix + first segment', () => {
    expect(shortenFileName('IMG_0F856183-8E47-40F2-848E-D28E823B3E6C')).toBe('IMG_0F856183');
  });

  it('shortens a lowercase GUID the same as uppercase', () => {
    expect(shortenFileName('img_0f856183-8e47-40f2-848e-d28e823b3e6c')).toBe('img_0f856183');
  });

  it('shortens a filename with an embedded timestamp to the text before it', () => {
    expect(shortenFileName('Screenshot 2026-02-06 at 1.57.16â¯PM')).toBe('Screenshot');
  });

  it('leaves filenames without a GUID or timestamp unchanged', () => {
    expect(shortenFileName('vacation-photo')).toBe('vacation-photo');
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
      expect.stringContaining('filerenamer <input_folder> <suffix> [--execute] [--recursive] [--organize]'),
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
