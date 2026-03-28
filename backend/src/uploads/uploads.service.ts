// ============================================================
// QRestaurant - Uploads Service
// Image upload + optimization with sharp
// ============================================================

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import * as fs from 'fs/promises';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = join(process.cwd(), 'uploads');
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    const dirs = ['uploads/temp', 'uploads/menu', 'uploads/categories'];
    for (const dir of dirs) {
      await fs.mkdir(join(process.cwd(), dir), { recursive: true });
    }
  }

  // ─── PROCESS MENU ITEM IMAGE ──────────────────────────────
  async processMenuItemImage(file: Express.Multer.File): Promise<string> {
    if (!file) throw new BadRequestException('No file uploaded');

    const filename = `${uuidv4()}.webp`;
    const outputPath = join(this.uploadDir, 'menu', filename);

    try {
      await sharp(file.path)
        .resize(800, 600, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 85 })
        .toFile(outputPath);

      // Delete temp file
      await fs.unlink(file.path).catch(() => {});

      const baseUrl = this.config.get('BACKEND_URL', 'http://localhost:4000');
      const url = `${baseUrl}/uploads/menu/${filename}`;
      this.logger.log(`Image processed: ${url}`);
      return url;
    } catch (error) {
      await fs.unlink(file.path).catch(() => {});
      throw new BadRequestException('Image processing failed');
    }
  }

  // ─── PROCESS CATEGORY IMAGE ───────────────────────────────
  async processCategoryImage(file: Express.Multer.File): Promise<string> {
    if (!file) throw new BadRequestException('No file uploaded');

    const filename = `${uuidv4()}.webp`;
    const outputPath = join(this.uploadDir, 'categories', filename);

    try {
      await sharp(file.path)
        .resize(400, 300, { fit: 'cover', position: 'center' })
        .webp({ quality: 85 })
        .toFile(outputPath);

      await fs.unlink(file.path).catch(() => {});

      const baseUrl = this.config.get('BACKEND_URL', 'http://localhost:4000');
      return `${baseUrl}/uploads/categories/${filename}`;
    } catch (error) {
      await fs.unlink(file.path).catch(() => {});
      throw new BadRequestException('Image processing failed');
    }
  }

  // ─── DELETE IMAGE ─────────────────────────────────────────
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      const baseUrl = this.config.get('BACKEND_URL', 'http://localhost:4000');
      const relativePath = imageUrl.replace(baseUrl, '');
      const fullPath = join(process.cwd(), relativePath);
      await fs.unlink(fullPath);
    } catch (error) {
      this.logger.warn(`Could not delete image: ${imageUrl}`);
    }
  }
}
