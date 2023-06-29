import { handleDateFilterParams, verifyAuth, handleAmountFilterParams } from '../controllers/utils';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('handleDateFilterParams', () => {
	test('should return the correct date filter object', () => {
		const mockReq = {
			query: {
				from: '2023-01-01',
				upTo: '2023-12-31',
			},
		};

		const result = handleDateFilterParams(mockReq);

		expect(result).toEqual({
			date: {
				$gte: new Date('2023-01-01T00:00:00.000Z'),
				$lte: new Date('2023-12-31T23:59:59.999Z'),
			},
		});
	});

	test('should return an empty object if no date filter is provided', () => {
		const mockReq = {
			query: {},
		};

		const result = handleDateFilterParams(mockReq);

		expect(result).toEqual({});
	});

	test('should throw an error if `date` is present with `from`', () => {
		const mockReq = {
			query: {
				date: '2023-05-10',
				from: '2023-05-01',
			},
		};

		expect(() => handleDateFilterParams(mockReq)).toThrowError(
			'Cannot use `date` parameter together with `from` or `upTo`'
		);
	});

	test('should throw an error if `date` is present with `upTo`', () => {
		const mockReq = {
			query: {
				date: '2023-05-10',
				upTo: '2023-05-31',
			},
		};

		expect(() => handleDateFilterParams(mockReq)).toThrowError(
			'Cannot use `date` parameter together with `from` or `upTo`'
		);
	});

	test('should throw an error if the value of any query parameter is not a valid date', () => {
		const mockReq = {
			query: {
				date: 'invalid-date',
			},
		};

		expect(() => handleDateFilterParams(mockReq)).toThrowError('Invalid `date` parameter');
	});
});

