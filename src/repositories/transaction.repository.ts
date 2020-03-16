import {DefaultCrudRepository, repository, HasManyRepositoryFactory} from '@loopback/repository';
import {Transaction, TransactionRelations, Booking} from '../models';
import {CoexdbDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {BookingRepository} from './booking.repository';

export class TransactionRepository extends DefaultCrudRepository<
  Transaction,
  typeof Transaction.prototype.id,
  TransactionRelations
> {

  public readonly bookings: HasManyRepositoryFactory<Booking, typeof Transaction.prototype.id>;

  constructor(
    @inject('datasources.coexdb') dataSource: CoexdbDataSource, @repository.getter('BookingRepository') protected bookingRepositoryGetter: Getter<BookingRepository>,
  ) {
    super(Transaction, dataSource);
    this.bookings = this.createHasManyRepositoryFactoryFor('bookings', bookingRepositoryGetter,);
    this.registerInclusionResolver('bookings', this.bookings.inclusionResolver);
  }
}
