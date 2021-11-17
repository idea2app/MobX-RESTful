import { checkInput, Body, IDType } from 'mobx-restful';

import { StrapiStore } from '../../source';
import { UserModel, BaseModel } from './BaseModel';

export class UserStore extends StrapiStore<UserModel, BaseModel> {
    path = 'user';

    @checkInput()
    async updateOne(@Body() data: UserModel, id?: IDType) {
        return super.updateOne(data, id);
    }
}

export default new UserStore();