describe('verifyAuth', () => {
	let mockReq = {
		cookies: {
			accessToken: '',
			refreshToken: 'refresh-token',
		},
		body: {},
		params: {},
	};
	let mockRes = {
		cookie: jest.fn(),
		locals: {
			refreshTokenMessage:
				'Access token has been refreshed. Remember to copy the new one in the headers of subsequent calls',
		},
	};
	const info = {
		authType: '',
	};
	test('should return 401 if there is no accessToken', () => {
		mockReq.cookies.accessToken = '';
		mockReq.cookies.refreshToken = 'refresh-token';

		const response = verifyAuth(mockReq, mockRes);

		expect(response).toHaveProperty('authorized', false);
		expect(response).toHaveProperty('cause');
	});

	test('should return 401 if there is no refreshToken', () => {
		mockReq.cookies.accessToken = 'access-token';
		mockReq.cookies.refreshToken = '';

		const response = verifyAuth(mockReq, mockRes);

		expect(response).toHaveProperty('authorized', false);
		expect(response).toHaveProperty('cause');
	});

	test('should return authorized false if accessToken is missing information', () => {
		mockReq.cookies.accessToken = 'access-token';
		mockReq.cookies.refreshToken = 'refresh-token';

		jwt.verify.mockImplementationOnce(() => {
			return {
				username: 'username',
				email: 'email@example.com',
			};
		});

		const response = verifyAuth(mockReq, mockRes);

		expect(response).toHaveProperty('authorized', false);
		expect(response).toHaveProperty('cause', 'Token is missing information');
	});

	test('should return authorized false if refreshToken is missing information', () => {
		mockReq.cookies.accessToken = 'access-token';
		mockReq.cookies.refreshToken = 'refresh-token';

		jwt.verify
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'role',
				};
			})
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
				};
			});

		const response = verifyAuth(mockReq, mockRes);

		expect(response).toHaveProperty('authorized', false);
		expect(response).toHaveProperty('cause', 'Token is missing information');
	});

	test('should return authorized false if mismatched user information', () => {
		mockReq.cookies.accessToken = 'access-token';
		mockReq.cookies.refreshToken = 'refresh-token';

		jwt.verify
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'role',
				};
			})
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'test-role',
				};
			});

		const response = verifyAuth(mockReq, mockRes);

		expect(response).toHaveProperty('authorized', false);
		expect(response).toHaveProperty('cause', 'Mismatched users');
	});

	test('should return authorized false if username is undefined', () => {
		mockReq.cookies.accessToken = 'access-token';
		mockReq.cookies.refreshToken = 'refresh-token';

		mockReq.params.username = 'username-different';

		info.authType = 'User';

		jwt.verify
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'role',
				};
			})
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'role',
				};
			});

		const response = verifyAuth(mockReq, mockRes, info);

		expect(response).toHaveProperty('authorized', false);
		expect(response).toHaveProperty('cause', 'Requested user different from the logged one');
	});

	test('should return authorized false if not admin', () => {
		mockReq.cookies.accessToken = 'access-token';
		mockReq.cookies.refreshToken = 'refresh-token';

		info.authType = 'Admin';

		jwt.verify
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'role',
				};
			})
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'role',
				};
			});

		const response = verifyAuth(mockReq, mockRes, info);

		expect(response).toHaveProperty('authorized', false);
		expect(response).toHaveProperty('cause', 'Not admin');
	});

	test('should return authorized false if not in group', () => {
		mockReq.cookies.accessToken = 'access-token';
		mockReq.cookies.refreshToken = 'refresh-token';

		info.authType = 'Group';

		jwt.verify
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'role',
				};
			})
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'role',
				};
			});

		const response = verifyAuth(mockReq, mockRes, info);

		expect(response).toHaveProperty('authorized', false);
		expect(response).toHaveProperty('cause', 'User not in group');
	});

	test('should return authorized false if email is not in group', () => {
		mockReq.cookies.accessToken = 'access-token';
		mockReq.cookies.refreshToken = 'refresh-token';

		info.authType = 'Group';
		info.groupEmails = ['email1@example.com'];

		jwt.verify
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'role',
				};
			})
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'role',
				};
			});

		const response = verifyAuth(mockReq, mockRes, info);

		expect(response).toHaveProperty('authorized', false);
		expect(response).toHaveProperty('cause', 'User not in group');
	});

	test('should return authorized true if user is a User', () => {
		mockReq.cookies.accessToken = 'access-token';
		mockReq.cookies.refreshToken = 'refresh-token';
		mockReq.params.username = 'username';

		info.authType = 'User';

		jwt.verify
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'role',
				};
			})
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'role',
				};
			});

		const response = verifyAuth(mockReq, mockRes, info);

		expect(response).toHaveProperty('authorized', true);
		expect(response).toHaveProperty('cause', 'Authorized');
	});

	test('should return authorized true if user is a User', () => {
		mockReq.cookies.accessToken = 'access-token';
		mockReq.cookies.refreshToken = 'refresh-token';
		mockReq.params.username = 'username';

		info.authType = 'Admin';

		jwt.verify
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'Admin',
				};
			})
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'Admin',
				};
			});

		const response = verifyAuth(mockReq, mockRes, info);

		expect(response).toHaveProperty('authorized', true);
		expect(response).toHaveProperty('cause', 'Authorized');
	});

	test('should return authorized true if user is in group', () => {
		mockReq.cookies.accessToken = 'access-token';
		mockReq.cookies.refreshToken = 'refresh-token';

		info.authType = 'Group';
		info.emails = ['email@example.com'];

		jwt.verify
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'role',
				};
			})
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'role',
				};
			});

		const response = verifyAuth(mockReq, mockRes, info);

		expect(response).toHaveProperty('authorized', true);
		expect(response).toHaveProperty('cause', 'Authorized');
	});

	test('should return authorized true if token expired', () => {
		mockReq.cookies.accessToken = 'access-token';
		mockReq.cookies.refreshToken = 'refresh-token';
		mockReq.params.username = 'username';

		info.authType = 'Admin';

		jwt.verify
			.mockImplementationOnce(() => {
				throw new Error('jwt expired');
			})
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'Admin',
				};
			});

		jwt.sign.mockImplementationOnce(() => {
			return {
				username: 'username',
				email: 'email@example.com',
				id: 'id',
				role: 'Admin',
			};
		});

		const response = verifyAuth(mockReq, mockRes, info);

		expect(response).toHaveProperty('authorized', true);
		expect(response).toHaveProperty('cause', 'Authorized');
	});

	test('should return authorized false if token expired and jwt throws error TokenExpiredError', () => {
		mockReq.cookies.accessToken = 'access-token';
		mockReq.cookies.refreshToken = 'refresh-token';
		mockReq.params.username = 'username';

		info.authType = 'Admin';

		jwt.verify
			.mockImplementationOnce(() => {
				throw new Error('TokenExpiredError');
			})
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'Admin',
				};
			});

		jwt.sign.mockImplementationOnce(() => {
			throw new Error('TokenExpiredError');
		});

		const response = verifyAuth(mockReq, mockRes, info);

		expect(response).toHaveProperty('authorized', false);
		expect(response).toHaveProperty('cause', 'Error');
	});

	test('should return authorized false if token expired and jwt throws error', () => {
		mockReq.cookies.accessToken = 'access-token';
		mockReq.cookies.refreshToken = 'refresh-token';
		mockReq.params.username = 'username';

		info.authType = 'Admin';

		jwt.verify
			.mockImplementationOnce(() => {
				throw new Error('Error');
			})
			.mockImplementationOnce(() => {
				return {
					username: 'username',
					email: 'email@example.com',
					role: 'Admin',
				};
			});

		jwt.sign.mockImplementationOnce(() => {
			throw new Error('TokenExpiredError');
		});

		const response = verifyAuth(mockReq, mockRes, info);

		expect(response).toHaveProperty('authorized', false);
		expect(response).toHaveProperty('cause', 'Error');
	});
});

describe('handleAmountFilterParams', () => {
	it('returns correct amount object when min query parameter is provided', () => {
		const req = {
			query: {
				min: '10',
			},
		};

		const result = handleAmountFilterParams(req);

		expect(result).toEqual({ amount: { $gte: 10 } });
	});

	it('returns correct amount object when max query parameter is provided', () => {
		const req = {
			query: {
				max: '50',
			},
		};

		const result = handleAmountFilterParams(req);

		expect(result).toEqual({ amount: { $lte: 50 } });
	});

	it('returns correct amount object when both min and max query parameters are provided', () => {
		const req = {
			query: {
				min: '10',
				max: '50',
			},
		};

		const result = handleAmountFilterParams(req);

		expect(result).toEqual({ amount: { $gte: 10, $lte: 50 } });
	});

	it('returns an empty object when neither min nor max query parameters are provided', () => {
		const req = {
			query: {},
		};

		const result = handleAmountFilterParams(req);

		expect(result).toEqual({});
	});

	it('throws an error when the value of min query parameter is not a numerical value', () => {
		const req = {
			query: {
				min: 'abc',
			},
		};

		expect(() => {
			handleAmountFilterParams(req);
		}).toThrowError('Invalid `min` parameter');
	});

	it('throws an error when the value of max query parameter is not a numerical value', () => {
		const req = {
			query: {
				max: 'def',
			},
		};

		expect(() => {
			handleAmountFilterParams(req);
		}).toThrowError('Invalid `max` parameter');
	});
});
