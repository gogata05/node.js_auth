import userModel from '../../../models/userModel';
import * as authService from '../../../services/authService.js';
import { generateTokens } from '../../../utils/jwt.js';
import * as emailService from '../../../services/emailService.js';
import { verifyRefreshToken } from '../../../utils/jwt.js';

// Mock mongoose
jest.mock('mongoose', () => ({
  Schema: jest.fn().mockReturnValue({
    pre: jest.fn().mockReturnThis(),
    methods: {},
  }),
  model: jest.fn().mockReturnValue({
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  }),
  ...jest.requireActual('mongoose'),
}));

// Mock dependencies
jest.mock('../../../models/userModel.js', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    populate: jest.fn(),
    lean: jest.fn(),
  },
}));
jest.mock('../../../utils/jwt.js');
jest.mock('../../../services/emailService.js');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const mockUserData = {
      fullName: 'Test User',
      email: 'test@test.com',
      password: '123456',
    };

    it('should register a new user successfully', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);
      userModel.create.mockResolvedValue({ ...mockUserData, _id: 'testId' });

      // Act
      const result = await authService.register(mockUserData.fullName, mockUserData.email, mockUserData.password);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ email: mockUserData.email });
      expect(userModel.create).toHaveBeenCalledWith(mockUserData);
      expect(result).toEqual({ ...mockUserData, _id: 'testId' });
    });

    it('should throw an error when existing email is provided', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue({ email: mockUserData.email });

      // Act & Assert
      await expect(
        authService.register(mockUserData.fullName, mockUserData.email, mockUserData.password),
      ).rejects.toThrow('Email already registered!');
    });
  });

  describe('login', () => {
    const mockUser = {
      _id: 'testId',
      email: 'test@test.com',
      password: 'hashedPassword',
      comparePassword: jest.fn(),
      isEmailVerified: true,
      save: jest.fn(),
    };

    const mockTokens = {
      accessToken: 'mockAccessToken',
      refreshToken: 'mockRefreshToken',
    };

    beforeEach(() => {
      generateTokens.mockReturnValue(mockTokens);
    });

    it('should log in user successfully', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);

      // Act
      const result = await authService.login(mockUser.email, 'password123');

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ email: mockUser.email });
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(generateTokens).toHaveBeenCalledWith(mockUser._id);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        user: mockUser,
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      });
    });

    it('should throw an error when invalid email is provided', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login('invalid@test.com', 'password123')).rejects.toThrow('Invalid email or password!');
    });

    it('should throw an error when invalid password is provided', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(mockUser.email, 'wrongpassword')).rejects.toThrow('Invalid email or password!');
    });

    it('should throw an error when unverified email is provided', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue({ ...mockUser, isEmailVerified: false });

      // Act & Assert
      await expect(authService.login(mockUser.email, 'password123')).rejects.toThrow(
        'Please verify your email before logging in!',
      );
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      // Arrange
      const mockRefreshToken = 'validRefreshToken';
      const mockUser = {
        _id: 'userId',
        refreshToken: mockRefreshToken,
        save: jest.fn(),
      };

      verifyRefreshToken.mockReturnValue({ userId: mockUser._id });
      userModel.findById.mockResolvedValue(mockUser);

      // Act
      const result = await authService.refresh(mockRefreshToken);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('getUserById', () => {
    it('should return user when valid ID is provided', async () => {
      // Arrange
      const mockUser = { _id: 'testId', fullName: 'Test User' };
      userModel.findById.mockResolvedValue(mockUser);

      // Act
      const result = await authService.getUserById('testId');

      // Assert
      expect(result).toEqual(mockUser);
      expect(userModel.findById).toHaveBeenCalledWith('testId');
    });

    it('should throw an error when invalid ID is provided', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.getUserById('invalidId')).rejects.toThrow('User not found!');
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      // Arrange
      const mockUser = { _id: 'testId', refreshToken: 'refreshToken', save: jest.fn() };
      userModel.findById.mockResolvedValue(mockUser);

      // Act
      await authService.logout('testId');

      // Assert
      expect(mockUser.refreshToken).toBeNull();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw an error when user is not found', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.logout('invalidId')).rejects.toThrow('User not found!');
    });
  });

  describe('getAllUsers', () => {
    it('should return all users without sensitive data', async () => {
      // Arrange
      const mockUsers = [
        {
          _id: 'user1',
          fullName: 'User One',
          email: 'user1@test.com',
          password: 'hashedPassword1',
          refreshToken: 'token1',
          googleId: 'googleId1',
        },
        {
          _id: 'user2',
          fullName: 'User Two',
          email: 'user2@test.com',
          password: 'hashedPassword2',
          refreshToken: 'token2',
          googleId: 'googleId2',
        },
      ];

      userModel.find.mockResolvedValue(mockUsers);

      // Act
      const result = await authService.getAllUsers();

      // Assert
      expect(result).toEqual(mockUsers);
    });
  });

  describe('getUserDetails', () => {
    it('should return user details without sensitive data', async () => {
      // Arrange
      const mockUser = {
        _id: 'testId',
        fullName: 'Test User',
        email: 'test@test.com',
        city: 'Test City',
        years: 30,
        phone: '1234567890',
        role: 'parent',
        parent: null,
        kids: [],
        created_at: new Date('2025-01-14T07:02:30.688Z'),
        updated_at: new Date('2025-01-14T07:02:30.688Z'),
      };

      userModel.findById = jest.fn().mockImplementation(() => ({
        populate: () => ({ lean: jest.fn().mockReturnValue(mockUser) }),
      }));

      // Act
      const result = await authService.getUserDetails('testId');

      // Assert
      expect(result).toEqual({
        ...mockUser,
        createdAt: mockUser.created_at,
        updatedAt: mockUser.updated_at,
        isActive: true,
      });
    });

    it('should throw an error when user is not found', async () => {
      // Arrange
      userModel.findById = jest.fn().mockImplementation(() => ({
        populate: () => ({ lean: jest.fn().mockResolvedValue(null) }),
      }));

      // Act & Assert
      await expect(authService.getUserDetails('invalidId')).rejects.toThrow('User not found!');
    });
  });

  describe('changePassword', () => {
    const mockUser = {
      _id: 'testId',
      comparePassword: jest.fn(),
      save: jest.fn(),
    };

    it('should change password successfully', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);

      // Act
      const result = await authService.changePassword('testId', 'currentPassword', 'newPassword');

      // Assert
      expect(result).toBe(true);
      expect(mockUser.password).toBe('newPassword');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw an error when user is not found', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.changePassword('invalidId', 'currentPassword', 'newPassword')).rejects.toThrow(
        'User not found!',
      );
    });

    it('should throw an error when current password is incorrect', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(false);

      // Act & Assert
      await expect(authService.changePassword('testId', 'wrongPassword', 'newPassword')).rejects.toThrow(
        'Current password is incorrect!',
      );
    });

    it('should throw an error when new password is the same as current password', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);

      // Act & Assert
      await expect(authService.changePassword('testId', 'samePassword', 'samePassword')).rejects.toThrow(
        'New password must be different from the current one!',
      );
    });
  });

  describe('updateProfile', () => {
    const mockUser = {
      _id: 'testId',
      fullName: 'Old Name',
      email: 'old@test.com',
      city: 'Old City',
      years: 25,
      phone: '1234567890',
      isEmailVerified: true,
      generateEmailVerificationToken: jest.fn().mockReturnValue('newToken'),
      save: jest.fn(),
    };

    it('should update profile successfully', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(mockUser);
      userModel.findOne.mockResolvedValue(null);

      const profileData = {
        fullName: 'New Name',
        email: 'new@test.com',
        city: 'New City',
        years: 30,
        phone: '0987654321',
      };

      // Act
      const result = await authService.updateProfile('testId', profileData);

      // Assert
      expect(result).toEqual({
        _id: 'testId',
        fullName: 'New Name',
        email: 'new@test.com',
        city: 'New City',
        years: 30,
        phone: '0987654321',
        isEmailVerified: false,
      });
      expect(mockUser.save).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith('new@test.com', 'newToken');
    });

    it('should throw an error when user is not found', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.updateProfile('invalidId', {})).rejects.toThrow('User not found!');
    });

    it('should throw an error when name is invalid', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.updateProfile('testId', { fullName: 'A' })).rejects.toThrow('Invalid name!');
    });

    it('should throw an error when city is invalid', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        authService.updateProfile('testId', {
          fullName: 'Valid Name',
          city: 'B',
          years: 30,
        }),
      ).rejects.toThrow('Invalid city!');
    });

    it('should throw an error when years are invalid', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        authService.updateProfile('testId', {
          fullName: 'Valid Name',
          city: 'Valid City',
          years: 0,
        }),
      ).rejects.toThrow('Invalid years!');
    });

    it('should throw an error when email is already taken', async () => {
      // Arrange
      const mockUser = {
        _id: 'testId',
        fullName: 'Valid Name',
        email: 'old@test.com',
        city: 'Valid City',
        years: 30,
        save: jest.fn(),
      };

      userModel.findById.mockResolvedValue(mockUser);
      userModel.findOne.mockResolvedValue({ email: 'new@test.com' });

      // Act & Assert
      await expect(
        authService.updateProfile('testId', {
          fullName: 'Valid Name',
          email: 'new@test.com',
          city: 'Valid City',
          years: 30,
        }),
      ).rejects.toThrow('Email already taken!');
    });
  });

  describe('createUser', () => {
    const newUserData = {
      fullName: 'New User',
      email: 'newuser@test.com',
      password: 'password123',
      city: 'New City',
      years: 28,
    };

    it('should create a new user successfully', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);
      userModel.create.mockResolvedValue({ ...newUserData, _id: 'newUserId' });

      // Act
      const result = await authService.createUser(newUserData);

      // Assert
      expect(result).toEqual({ ...newUserData, _id: 'newUserId' });
      expect(userModel.create).toHaveBeenCalledWith(newUserData);
    });

    it('should throw an error when email is already registered', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue({ email: newUserData.email });

      // Act & Assert
      await expect(authService.createUser(newUserData)).rejects.toThrow('Email already registered!');
    });
  });

  describe('changeKidPassword', () => {
    const mockParent = {
      _id: 'parentId',
      comparePassword: jest.fn(),
    };

    const mockKid = {
      _id: 'kidId',
      role: 'kid',
      save: jest.fn(),
    };

    it('should change kid password successfully', async () => {
      // Arrange
      userModel.findById.mockImplementation((id) => {
        if (id === 'parentId') return Promise.resolve(mockParent);
        if (id === 'kidId') return Promise.resolve(mockKid);
        return Promise.resolve(null);
      });
      mockParent.comparePassword.mockResolvedValue(true);

      // Act
      const result = await authService.changeKidPassword('parentId', 'kidId', 'parentPassword', 'newKidPassword');

      // Assert
      expect(result).toBe(true);
      expect(mockKid.password).toBe('newKidPassword');
    });
  });
  describe('changeKidPassword', () => {
    const mockParent = {
      _id: 'parentId',
      comparePassword: jest.fn(),
    };

    const mockKid = {
      _id: 'kidId',
      role: 'kid',
      save: jest.fn(),
    };

    it('should change kid password successfully', async () => {
      // Arrange
      userModel.findById.mockImplementation((id) => {
        if (id === 'parentId') return Promise.resolve(mockParent);
        if (id === 'kidId') return Promise.resolve(mockKid);
        return Promise.resolve(null);
      });
      mockParent.comparePassword.mockResolvedValue(true);

      // Act
      const result = await authService.changeKidPassword('parentId', 'kidId', 'parentPassword', 'newKidPassword');

      // Assert
      expect(result).toBe(true);
      expect(mockKid.password).toBe('newKidPassword');
      expect(mockKid.save).toHaveBeenCalled();
    });

    it('should throw an error when parent is not found', async () => {
      // Arrange
      userModel.findById.mockResolvedValueOnce(null); // Simulate parent not found

      // Act & Assert
      await expect(
        authService.changeKidPassword('invalidParentId', 'kidId', 'parentPassword', 'newKidPassword'),
      ).rejects.toThrow('Parent not found!');
    });

    it('should throw an error when parent password is invalid', async () => {
      // Arrange
      userModel.findById.mockResolvedValueOnce(mockParent);
      mockParent.comparePassword.mockResolvedValue(false);

      // Act & Assert
      await expect(
        authService.changeKidPassword('parentId', 'kidId', 'invalidParentPassword', 'newKidPassword'),
      ).rejects.toThrow('Invalid parent password!');
    });

    it('should throw an error when kid is not found', async () => {
      // Arrange
      userModel.findById.mockImplementation((id) => {
        if (id === 'parentId') return Promise.resolve(mockParent);
        return Promise.resolve(null); // Simulate kid not found
      });
      mockParent.comparePassword.mockResolvedValue(true);

      // Act & Assert
      await expect(
        authService.changeKidPassword('parentId', 'invalidKidId', 'parentPassword', 'newKidPassword'),
      ).rejects.toThrow('Kid not found!');
    });

    it('should throw an error when the user is not a kid', async () => {
      // Arrange
      userModel.findById.mockImplementation((id) => {
        if (id === 'parentId') return Promise.resolve(mockParent);
        if (id === 'kidId') return Promise.resolve({ ...mockKid, role: 'parent' }); // Simulate user is not a kid
        return Promise.resolve(null);
      });
      mockParent.comparePassword.mockResolvedValue(true);

      // Act & Assert
      await expect(
        authService.changeKidPassword('parentId', 'kidId', 'parentPassword', 'newKidPassword'),
      ).rejects.toThrow('Selected user is not a kid!');
    });
  });

  describe('updateParentProfile', () => {
    const mockParent = {
      _id: 'parentId',
      role: 'parent',
      fullName: 'Old Name',
      email: 'old@test.com',
      city: 'Old City',
      years: 25,
      phone: '1234567890',
      imageUrl: 'oldImageUrl',
      isEmailVerified: true,
      generateEmailVerificationToken: jest.fn().mockReturnValue('newToken'),
      save: jest.fn(),
    };

    it('should update parent profile successfully without email', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(mockParent);
      userModel.findOne.mockResolvedValue(null);

      const profileData = {
        fullName: 'New Name',
        city: 'New City',
        years: 30,
        phone: '0987654321',
        imageUrl: 'newImageUrl',
      };

      // Act
      const result = await authService.updateParentProfile('parentId', profileData);

      // Assert
      expect(result).toEqual({
        _id: 'parentId',
        fullName: 'New Name',
        email: 'old@test.com',
        city: 'New City',
        years: 30,
        phone: '0987654321',
        imageUrl: 'newImageUrl',
        isEmailVerified: true,
      });
      expect(mockParent.save).toHaveBeenCalled();
    });

    it('should throw an error when user is not found', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.updateParentProfile('invalidId', {})).rejects.toThrow('User not found!');
    });

    it('should throw an error when user is not a parent', async () => {
      // Arrange
      userModel.findById.mockResolvedValue({ ...mockParent, role: 'kid' });

      // Act & Assert
      await expect(authService.updateParentProfile('parentId', {})).rejects.toThrow(
        'Access denied! Only parents can use this endpoint.',
      );
    });

    it('should throw an error when name is invalid', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(mockParent);

      // Act & Assert
      await expect(authService.updateParentProfile('parentId', { fullName: 'A' })).rejects.toThrow('Invalid name!');
    });
    it('should update parent profile successfully without imageUrl', async () => {
      // Arrange
      const mockParent = {
        _id: 'parentId',
        role: 'parent',
        fullName: 'Old Name',
        email: 'old@test.com',
        city: 'Old City',
        years: 25,
        phone: '1234567890',
        imageUrl: 'oldImageUrl',
        isEmailVerified: true,
        save: jest.fn(),
      };

      userModel.findById.mockResolvedValue(mockParent);
      userModel.findOne.mockResolvedValue(null);

      const updateData = {
        fullName: 'New Name',
        email: 'old@test.com',
        city: 'New City',
        years: 30,
        phone: '0987654321',
      };

      // Act
      const result = await authService.updateParentProfile('parentId', updateData);

      // Assert
      expect(result).toEqual({
        _id: 'parentId',
        fullName: 'New Name',
        email: 'old@test.com',
        city: 'New City',
        years: 30,
        phone: '0987654321',
        imageUrl: 'oldImageUrl',
        isEmailVerified: true,
      });
    });
  });

  describe('updateKidProfile', () => {
    const mockKid = {
      _id: 'kidId',
      role: 'kid',
      fullName: 'Old Name',
      email: 'old@test.com',
      city: 'Old City',
      years: 10,
      imageUrl: 'oldImageUrl',
      save: jest.fn(),
    };

    it('should update kid profile successfully', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(mockKid);

      const profileData = {
        fullName: 'New Name',
        city: 'New City',
        years: 12,
        imageUrl: 'newImageUrl',
      };

      // Act
      const result = await authService.updateKidProfile('kidId', profileData);

      // Assert
      expect(result).toEqual({
        _id: 'kidId',
        fullName: 'New Name',
        email: 'old@test.com',
        city: 'New City',
        years: 12,
        imageUrl: 'newImageUrl',
      });
      expect(mockKid.save).toHaveBeenCalled();
    });

    it('should throw an error when new name is too short', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(mockKid);

      const profileData = {
        fullName: 'A',
        city: 'New City',
        years: 12,
        imageUrl: 'newImageUrl',
      };

      // Act & Assert
      await expect(authService.updateKidProfile('kidId', profileData)).rejects.toThrow('Invalid name!');
    });

    it('should throw an error when user is not the parent', async () => {
      // Arrange
      const mockUser = {
        _id: 'parentId',
        role: 'parent',
        fullName: 'Old Name',
        email: 'old@test.com',
        city: 'Old City',
        years: 33,
        imageUrl: 'imageUrl',
        save: jest.fn(),
      };

      const isParentOf = jest.fn().mockReturnValue(false);
      userModel.findById.mockResolvedValue({ ...mockUser, isParentOf });

      // Act & Assert
      await expect(authService.updateKidProfile('kidId', {})).rejects.toThrow(
        'Access denied! You can only edit your own kids.',
      );
    });
    it('should update kid profile successfully without imageUrl', async () => {
      // Arrange
      const mockKid = {
        _id: 'kidId',
        role: 'kid',
        fullName: 'Old Name',
        email: 'old@test.com',
        city: 'Old City',
        years: 10,
        imageUrl: 'oldImageUrl',
        save: jest.fn(),
      };

      userModel.findById.mockResolvedValue(mockKid);

      const profileData = {
        fullName: 'New Name',
        city: 'New City',
        years: 12,
      };

      // Act
      const result = await authService.updateKidProfile('kidId', profileData);

      // Assert
      expect(result).toEqual({
        _id: 'kidId',
        fullName: 'New Name',
        email: 'old@test.com',
        city: 'New City',
        years: 12,
        imageUrl: 'oldImageUrl',
      });
      expect(mockKid.save).toHaveBeenCalled();
    });
  });

  describe('createKid', () => {
    const mockParentId = 'parentId';
    const mockKidData = {
      fullName: 'Kid Name',
      email: 'kid@test.com',
      password: 'kidPassword',
      city: 'Kid City',
      years: 8,
      parent: mockParentId,
    };

    it('should create a kid successfully', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);
      userModel.create.mockResolvedValue({ ...mockKidData, _id: 'kidId', role: 'kid', isEmailVerified: true });
      userModel.findByIdAndUpdate.mockResolvedValue({});

      // Act
      const result = await authService.createKid(mockKidData);

      // Assert
      expect(result).toEqual({
        _id: 'kidId',
        fullName: 'Kid Name',
        email: 'kid@test.com',
        city: 'Kid City',
        years: 8,
        role: 'kid',
      });
      expect(userModel.create).toHaveBeenCalledWith({
        ...mockKidData,
        role: 'kid',
        isEmailVerified: true,
      });
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockParentId,
        { $push: { kids: 'kidId' } },
        { new: true },
      );
    });

    it('should throw an error when email is already registered', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue({ email: mockKidData.email });

      // Act & Assert
      await expect(authService.createKid(mockKidData)).rejects.toThrow('Email already registered!');
    });

    it('should throw an error when age is invalid', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.createKid({ ...mockKidData, years: 121 })).rejects.toThrow('Invalid age!');
    });
  });
});
