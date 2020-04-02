import { DefaultCrudRepository, repository, HasManyRepositoryFactory, BelongsToAccessor } from '@loopback/repository';
import { Transaction, TransactionRelations, Booking, User, Room } from '../models';
import { CoexdbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { BookingRepository } from './booking.repository';
import { UserRepository } from '.';
import { RoomRepository } from './room.repository';

export class TransactionRepository extends DefaultCrudRepository<
  Transaction,
  typeof Transaction.prototype.id,
  TransactionRelations
  > {

  public readonly bookings: HasManyRepositoryFactory<Booking, typeof Transaction.prototype.id>;
  public readonly user: BelongsToAccessor<User, typeof Transaction.prototype.id>;
  public readonly room: BelongsToAccessor<Room, typeof Transaction.prototype.id>;
  constructor(
    @inject('datasources.coexdb') dataSource: CoexdbDataSource,
    @repository.getter('BookingRepository')
    protected bookingRepositoryGetter: Getter<BookingRepository>,
    @repository.getter('UserRepository')
    protected userRepositoryGetter: Getter<UserRepository>,
    @repository.getter('RoomRepository')
    protected roomRepositoryGetter: Getter<RoomRepository>,
  ) {
    super(Transaction, dataSource);
    this.bookings = this.createHasManyRepositoryFactoryFor('bookings', bookingRepositoryGetter);
    this.registerInclusionResolver('bookings', this.bookings.inclusionResolver);
    this.user = this.createBelongsToAccessorFor('user', userRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
    this.room = this.createBelongsToAccessorFor('room', roomRepositoryGetter);
    this.registerInclusionResolver('room', this.room.inclusionResolver);
  }
}
