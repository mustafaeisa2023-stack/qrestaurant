import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('uploads')
@Controller('v1/uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('menu-item')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload menu item image' })
  @ApiConsumes('multipart/form-data')
  async uploadMenuItem(@UploadedFile() file: Express.Multer.File) {
    const url = await this.uploadsService.processMenuItemImage(file);
    return { url };
  }

  @Post('category')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload category image' })
  @ApiConsumes('multipart/form-data')
  async uploadCategory(@UploadedFile() file: Express.Multer.File) {
    const url = await this.uploadsService.processCategoryImage(file);
    return { url };
  }
}
