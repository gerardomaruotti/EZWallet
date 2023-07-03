import request from 'supertest';
import { app } from '../app';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
const bcrypt = require('bcryptjs');

import { register, registerAdmin, login, logout } from '../controllers/auth';

jest.mock('bcryptjs');
jest.mock('../models/User.js');

const accessToken = 'accesstokentest';
const refreshToken = 'refreshtokentest';

describe('register', () => {
	test('Nominal case', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'enrico',
				email: 'enrico@gmail.com',
				password: 'enrico',
			},
		};

		const mockRes = {
			locals: {
				refreshedTokenMessage: '',
			},
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		jest.spyOn(User, 'find').mockImplementation(() => false);

		jest.spyOn(User, 'create').mockImplementation(() => {});

		await register(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: { message: 'User added succesfully' },
		});
	});

	test('Undefined username', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				email: 'enrico@gmail.com',
				password: 'enrico',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await register(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
	});

	test('Undefined email', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'enrico',
				password: 'enrico',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await register(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
	});

	test('Undefined password', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'enrico',
				email: 'enrico@gmail.com',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await register(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
	});

	test('Empty username', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: '',
				email: 'enrico@gmail.com',
				password: 'enrico',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await register(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Empty string in parameters',
		});
	});

	test('Empty email', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'enrico',
				email: '',
				password: 'enrico',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await register(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Empty string in parameters',
		});
	});

	test('Empty passowrd', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'enrico',
				email: 'enrico@gmail.com',
				password: '',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await register(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Empty string in parameters',
		});
	});

	test('Empty body', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: '',
				email: '',
				password: '',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await register(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Empty string in parameters',
		});
	});

	test('Wrong email ', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'enrico',
				email: 'enrico.gmail.com',
				password: 'enrico',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await register(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Email not correct formatted',
		});
	});

	test('Username already used', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'enrico',
				email: 'enrico@gmail.com',
				password: 'enrico',
			},
		};

		const mockRes = {
			locals: {
				refreshedTokenMessage: 'refreshed token',
			},
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		jest.spyOn(User, 'findOne').mockImplementation(() => true);

		await register(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'User already registered',
		});
	});

	test('Email already used', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'enrico',
				email: 'enrico@gmail.com',
				password: 'enrico',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		jest.spyOn(User, 'findOne').mockImplementation(() => true);
		await register(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'User already registered',
		});
	});

	test('Database error', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'enrico',
				email: 'enrico@gmail.com',
				password: 'enrico',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		User.findOne.mockImplementation(() => {
			throw new Error('error');
		});

		await register(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
	});
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
describe('registerAdmin', () => {
	test('nominal case', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'admin',
				email: 'admin@gmail.com',
				password: 'admin',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		jest.spyOn(User, 'findOne').mockImplementation(() => false);
		await registerAdmin(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: { message: 'Admin added succesfully' },
		});
	});

	test('Undefined password', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'admin',
				email: 'admin@gmail.com',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await registerAdmin(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing parameters' });
	});

	test('Undefined email', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'admin',
				password: 'admin',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await registerAdmin(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing parameters' });
	});

	test('Undefined username', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				email: 'admin@gmail.com',
				password: 'admin',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await registerAdmin(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing parameters' });
	});

	test('Empty username', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: '',
				email: 'admin@gmail.com',
				password: 'admin',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await registerAdmin(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Empty string in parameters',
		});
	});

	test('Empty email', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'admin',
				email: '',
				password: 'admin',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await registerAdmin(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Empty string in parameters',
		});
	});

	test('Empty password', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'admin',
				email: 'admin@gmail.com',
				password: '',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await registerAdmin(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Empty string in parameters',
		});
	});

	test('Empty Body', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: '',
				email: '',
				password: '',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await registerAdmin(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Empty string in parameters',
		});
	});

	test('Wrong email', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'admin',
				email: 'admin.gmail.com',
				password: 'admin',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		jest.spyOn(User, 'findOne').mockImplementation(() => true);
		await registerAdmin(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Email not correct formatted',
		});
	});

	test('Email already used', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'admin',
				email: 'admin@gmail.com',
				password: 'admin',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		jest.spyOn(User, 'findOne').mockImplementation(() => true);
		await registerAdmin(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'User already registered',
		});
	});

	test('Database error', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'admin',
				email: 'admin@gmail.com',
				password: 'admin',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		User.findOne.mockImplementation(() => {
			throw new Error('error');
		});

		await registerAdmin(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
	});
});

