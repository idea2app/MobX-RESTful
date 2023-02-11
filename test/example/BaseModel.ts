// Define by a Back-end project, and release as a Node.js or Deno package

import {
    IsPositive,
    IsString,
    IsDateString,
    IsEmail,
    IsOptional
} from 'class-validator';

import { Filter } from '../../source';

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
    username: string;

    @IsEmail()
    email: string;
}

export class UserFilter implements Filter<Omit<UserModel, keyof BaseModel>> {
    @IsString()
    @IsOptional()
    username?: string;

    @IsString()
    @IsOptional()
    email?: string;
}
