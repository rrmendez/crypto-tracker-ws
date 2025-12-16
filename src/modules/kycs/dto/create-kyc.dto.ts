import {
  KycDocumentIdPfTypeEnum,
  KycDocumentIdPjTypeEnum,
  KycPhotoTypeEnum,
} from '@/common/enums/kyc-type-enum';
import { ApiProperty } from '@nestjs/swagger';

export class KycDocumentDto {
  @ApiProperty({
    description: 'Archivo del documento',
    type: 'string',
    format: 'binary',
  })
  file: any;

  @ApiProperty({
    description: 'Tipo de documento',
    enum: {
      ...KycDocumentIdPfTypeEnum,
      ...KycDocumentIdPjTypeEnum,
      ...KycPhotoTypeEnum,
    },
  })
  type: KycDocumentIdPfTypeEnum | KycDocumentIdPjTypeEnum | KycPhotoTypeEnum;

  @ApiProperty({ description: 'Descripción del archivo', required: false })
  description?: string;
}

// -----------------------------------------------------------------------------

export class CreateKycDto {
  @ApiProperty({ description: 'ID del kyc que se está validando' })
  kycId: string;

  @ApiProperty({
    type: [KycDocumentDto],
    description: 'Archivos de la kyc',
  })
  documents: KycDocumentDto[];
}
