# File Renamer

A standalone executable that renames media files by appending their capture date/time and a custom suffix to the original filename.

## Features

- Renames media files using their EXIF metadata capture date/time
- Falls back to file system date if no EXIF data is available
- Supports multiple media formats (jpg, jpeg, png, gif, mp4, mov, avi, heic)
- Preserves original filenames while adding date and custom suffix
- Comprehensive error handling and logging
- Written in TypeScript with full type safety

## File Naming Format

The utility renames files following this format: 
```
YYYYMMDD.HHmmss-customsuffix-originalfilename.extension
```

For example:
- Original file: `IMG_1234.jpg`
- Capture date: October 15, 2023 at 14:30:45
- Custom suffix: "vacation"
- New filename: `20231015.143045-vacation-IMG_1234.jpg`

## Prerequisites

- Node.js (>=16.0.0)
- pnpm (recommended) or npm

## Installation

### Download Pre-built Executable

Download the executable from the releases page and make it executable:

```bash
chmod +x filerenamer
```

### Or Build from Source

1. Clone the repository:
```bash
git clone <repository-url>
cd filerenamer
```

2. Install dependencies:
```bash
pnpm install
```

3. Build the executable:
```bash
pnpm package
```

The executable will be created as `bin/filerenamer`.

4. Make the executable available system-wide (optional):
```bash
sudo cp bin/filerenamer /usr/local/bin/
```

## Usage

```bash
# Basic usage (preview mode)
filerenamer "./photos" "vacation"

# Execute mode (actually rename files)
filerenamer "./photos" "vacation" --execute

# Organize into year/quarter folders (preview)
filerenamer "./photos" "family" --organize

# Organize into year/quarter folders (execute)
filerenamer "./photos" "family" --organize --execute

# Show help
filerenamer --help

# Show version
filerenamer --version
```

### Command Line Options

1. `inputFolder`: Path to the folder containing media files
2. `suffix`: Custom text to append to the filename
3. `--execute` (optional): Actually perform the rename operations. Without this flag, only a preview is shown.
4. `--recursive`, `-r` (optional): Process files in subdirectories recursively
5. `--organize` (optional): After renaming, move files into `{inputFolder}/{year}/Q{n}/` folders based on capture date

### Organize by Quarter (`--organize`)

When `--organize` is set, files are renamed as usual, then moved into folders under the input directory:

```
{inputFolder}/{year}/Q{n}/{YYYYMMDD.HHmmss-suffix-originalfilename.ext}
```

Quarter mapping by capture month:

- Jan–Mar → `Q1`
- Apr–Jun → `Q2`
- Jul–Sep → `Q3`
- Oct–Dec → `Q4`

Example:

- Capture date: March 27, 2026
- Input: `./photos/IMG_9626.jpeg`
- Output: `./photos/2026/Q1/20260327.232732-family-IMG_9626.jpeg`

Year and quarter folders are created automatically on `--execute`. Dry-run only previews paths without creating folders or moving files.

Already-timestamped files (matching `YYYYMMDD.HHmmss-...`) are skipped during normal rename, but with `--organize` they are moved into the matching year/quarter folder without being renamed again.

Without `--organize`, behavior is unchanged (rename in place).

### Preview Mode (Default)

By default, the utility runs in preview mode, which:
1. Scans all media files in the specified directory
2. Shows what changes would be made to each file
3. Displays a summary of planned operations
4. Does not modify any files

Example preview output:

## Supported File Types

- Images: .jpg, .jpeg, .png, .gif, .heic
- Videos: .mp4, .mov, .avi

## Development

### Available Scripts

- `pnpm build` - Compiles TypeScript to JavaScript
- `pnpm start` - Runs the application
- `pnpm test` - Runs tests
- `pnpm test:coverage` - Runs tests with coverage report
- `pnpm lint` - Runs ESLint
- `pnpm lint:fix` - Fixes ESLint issues automatically
- `pnpm format` - Formats code using Prettier
- `pnpm format:check` - Checks if files are formatted correctly

### Project Structure

```
filerenamer/
├── src/
│   ├── index.ts           # Main application entry point
│   └── services/
│       └── fileService.ts # File handling service
├── tests/
│   ├── index.test.ts
│   └── services/
│       └── fileService.test.ts
├── jest.config.js         # Jest configuration
├── tsconfig.json         # TypeScript configuration
├── .eslintrc.json       # ESLint configuration
├── .prettierrc.json     # Prettier configuration
└── package.json
```

### Testing

The project includes comprehensive tests with Jest. Run tests with:

```bash
pnpm test
```

For test coverage report:

```bash
pnpm test:coverage
```

Coverage thresholds are set to 80% for:
- Branches
- Functions
- Lines
- Statements

### Code Quality

The project uses:
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Jest for testing

## Error Handling

The utility handles various error scenarios:
- Missing EXIF data
- Invalid file dates
- File access errors
- Invalid directories
- Unsupported file types

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Dependencies

- dayjs: Date formatting and manipulation
- exiftool-vendored: Reading EXIF metadata
- typescript: Type safety and compilation

## Dev Dependencies

- jest: Testing framework
- eslint: Code linting
- prettier: Code formatting
- ts-jest: TypeScript support for Jest
- other development tools

## Notes

- The utility preserves original files' extensions
- File system dates are used as fallback when EXIF data is unavailable
- All operations are synchronous to ensure proper file handling
