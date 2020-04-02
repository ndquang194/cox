import { DefaultCrudRepository, BelongsToAccessor, repository, HasManyRepositoryFactory } from '@loopback/repository';
import { User, Room, Coworking, CoworkingRelations } from '../models';
import { CoexdbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { UserRepository } from './user.repository';
import { RoomRepository } from './room.repository';

export class CoworkingRepository extends DefaultCrudRepository<
  Coworking,
  typeof Coworking.prototype.id,
  CoworkingRelations
  > {
  public readonly user: BelongsToAccessor<
    User,
    typeof Coworking.prototype.id
  >;
  public readonly rooms: HasManyRepositoryFactory<
    Room,
    typeof Coworking.prototype.id
  >;
  constructor(
    @inject('datasources.coexdb') dataSource: CoexdbDataSource,
    @repository.getter('UserRepository')
    protected userRepositoryGetter: Getter<UserRepository>,
    @repository.getter('RoomRepository')
    protected roomRepositoryGeter: Getter<RoomRepository>,
  ) {
    super(Coworking, dataSource);
    this.user = this.createBelongsToAccessorFor(
      'user',
      userRepositoryGetter,
    );
    this.registerInclusionResolver('user', this.user.inclusionResolver);
    this.rooms = this.createHasManyRepositoryFactoryFor(
      'rooms',
      roomRepositoryGeter,
    );
    this.registerInclusionResolver('rooms', this.rooms.inclusionResolver);
  }
}
