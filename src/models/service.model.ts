import { Model, model, property } from '@loopback/repository';

@model()
export class Service extends Model {
  @property({
    type: 'boolean',
    required: true,
  })
  wifi: boolean;

  @property({
    type: 'boolean',
    required: true,
  })
  conversionCall: boolean;

  @property({
    type: 'boolean',
    required: true,
  })
  drink: boolean;

  @property({
    type: 'boolean',
    required: true,
  })
  printer: boolean;

  @property({
    type: 'boolean',
    required: true,
  })
  airConditioning: boolean;

  @property({
    type: 'array',
    itemType: 'string',
    default: [],
  })
  other: string[];

  constructor(data?: Partial<Service>) {
    super(data);
  }
}

export interface ServiceRelations {
  // describe navigational properties here
}

export type ServiceWithRelations = Service & ServiceRelations;
