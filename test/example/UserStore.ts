import { IDType, ListModel, Input, validate } from '../../source';
import { client } from '../service';
import { UserModel, UserFilter } from './BaseModel';

export class UserStore extends ListModel<UserModel, UserFilter> {
    client = client;
    baseURI = 'user';

    protected async loadPage() {
        return { pageData: [] };
    }

    @validate()
    async updateOne(@Input() data: UserModel, id?: IDType) {
        return new UserModel();
    }

    @validate()
    getList(
        @Input() filter?: UserFilter,
        pageIndex?: number,
        pageSize?: number
    ) {
        return super.getList(filter, pageIndex, pageSize);
    }
}
