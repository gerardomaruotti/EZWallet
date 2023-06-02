import request from 'supertest';
import { app } from '../app';
import { User } from '../models/User.js';
import {
	getUsers,
	getUser,
	createGroup,
	getGroups,
	deleteGroup,
	getGroup,
	deleteUser,
	addToGroup,
	removeFromGroup,
} from '../controllers/users.js';
import { isEmail, verifyAuth, verifyMultipleAuth } from '../controllers/utils';

/**
 * In order to correctly mock the calls to external modules it is necessary to mock them using the following line.
 * Without this operation, it is not possible to replace the actual implementation of the external functions with the one
 * needed for the test cases.
 * `jest.mock()` must be called for every external module that is called in the functions under test.
 */
jest.mock('../models/User.js');
jest.mock('../controllers/utils');


/**
 * Defines code to be executed before each test case is launched
 * In this case the mock implementation of `User.find()` is cleared, allowing the definition of a new mock implementation.
 * Not doing this `mockClear()` means that test cases may use a mock implementation intended for other test cases.
 */
beforeEach(() => {
	User.find.mockClear();
	User.findOne.mockClear();
	verifyAuth.mockClear();
	verifyMultipleAuth.mockClear();

});

describe('getUsers', () => {
	let mockReq;
	let mockRes;

	beforeEach(() => {
		mockReq = {
			cookies: {},
			body: {},
			params: {}
		};
		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'Refreshed token'
			}
		};
	});

	test('should return 401 if not authorised', async () => {

		verifyAuth.mockImplementation(() => ({ authorized: false, cause: 'Unauthorized' }));

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
				error: expect.any(String)
		}));
	});

	test('should return 500 if there is database error', async () => {

		User.find.mockImplementation(() => { throw 'Database error' });
		verifyAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized'}));

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}));
	});

	test('should return empty list if there are no users', async () => {

		User.find.mockImplementation(() => []);
		verifyAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized'}));

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            data: []
        }));
	});

	test('should return list of all users', async () => {

		const retrievedUsers = [
			{
				username: 'test1',
				email: 'test1@example.com',
				role: 'Regular'
			},
			{
				username: 'test2',
				email: 'test2@example.com',
				role: 'Admin'
			},
		];

		User.find.mockImplementation(() => retrievedUsers);
		verifyAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized'}));

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            data: retrievedUsers
        }));
	});

});

describe('getUser', () => {
	let mockReq;
	let mockRes;

	beforeEach(() => {
		mockReq = {
			cookies: {},
			body: {},
			params: {
				username: 'test1'
			}
		};
		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'Refreshed token'
			}
		};
	});

	test('should return 401 if not authorized', async () => {
		
		verifyMultipleAuth.mockImplementation(() => ({ authorized: false, cause: 'Unauthorized' }));

		await getUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}));
	});

	test('should return 400 if user does not exist', async () => {
		
		User.findOne.mockImplementation(() => null);
		verifyMultipleAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized'}));

		await getUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}));
	});

	test('should return 500 if there is database error', async () => {
		
		User.findOne.mockImplementation(() => { throw 'Database error' });
		verifyMultipleAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized'}));

		await getUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}));
	});

	test('should return user data', async () => {

		const retrievedUser = {
			username: 'test1',
			email: 'test1@example.com',
			role: 'Regular'
		};
		
		User.findOne.mockImplementation(() => retrievedUser);
		verifyMultipleAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized'}));

		await getUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			data: retrievedUser
		}));
	});
});

describe('createGroup', () => {});

describe('getGroups', () => {});

describe('getGroup', () => {});

describe('addToGroup', () => {});

describe('removeFromGroup', () => {});

describe('deleteUser', () => {});

describe('deleteGroup', () => {});
