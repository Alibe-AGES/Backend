import { ApiProperty } from "@nestjs/swagger";
import { ResponseDto } from "./response-dto";

export class ProposalDto {
    @ApiProperty({ format: 'uuid' })
    id!: string;
    
    @ApiProperty()
    ownerId!: string;

    @ApiProperty()
    ownerName!: string;

    @ApiProperty()    
    ownerProfilePic!: string;
    
    @ApiProperty({ type: [ResponseDto] })
    responses!: Array<ResponseDto>;

    @ApiProperty()
    createdAt!: Date;
}