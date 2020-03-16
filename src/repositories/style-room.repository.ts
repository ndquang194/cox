import { DefaultCrudRepository, BelongsToAccessor, repository, HasManyRepositoryFactory} from '@loopback/repository';
import { StyleRoom, StyleRoomRelations, Room, Booking} from '../models';
import { CoexdbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { RoomRepository } from './room.repository';
import {BookingRepository} from './booking.repository';

export class StyleRoomRepository extends DefaultCrudRepository<
  StyleRoom,
  typeof StyleRoom.prototype.id,
  StyleRoomRelations
  > {
  public readonly room: BelongsToAccessor<
    Room,
    typeof StyleRoom.prototype.id
  >;

  public readonly bookings: HasManyRepositoryFactory<Booking, typeof StyleRoom.prototype.id>;

  constructor(
    @inject('datasources.coexdb') dataSource: CoexdbDataSource,
    @repository.getter('RoomRepository')
    roomRepositoryGetter: Getter<RoomRepository>, @repository.getter('BookingRepository') protected bookingRepositoryGetter: Getter<BookingRepository>,
  ) {
    super(StyleRoom, dataSource);
    this.bookings = this.createHasManyRepositoryFactoryFor('bookings', bookingRepositoryGetter,);
    this.registerInclusionResolver('bookings', this.bookings.inclusionResolver);
    this.room = this.createBelongsToAccessorFor(
      'room',
      roomRepositoryGetter,
    );
    this.registerInclusionResolver('room', this.room.inclusionResolver);
  }
}
