import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateLanguageDto {
  @ApiProperty({
    example: 'pt',
  })
  @IsEnum(['pt', 'en', 'es'])
  @IsNotEmpty()
  lang: string;
}
