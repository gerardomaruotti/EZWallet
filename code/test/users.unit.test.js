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
import { verifyAuth } from '../controllers/utils';

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
	verifyAuth.mockClear();

	//additional `mockClear()` must be placed here
});

describe('getUsers', () => {
	test('should return 401 if user is not logged in', async () => {
		const mockReq = {
			cookies: {},
			body: {},
			params: {}
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn()
		};

		verifyAuth.mockImplementation(() => ({ authorized: false, cause: 'No cookies' }));

		await getUsers(mockReq, mockRes);
		
		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'No cookies' });
	});



	test('should return empty list if there are no users', async () => {
		const mockReq = {
			cookies: {},
			body: {},
			params: {}
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'Refreshed token'
			}
		};

		jest.spyOn(User, 'find').mockImplementation(() => []);
		verifyAuth.mockImplementation(() => ({ authorized: true }));

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({ data: [], refreshedTokenMessage: 'Refreshed token'  });
	});

	// test('should retrieve list of all users', async () => {
	// 	const retrievedUsers = [
	// 		{
	// 			username: 'test1',
	// 			email: 'test1@example.com',
	// 			password: 'hashedPassword1',
	// 		},
	// 		{
	// 			username: 'test2',
	// 			email: 'test2@example.com',
	// 			password: 'hashedPassword2',
	// 		},
	// 	];
	// 	jest.spyOn(User, 'find').mockImplementation(() => retrievedUsers);
	// 	const response = await request(app).get('/api/users');

	// 	expect(response.status).toBe(200);
	// 	expect(response.body).toEqual(retrievedUsers);
	// });
});

describe('getUser', () => {});

describe('createGroup', () => {});

describe('getGroups', () => {});

describe('getGroup', () => {});

describe('addToGroup', () => {});

describe('removeFromGroup', () => {});

describe('deleteUser', () => {});

describe('deleteGroup', () => {});
