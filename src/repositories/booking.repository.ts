import { DefaultCrudRepository, BelongsToAccessor, repository } from '@loopback/repository';
import { Booking, BookingRelations, Transaction } from '../models';
import { CoexdbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { TransactionRepository } from './transaction.repository';

export class BookingRepository extends DefaultCrudRepository<
  Booking,
  typeof Booking.prototype.id,
  BookingRelations
  > {
  public readonly transaction: BelongsToAccessor<
    Transaction,
    typeof Booking.prototype.id
  >;
  constructor(
    @inject('datasources.coexdb') dataSource: CoexdbDataSource,
    @repository.getter('TransactionRepository')
    protected transactionRepositoryGetter: Getter<TransactionRepository>,
  ) {
    super(Booking, dataSource);
    this.transaction = this.createBelongsToAccessorFor(
      'transaction',
      transactionRepositoryGetter,
    );
    this.registerInclusionResolver('transaction', this.transaction.inclusionResolver);
  }
}
