import { auth } from '../../../middleware/authMiddleware.js';
import { verifyAccessToken } from '../../../utils/jwt.js';

// Mock dependencies
jest.mock('../../../utils/jwt.js');

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {};
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should add user to request when valid token is provided', async () => {
    // Arrange
    const mockToken = 'validToken';
    const mockUserId = 'testUserId';
    mockReq.headers.authorization = `Bearer ${mockToken}`;
    verifyAccessToken.mockReturnValue({ userId: mockUserId });

    // Act
    await auth(mockReq, mockRes, mockNext);

    // Assert
    expect(verifyAccessToken).toHaveBeenCalledWith(mockToken);
    expect(mockReq.user).toEqual({ userId: mockUserId });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should throw an error when Authorization header is missing', async () => {
    // Act
    await auth(mockReq, mockRes, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 401,
        message: 'Invalid token!',
      }),
    );
  });

  it('should throw an error when invalid Bearer format is provided', async () => {
    // Arrange
    mockReq.headers.authorization = 'InvalidFormat token';

    // Act
    await auth(mockReq, mockRes, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 401,
        message: 'Invalid token!',
      }),
    );
  });

  it('should throw an error when invalid token is provided', async () => {
    // Arrange
    mockReq.headers.authorization = 'Bearer invalidToken';
    verifyAccessToken.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    // Act
    await auth(mockReq, mockRes, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 401,
        message: 'Invalid token!',
      }),
    );
  });
});
