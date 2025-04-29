import { FileService } from '../services/fileService';

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledWith(expected: any): R;
    }
  }
}

jest.mock('../services/fileService', () => {
  return {
    FileService: jest.fn(),
  };
});
