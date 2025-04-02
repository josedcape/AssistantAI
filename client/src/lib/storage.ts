
/**
 * Utility functions for storing project data in localStorage
 */

// Key prefix for all storage items
const STORAGE_PREFIX = 'devEditorApp_';

// Main storage functions
export const localStorageUtils = {
  /**
   * Save data to localStorage with the given key
   */
  saveData: <T>(key: string, data: T): void => {
    try {
      const storageKey = `${STORAGE_PREFIX}${key}`;
      const serializedData = JSON.stringify(data);
      localStorage.setItem(storageKey, serializedData);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  /**
   * Get data from localStorage by key
   */
  getData: <T>(key: string, defaultValue: T): T => {
    try {
      const storageKey = `${STORAGE_PREFIX}${key}`;
      const serializedData = localStorage.getItem(storageKey);
      if (serializedData === null) {
        return defaultValue;
      }
      return JSON.parse(serializedData) as T;
    } catch (error) {
      console.error('Error retrieving from localStorage:', error);
      return defaultValue;
    }
  },

  /**
   * Remove data from localStorage by key
   */
  removeData: (key: string): void => {
    try {
      const storageKey = `${STORAGE_PREFIX}${key}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },

  /**
   * Check if key exists in localStorage
   */
  hasData: (key: string): boolean => {
    try {
      const storageKey = `${STORAGE_PREFIX}${key}`;
      return localStorage.getItem(storageKey) !== null;
    } catch (error) {
      console.error('Error checking localStorage:', error);
      return false;
    }
  }
};

// Project-specific storage functions
export const projectStorage = {
  /**
   * Save project data
   */
  saveProject: (projectId: number, data: any): void => {
    localStorageUtils.saveData(`project_${projectId}`, data);
  },

  /**
   * Get project data
   */
  getProject: <T>(projectId: number, defaultValue: T): T => {
    return localStorageUtils.getData(`project_${projectId}`, defaultValue);
  },

  /**
   * Save file content
   */
  saveFileContent: (fileId: number, content: string): void => {
    localStorageUtils.saveData(`file_${fileId}`, content);
  },

  /**
   * Get file content
   */
  getFileContent: (fileId: number, defaultContent: string = ''): string => {
    return localStorageUtils.getData(`file_${fileId}`, defaultContent);
  },

  /**
   * Save last opened project ID
   */
  saveLastProjectId: (projectId: number): void => {
    localStorageUtils.saveData('lastProjectId', projectId);
  },

  /**
   * Get last opened project ID
   */
  getLastProjectId: (): number | null => {
    return localStorageUtils.getData('lastProjectId', null);
  }
};

export default projectStorage;
