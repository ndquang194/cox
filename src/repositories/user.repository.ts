import { DefaultCrudRepository, HasManyRepositoryFactory, repository } from '@loopback/repository';
import { User, UserRelations, Room, Booking, Transaction} from '../models';
import { CoexdbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { RoomRepository } from './room.repository';
import {BookingRepository} from './booking.repository';
import {TransactionRepository} from './transaction.repository';

export type Credentials = {
  email: string;
  password: string;
};

export class UserRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.id,
  UserRelations
  > {
  public readonly rooms: HasManyRepositoryFactory<
    Room,
    typeof User.prototype.id
  >;

  public readonly bookings: HasManyRepositoryFactory<Booking, typeof User.prototype.id>;

  public readonly transactions: HasManyRepositoryFactory<Transaction, typeof User.prototype.id>;

  constructor(
    @inject('datasources.coexdb') dataSource: CoexdbDataSource,
    @repository.getter('RoomRepository')
    getRoomRepository: Getter<RoomRepository>, @repository.getter('BookingRepository') protected bookingRepositoryGetter: Getter<BookingRepository>, @repository.getter('TransactionRepository') protected transactionRepositoryGetter: Getter<TransactionRepository>,
  ) {
    super(User, dataSource);
    this.transactions = this.createHasManyRepositoryFactoryFor('transactions', transactionRepositoryGetter,);
    this.registerInclusionResolver('transactions', this.transactions.inclusionResolver);
    this.bookings = this.createHasManyRepositoryFactoryFor('bookings', bookingRepositoryGetter,);
    this.registerInclusionResolver('bookings', this.bookings.inclusionResolver);
    this.rooms = this.createHasManyRepositoryFactoryFor(
      'rooms',
      getRoomRepository,
    );
    this.registerInclusionResolver('rooms', this.rooms.inclusionResolver);
  }
}
