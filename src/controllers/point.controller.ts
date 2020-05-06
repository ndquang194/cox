import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
  model,
  property,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getFilterSchemaFor,
  getModelSchemaRef,
  getWhereSchemaFor,
  patch,
  put,
  del,
  requestBody,
  Request,
  RestBindings
} from '@loopback/rest';
import { UserRepository, Credentials } from '../repositories';
import { inject } from '@loopback/core';
import { TokenService, UserService, authenticate } from '@loopback/authentication';
import { UserServiceBindings, CoinServer, TokenServiceBindings, PointToCoin } from '../services/key';
import { User, Card } from '../models';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';
import { AppResponse } from '../services/appresponse';
import { authorize } from '@loopback/authorization';
import { basicAuthorization } from '../services/basic.authorizor';
import Axios from 'axios';

export class PointController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: UserService<User, Credentials>,
    @inject(RestBindings.Http.REQUEST) private request: Request) {

  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Customer'],
    voters: [basicAuthorization],
  })
  @post('/point/exchangeCoin', {
    responses: {
      '200': {
        description: 'Exchange coin',
      },
    },
  })
  async exchangeCoin(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['point'],
            properties: {
              point: { type: 'number' },
            },
          },
        },
      },
    }) request: { point: number }
  ): Promise<AppResponse> {
    let user = await this.userRepository.findById(currentUserProfile[securityId]);
    if (!user.point || !request.point || request.point <= 0 || request.point % 1 != 0)
      throw new AppResponse(400, 'Error point');
    if (user.point < request.point)
      throw new AppResponse(400, 'Not enough point');
    let coin = request.point / PointToCoin;
    const form = new URLSearchParams();
    form.append('email', user.email);
    form.append('coin', coin + '');
    const res = (await Axios.post(`${CoinServer}/addCoin`, form)).data;
    if (res && res.coin != undefined && res.updatedAt != undefined) {
      user.point -= request.point;
      let date = new Date();
      user.list_exchange_point?.push({ createAt: date, point: -request.point })
      user.coin = res.coin;
      user.list_exchange_coin?.push({ createAt: date, coin: coin });
      this.userRepository.update(user);
      return new AppResponse(200, 'Success', { point: user.point, coin: user.coin });
    } else {
      throw new AppResponse(400, 'Cannot exchange coin');
    }
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Customer'],
    voters: [basicAuthorization],
  })
  @post('/point/withdraw', {
    responses: {
      '200': {
        description: 'Exchange coin',
      },
    },
  })
  async withdraw(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['coin', 'address'],
            properties: {
              coin: { type: 'number' },
              address: { type: 'string' }
            },
          },
        },
      },
    }) request: { coin: number, address: string }
  ): Promise<AppResponse> {
    let user: User = await this.userRepository.findById(currentUserProfile[securityId]);
    const coin: any = await this.getCoin(user);
    if (!request.address)
      throw new AppResponse(400, 'address not found');
    if (!coin || !user.coin || !request.coin || request.coin <= 0)
      throw new AppResponse(400, 'Error coin');
    if (coin < request.coin)
      throw new AppResponse(400, 'Not enough point');
    const form = new URLSearchParams();
    form.append('email', user.email);
    form.append('coin', request.coin + '');
    form.append('address', request.address);
    const res = (await Axios.post(`${CoinServer}/withdrawEth`, form)).data;
    if (res && res.status == 'done' && res.transaction_hash) {
      user.coin -= request.coin;
      user.list_exchange_coin?.push({ transaction_hash: res.transaction_hash, createAt: new Date(), coin: -request.coin });
      this.userRepository.update(user);
      return new AppResponse(200, 'Success', { transaction_hash: res.transaction_hash });
    } else {
      throw new AppResponse(400, 'Cannot withdraw coin');
    }
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Customer'],
    voters: [basicAuthorization],
  })
  @post('/cards/add', {
    responses: {
      '200': {
        description: 'Add card',
      },
    },
  })
  async addCart(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Card)
        },
      },
    }) card: Card
  ): Promise<AppResponse> {
    if (!card.name || card.name == '' || !card.address || card.address == '')
      throw new AppResponse(400, "Missing field!");
    let user = await this.userRepository.findById(currentUserProfile[securityId]);
    const index = user.listCard.findIndex(e => e.name == card.name);
    if (index != -1)
      throw new AppResponse(400, "Card name was used");
    user.listCard.push(card);
    await this.userRepository.update(user);
    return new AppResponse(200, 'Success', user.listCard);
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Customer'],
    voters: [basicAuthorization],
  })
  @del('/cards/{name}', {
    responses: {
      '200': {
        description: 'Del card',
      },
    },
  })
  async delCardByName(
    @param.path.string('name') name: string,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    let user = await this.userRepository.findById(currentUserProfile[securityId]);
    const index = user.listCard.findIndex(e => e.name == name);
    if (index == -1)
      throw new AppResponse(404, "Not found your card");
    user.listCard.splice(index, 1);
    await this.userRepository.update(user);
    return new AppResponse(200, 'Success', user.listCard);
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Customer'],
    voters: [basicAuthorization],
  })
  @patch('/cards/{name}', {
    responses: {
      '200': {
        description: 'Edit card',
      },
    },
  })
  async editCart(
    @param.path.string('name') name: string,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" }
            }
          }
        },
      },
    }) card: any
  ): Promise<AppResponse> {
    if (!card.name || card.name == '')
      throw new AppResponse(400, "Missing field!");
    let user = await this.userRepository.findById(currentUserProfile[securityId]);
    const index = user.listCard.findIndex(e => e.name == name);
    if (index == -1)
      throw new AppResponse(404, "Not found your card");
    user.listCard[index].name = card.name;
    await this.userRepository.update(user);
    return new AppResponse(200, 'Success', user.listCard[index]);
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Customer'],
    voters: [basicAuthorization],
  })
  @get('/cards', {
    responses: {
      '200': {
        description: 'Get card',
      },
    },
  })
  async getCart(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    let user = await this.userRepository.findById(currentUserProfile[securityId]);
    return new AppResponse(200, 'Success', user.listCard);
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Customer'],
    voters: [basicAuthorization],
  })
  @get('point/history', {
    responses: {
      '200': {
        description: 'Get history',
      },
    },
  })
  async history(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    let user = await this.userRepository.findById(currentUserProfile[securityId]);
    return new AppResponse(200, 'Success', { list_exchange_coin: user.list_exchange_coin, list_exchange_point: user.list_exchange_point });
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Customer'],
    voters: [basicAuthorization],
  })
  @get('/point', {
    responses: {
      '200': {
        description: 'Get point and coin',
      },
    },
  })
  async getPoint(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    let user = await this.userRepository.findById(currentUserProfile[securityId]);
    return new AppResponse(200, 'Success', { current_point: user.point });
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Customer'],
    voters: [basicAuthorization],
  })
  @get('/coin', {
    responses: {
      '200': {
        description: 'Get coin',
      },
    },
  })
  async getMyCoin(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    let user = await this.userRepository.findById(currentUserProfile[securityId]);
    const coin = await this.getCoin(user);
    user.coin = coin;
    return new AppResponse(200, 'Success', { current_coin: user.coin });
  }

  async getCoin(user: any) {
    const res = (await Axios.get(`${CoinServer}/getCoin`, { data: { email: user.email } })).data;
    if (res != undefined && res.coin != undefined) {
      if (res.coin != user.coin) {
        user.coin = res.coin;
        await this.userRepository.update(user);
      }
      return user.coin;
    } else {
      throw new AppResponse(400, 'Cannot get coin');
    }
  }
}
