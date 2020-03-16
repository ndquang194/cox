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
import { User } from '../models';
import { UserRepository, Credentials } from '../repositories';
import { BcryptHasher } from '../services/hash.password'
import { HttpErrors } from '@loopback/rest';
import { authenticate, TokenService, UserService } from '@loopback/authentication';
import { inject } from '@loopback/context';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';
import { OPERATION_SECURITY_SPEC } from '../ultils/security-spec';
import { PasswordHasherBindings, TokenServiceBindings, UserServiceBindings } from '../services/key';
import resetPassword from '../services/mail'
import { authorize } from '@loopback/authorization';
import { basicAuthorization } from '../services/basic.authorizor';
const loopback = require('loopback');

export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public bcryptHaser: BcryptHasher,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: UserService<User, Credentials>,
    @inject(RestBindings.Http.REQUEST) private request: Request,
  ) { }

  @post('/users', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(User, {
            title: 'NewUser',
            exclude: ['id', 'name', 'phone', 'token'],
          }),
        },
      },
    })
    user: Omit<User, 'id'>,
  ): Promise<{ message: string }> {

    //Validate Email
    if (!RegExp('^[a-z][a-z0-9_\.]{5,32}@[a-z0-9]{2,}(\.[a-z0-9]{2,4}){1,2}$').test(user.email)) {
      throw new HttpErrors.UnprocessableEntity('Invalid email!');
    }

    // Validate Password Length
    if (!user.password || user.password.length < 6) {
      throw new HttpErrors.UnprocessableEntity(
        'Password must be minimum 6 characters!',
      );
    }

    //Hash password
    user.password = await this.bcryptHaser.hashPassword(
      user.password
    );

    //Check email is used
    let crruser = await this.userRepository.findOne({ where: { email: user.email } });
    if (crruser) {
      throw new HttpErrors.NotAcceptable('Email is used!');
    }

    await this.userRepository.create(user);

    return { message: 'Register success' };
  }

  @get('/users', {
    responses: {
      '200': {
        description: 'Array of User model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(User, { includeRelations: true }),
            },
          },
        },
      },
    },
  })
  async find(
    @param.query.object('filter', getFilterSchemaFor(User)) filter?: Filter<User>,
  ): Promise<any[]> {
    if (!filter || !filter.where) throw new HttpErrors.NotAcceptable();
    const where: any = filter.where;
    const location = new loopback.GeoPoint(where.location.near);
    let users = await this.userRepository.find(filter);
    users.forEach(element => {
      element.distance = loopback.GeoPoint.distanceBetween(location, new loopback.GeoPoint(element.location), { type: 'kilometers' });
    });
    return users;
  }

  @authenticate('jwt')
  @get('/users/me', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'About me',
        content: {
          'application/json': {
            schema: getModelSchemaRef(User),
          },
        },
      },
    },
  })
  async findMe(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<User> {
    const userId = currentUserProfile[securityId];
    return this.userRepository.findById(userId);
  }


  @authenticate('jwt')
  @get('/users/logout', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Logout',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              },
            },
          },
        },
      },
    },
  })
  async logout(@inject(SecurityBindings.USER)
  currentUserProfile: UserProfile): Promise<{}> {
    currentUserProfile.id = currentUserProfile[securityId];

    let user = await this.userRepository.findById(currentUserProfile.id);
    const token = this.request.headers.authorization + '';
    //delete store token
    user.token.splice(user.token.indexOf(token), 1);
    await this.userRepository.replaceById(user.id, user);
    const message = 'Logout success';
    return { message };
  }

  @post('/users/forgotpassword', {
    responses: {
      '200': {
        description: 'Forgot password',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              },
            },
          },
        },
      },
    },
  })
  async forgotPassword(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string' }
            }
          }
        },
      },
    }) crruser: { email: string }
  ): Promise<{}> {
    const message = 'A new password was sent via email, plase check your email!';

    let user = await this.userRepository.findOne({ where: { email: crruser.email } });
    if (!user) {
      throw new HttpErrors.NotFound('Not found your account');
    }

    const password = '' + Math.floor(Math.random() * 1000000 + 1);
    user.password = await this.bcryptHaser.hashPassword(
      password
    );
    user.token = [];
    await this.userRepository.replaceById(user.id, user);
    await resetPassword(user.email, password);

    return { message };
  }


  @post('/users/login', {
    responses: {
      '200': {
        description: 'Login',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              password: { type: 'string' },
            }
          }
        },
      },
    }) credentials: Credentials,
  ): Promise<{}> {
    const user = await this.userService.verifyCredentials(credentials);
    const userProfile = this.userService.convertToUserProfile(user);
    const token = await this.jwtService.generateToken(userProfile);
    user.token.push(token);
    await this.userRepository.replaceById(user.id, user);
    return { token };
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Admin'],
    voters: [basicAuthorization],
  })

  @get('/users/{id}', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(User, { includeRelations: true }),
          },
        },
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.query.object('filter', getFilterSchemaFor(User)) filter?: Filter<User>
  ): Promise<User> {
    return this.userRepository.findById(id, filter);
  }

  @put('/users/{id}', {
    responses: {
      '204': {
        description: 'User PUT success',
      },
    },
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() user: User,
  ): Promise<void> {
    await this.userRepository.replaceById(id, user);
  }

  @del('/users/{id}', {
    responses: {
      '204': {
        description: 'User DELETE success',
      },
    },
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.userRepository.deleteById(id);
  }
}
