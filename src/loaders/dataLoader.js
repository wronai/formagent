const fs = require('fs').promises;
const path = require('path');

class DataLoader {
  constructor(basePath = './in') {
    this.basePath = basePath;
    this.cache = new Map();
  }

  async loadData(type) {
    if (this.cache.has(type)) {
      return this.cache.get(type);
    }

    try {
      const dirPath = path.join(this.basePath, type);
      const files = await fs.readdir(dirPath);
      
      const data = await Promise.all(
        files.map(async (file) => {
          const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
          return {
            filename: file,
            content,
            type: path.extname(file).substring(1)
          };
        })
      );

      this.cache.set(type, data);
      return data;
    } catch (error) {
      console.warn(`Error loading ${type} data:`, error.message);
      return [];
    }
  }

  async getAllData() {
    const types = ['personal', 'education', 'experience', 'skills', 'documents'];
    const result = {};
    
    for (const type of types) {
      result[type] = await this.loadData(type);
    }
    
    return result;
  }
}

module.exports = DataLoader;