describe('Login', () => {
	test('nominal case', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				email: 'admin@gmail.com',
				password: 'admin',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			cookie: jest.fn(), //access token e refresh token finiranno nei cookie
		};

		jest.spyOn(User, 'findOne').mockImplementation(() => ({
			password: 'adminhash',
			save: jest.fn(),
		}));

		jest.spyOn(bcrypt, 'compare').mockImplementation(() => {
			return Promise.resolve(true);
		});

		jest
			.spyOn(jwt, 'sign')
			.mockImplementationOnce(() => accessToken)
			.mockImplementationOnce(() => {
				return refreshToken;
			});

		await login(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: {
				accessToken: 'accesstokentest',
				refreshToken: 'refreshtokentest',
			},
		});
	});

	test('Undefined email', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				password: 'admin',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			cookie: jest.fn(),
		};

		await login(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing parameters' });
	});

	test('Undefined password', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				email: 'admin@gmail.com',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			cookie: jest.fn(),
		};

		await login(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing parameters' });
	});

	test('Empty password', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				email: 'admin@gmail.com',
				password: '',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			cookie: jest.fn(),
		};

		await login(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Empty string in parameters',
		});
	});

	test('Empty email', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				email: '',
				password: 'admin',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			cookie: jest.fn(),
		};

		await login(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Empty string in parameters',
		});
	});

	test('Existing user', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				email: 'admim@gmail.com',
				password: 'admin',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			cookie: jest.fn(),
		};

		jest.spyOn(User, 'findOne').mockImplementation(() => false);

		await login(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'User need to register' });
	});

	test('Password wrong', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				email: 'admin@gmail.com',
				password: 'admim',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			cookie: jest.fn(),
		};

		jest.spyOn(User, 'findOne').mockImplementation(() => ({
			password: 'test',
			save: jest.fn(),
		}));

		jest.spyOn(bcrypt, 'compare').mockImplementation(() => {
			return Promise.resolve(false);
		});

		await login(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Wrong credentials' });
	});

	test('Database error', async () => {
		const mockReq = {
			params: {},
			cookies: {},
			body: {
				username: 'enrico',
				email: 'enrico@gmail.com',
				password: 'enrico',
			},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		User.findOne.mockImplementationOnce(() => {
			throw new Error('error');
		});

		await login(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(500);
	});
});

describe('logout', () => {
	test('Nominal case', async () => {
		const mockReq = {
			params: {},
			cookies: {
				refreshToken: 'refreshtokentest',
			},
			body: {},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			cookie: jest.fn(),
		};

		//User.findOne.mockResolvedValue(refreshToken);
		jest.spyOn(User, 'findOne').mockImplementation(() => ({
			refreshToken: 'refreshtokentest',
			save: jest.fn(),
		}));

		await logout(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: { message: 'User logged out' },
		});
	});

	test('Missing refreshtoken', async () => {
		const mockReq = {
			params: {},
			cookies: {
				refreshToken: '',
			},
			body: {},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			cookie: jest.fn(),
		};

		await logout(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not logged in' });
	});

	test('User not found', async () => {
		const mockReq = {
			params: {},
			cookies: {
				refreshToken: 'refreshtokentest',
			},
			body: {},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			cookie: jest.fn(),
		};

		User.findOne.mockResolvedValue(null);

		await logout(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
	});

	test('Database error', async () => {
		const mockReq = {
			params: {},
			cookies: {
				refreshToken: 'refreshtokentest',
			},
			body: {},
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			cookie: jest.fn(),
		};

		User.findOne.mockImplementation(() => {
			throw new Error('error');
		});
		await logout(mockReq, mockRes);
		expect(mockRes.status).toHaveBeenCalledWith(500);
	});
});
