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
import { User, Client } from '../models';
import { UserRepository, Credentials } from '../repositories';
import { BcryptHasher } from '../services/hash.password'
import { HttpErrors } from '@loopback/rest';
import { authenticate, TokenService, UserService } from '@loopback/authentication';
import { inject } from '@loopback/context';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';
import { OPERATION_SECURITY_SPEC } from '../ultils/security-spec';
import { PasswordHasherBindings, TokenServiceBindings, UserServiceBindings } from '../services/key';
import resetPassword from '../services/mail'
import { AppResponse } from '../services/appresponse'
import { authorize } from '@loopback/authorization';
import { basicAuthorization } from '../services/basic.authorizor';
import admin from 'firebase-admin';


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

  @post('/users/register', {
    responses: {
      '200': {
        description: 'User model instance',
      },
    },
  })
  async register(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object'
          },
        },
      },
    })
    user: Omit<User, 'id'>,
  ): Promise<AppResponse> {
    //Validate Email
    if (!RegExp('^[a-z][a-z0-9_\.]{5,32}@[a-z0-9]{2,}(\.[a-z0-9]{2,4}){1,2}$').test(user.email)) {
      throw new AppResponse(400, 'Invalid email!');
    }
    // Validate Password Length
    if (!user.password || user.password.length < 6) {
      throw new AppResponse(400, 'Password must be minimum 6 characters!');

    }

    if (!user.typeUser && (!user.client || !user.client.name || !user.client.phone))
      throw new AppResponse(400, 'Missing field');

    //Hash password
    user.password = await this.bcryptHaser.hashPassword(
      user.password
    );

    //Check email is used
    let crruser = await this.userRepository.findOne({ where: { email: user.email } });
    if (crruser) {
      throw new AppResponse(400, 'Email is used!');
    }
    await this.userRepository.create(user);

    return new AppResponse(200, 'success');
  }

  @authenticate('jwt')
  @get('/users/me', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'About me',
      },
    },
  })
  async findMe(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    const userId = currentUserProfile[securityId];
    return new AppResponse(200, 'Success', await this.userRepository.findById(userId));
  }


  @authenticate('jwt')
  @post('/users/logout', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Logout',
      },
    },
  })
  async logout(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              firebase_token: { type: 'string' }
            }
          }
        },
      },
    }) data: { firebase_token: string }
  ): Promise<AppResponse> {
    const firebase_token = data.firebase_token;
    if (!firebase_token)
      throw new AppResponse(400, 'Missing firebase_token');
    let user = await this.userRepository.findById(currentUserProfile[securityId]);
    const authorization = this.request.headers.authorization + '';
    const token = authorization.substr(7, authorization.length - 7);
    if (user.token.indexOf(token) != -1)
      user.token.splice(user.token.indexOf(token), 1);
    if (user.firebase_token.indexOf(firebase_token) != -1)
      user.firebase_token.splice(user.firebase_token.indexOf(firebase_token), 1);
    await this.userRepository.update(user);
    return new AppResponse(200, 'Logout success');
  }

  @post('/users/forgotpassword', {
    responses: {
      '200': {
        description: 'Forgot password',
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
              email: { type: 'string' },
            },
          },
        },
      },
    }) crruser: { email: string }
  ): Promise<AppResponse> {
    let user = await this.userRepository.findOne({ where: { email: crruser.email } });
    if (!user)
      return new AppResponse(400, 'Not found your account');

    const password = '' + Math.floor(Math.random() * 1000000 + 1);
    user.password = await this.bcryptHaser.hashPassword(password);
    user.token = [];
    user.firebase_token = [];
    await this.userRepository.replaceById(user.id, user);

    //Mail
    // await resetPassword(user.email, password);

    return new AppResponse(200, 'A new password was sent via email, plase check your email!', { password });
  }


  @post('/users/login', {
    responses: {
      '200': {
        description: 'Login',
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
              firebase_token: { type: 'string' }
            }
          }
        },
      },
    }) credentials: Credentials,
  ): Promise<AppResponse> {
    let firebase_token: string = credentials.firebase_token;
    if (!firebase_token)
      throw new AppResponse(400, 'Missing firebase_token');
    delete credentials.firebase_token;
    const user = await this.userService.verifyCredentials(credentials);
    const userProfile = this.userService.convertToUserProfile(user);
    const token = await this.jwtService.generateToken(userProfile);
    if (user.token.indexOf(token) == -1)
      user.token.push(token);
    if (user.firebase_token.indexOf(firebase_token) == -1)
      user.firebase_token.push(firebase_token);
    await this.userRepository.replaceById(user.id, user);
    return new AppResponse(200, 'Login success', { token });
  }

  @authenticate('jwt')
  @post('/users/changepassword', {
    responses: {
      '200': {
        description: 'Change password',
      },
    },
  })
  async changepassword(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              oldPassword: { type: 'string' },
              newPassword: { type: 'string' },
              firebase_token: { type: 'string' }
            },
          },
        },
      },
    }) request: any,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    let user = await this.userRepository.findById(currentUserProfile[securityId]);
    if (!user) throw new AppResponse(400, 'Not found user');
    if (!request || !request.oldPassword || !request.newPassword || !request.firebase_token)
      throw new AppResponse(400, 'Required old password, new password and firebase token');
    let verifyFirebaseToken = true;
    admin.auth().verifyIdToken(request.firebase_token)
      .then(function (decodedToken) {
      }).catch(function (error) {
        verifyFirebaseToken = false;
      });
    if (!verifyFirebaseToken) throw new AppResponse(400, 'firebase_token not vaild');
    if (! await this.bcryptHaser.comparePassword(request.oldPassword, user.password))
      throw new AppResponse(400, 'your old password not vaild');
    user.password = await this.bcryptHaser.hashPassword(request.newPassword);
    user.token = [];
    const token = this.request.headers.authorization + '';
    user.token.push(token);
    user.firebase_token = [];
    user.firebase_token.push(request.firebase_token);
    await this.userRepository.update(user);
    return new AppResponse(200, 'change password success');
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Customer'],
    voters: [basicAuthorization],
  })
  @post('/users/update', {
    responses: {
      '200': {
        description: 'update user',
      },
    },
  })
  async updateUser(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Client)
        },
      },
    }) client: Client,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    let user = await this.userRepository.findById(currentUserProfile[securityId]);
    if (!user) throw new AppResponse(400, 'Not found user');
    if (!client || !client.name || !client.phone)
      throw new AppResponse(400, 'Required old name and phone');
    user.client = client;
    await this.userRepository.update(user);
    return new AppResponse(200, 'update user success', user);
  }
}
