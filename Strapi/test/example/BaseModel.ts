// Define by a Back-end project, and release as a Node.js or Deno package

import {
    IsBoolean,
    IsPositive,
    IsString,
    IsDateString,
    IsEmail,
    IsOptional
} from 'class-validator';

export class BaseModel {
    @IsPositive()
    @IsOptional()
    id?: number;

    @IsDateString()
    @IsOptional()
    createdAt?: string;

    @IsDateString()
    @IsOptional()
    updatedAt?: string;
}

export class UserModel extends BaseModel {
    @IsString()
    username!: string;

    @IsEmail()
    email!: string;

    @IsString()
    @IsOptional()
    provider?: string;

    @IsBoolean()
    @IsOptional()
    confirmed?: boolean;

    @IsBoolean()
    @IsOptional()
    blocked?: boolean;

    @IsOptional()
    role?: any;
}
