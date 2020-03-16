import { DefaultCrudRepository, BelongsToAccessor, repository, HasManyRepositoryFactory } from '@loopback/repository';
import { Room, RoomRelations, User, StyleRoom } from '../models';
import { CoexdbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { UserRepository } from './user.repository';
import { StyleRoomRepository } from './style-room.repository';

export class RoomRepository extends DefaultCrudRepository<
  Room,
  typeof Room.prototype.id,
  RoomRelations
  > {
  public readonly user: BelongsToAccessor<
    User,
    typeof Room.prototype.id
  >;
  public readonly styleRooms: HasManyRepositoryFactory<
    StyleRoom,
    typeof Room.prototype.id
  >;
  constructor(
    @inject('datasources.coexdb') dataSource: CoexdbDataSource,
    @repository.getter('UserRepository')
    protected userRepositoryGetter: Getter<UserRepository>,
    @repository.getter('StyleRoomRepository')
    protected styleRoomRepositoryGeter: Getter<StyleRoomRepository>,
  ) {
    super(Room, dataSource);
    this.user = this.createBelongsToAccessorFor(
      'user',
      userRepositoryGetter,
    );
    this.registerInclusionResolver('user', this.user.inclusionResolver);
    this.styleRooms = this.createHasManyRepositoryFactoryFor(
      'styleRooms',
      styleRoomRepositoryGeter,
    );
    this.registerInclusionResolver('styleRooms', this.styleRooms.inclusionResolver);
  }
}
