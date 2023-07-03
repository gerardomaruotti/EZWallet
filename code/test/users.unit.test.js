import jwt from 'jsonwebtoken';
import { Group, User } from '../models/User.js';
import { transactions } from '../models/model.js';
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
import { isEmail, verifyAuth, verifyMultipleAuth, checkGroupEmails } from '../controllers/utils';

/**
 * In order to correctly mock the calls to external modules it is necessary to mock them using the following line.
 * Without this operation, it is not possible to replace the actual implementation of the external functions with the one
 * needed for the test cases.
 * `jest.mock()` must be called for every external module that is called in the functions under test.
 */
jest.mock('../models/User.js');
jest.mock('../models/model.js');
jest.mock('../controllers/utils');
jest.mock('jsonwebtoken');

/**
 * Defines code to be executed before each test case is launched
 * In this case the mock implementation of `User.find()` is cleared, allowing the definition of a new mock implementation.
 * Not doing this `mockClear()` means that test cases may use a mock implementation intended for other test cases.
 */

describe('getUsers', () => {
	let mockReq;
	let mockRes;

	beforeEach(() => {
		mockReq = {
			cookies: {},
			body: {},
			params: {},
		};
		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'refreshed token',
			},
		};

		verifyAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized' }));
		User.find.mockImplementation(() => []);
	});

	test('should return 401 if not authorised', async () => {
		verifyAuth.mockImplementation(() => ({ authorized: false, cause: 'Unauthorized' }));

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 500 if there is database error', async () => {
		User.find.mockImplementation(() => {
			throw new Error('Database error');
		});

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return empty list if there are no users', async () => {
		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: [],
			})
		);
	});

	test('should return list of all users', async () => {
		const retrievedUsers = [
			{
				username: 'test1',
				email: 'test1@example.com',
				role: 'regular',
			},
			{
				username: 'test2',
				email: 'test2@example.com',
				role: 'admin',
			},
		];

		User.find.mockImplementation(() => retrievedUsers);

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: retrievedUsers,
			})
		);
	});
});

describe('getUser', () => {
	let mockReq;
	let mockRes;
	let retrievedUser;

	beforeEach(() => {
		mockReq = {
			cookies: {},
			body: {},
			params: {
				username: 'test1',
			},
		};
		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'refreshed token',
			},
		};

		retrievedUser = {
			username: 'test1',
			email: 'test1@example.com',
			role: 'regular',
		};

		verifyMultipleAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized' }));
		User.findOne.mockImplementation(() => retrievedUser);
	});

	test('should return 401 if not authorized', async () => {
		verifyMultipleAuth.mockImplementation(() => ({ authorized: false, cause: 'Unauthorized' }));

		await getUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if user does not exist', async () => {
		User.findOne.mockImplementation(() => null);

		await getUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 500 if there is database error', async () => {
		User.findOne.mockImplementation(() => {
			throw new Error('Database error');
		});

		await getUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return user data', async () => {
		await getUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: retrievedUser,
			})
		);
	});
});

describe('createGroup', () => {
	let mockReq;
	let mockRes;

	let validEmails;
	let alreadyInGroup;
	let membersNotFound;

	let data;

	beforeEach(() => {
		mockReq = {
			cookies: {
				refreshToken: 'refresh token',
			},
			body: {
				name: 'testGroup',
				memberEmails: ['test1@example.com', 'test2@example.com'],
			},
			params: {},
		};
		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'refreshed token',
			},
		};

		validEmails = ['test1@example.com', 'test2@example.com'];
		alreadyInGroup = [];
		membersNotFound = [];

		data = {
			group: {
				name: 'testGroup',
				members: validEmails.map((email) => ({ email })),
			},
			alreadyInGroup,
			membersNotFound,
		};

		verifyAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized' }));
		jwt.verify.mockImplementation(() => ({ email: validEmails[0] }));
		isEmail.mockImplementation(() => true);

		Group.prototype.save.mockImplementation(
			() =>
				new Promise((res, rej) =>
					res({
						name: 'testGroup',
						members: validEmails.map((email) => ({ email })),
					})
				)
		);
		Group.findOne.mockImplementation(() => null);

		checkGroupEmails.mockImplementation(() => ({
			validEmails: validEmails.map((email) => ({ email })),
			alreadyInGroup: alreadyInGroup.map((email) => ({ email })),
			membersNotFound: membersNotFound.map((email) => ({ email })),
		}));
	});

	test('should return 401 if not authorized', async () => {
		verifyAuth.mockImplementation(() => ({ authorized: false, cause: 'Unauthorized' }));

		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if group name is not provided', async () => {
		mockReq.body.name = undefined;

		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if group name is a empty string', async () => {
		mockReq.body.name = '';

		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if member emails are not provided', async () => {
		mockReq.body.memberEmails = undefined;

		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if group already exists', async () => {
		Group.findOne.mockImplementation(() => ({ name: 'testGroup' }));

		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test("should return 400 if there aren't valid member emails", async () => {
		checkGroupEmails.mockImplementation(() => ({
			validEmails: [],
			alreadyInGroup: [],
			membersNotFound: [],
		}));

		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if user is already in a group', async () => {
		checkGroupEmails.mockImplementation(() => ({
			alreadyInGroup: [{ email: validEmails.shift() }],
			validEmails: validEmails.map((email) => ({ email })),
			membersNotFound: [],
		}));

		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if there are almost one email invalid or empty', async () => {
		isEmail.mockImplementation(() => false);

		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 500 if there is database error', async () => {
		Group.findOne.mockImplementation(() => {
			throw new Error('Database error');
		});

		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return created group', async () => {
		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ data }));
	});

	test('should return created group with user email', async () => {
		mockReq.body.memberEmails.shift();

		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ data }));
	});
});

describe('getGroups', () => {
	let mockReq;
	let mockRes;

	beforeEach(() => {
		mockReq = {
			cookies: {},
			body: {},
			params: {},
		};
		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'refreshed token',
			},
		};

		verifyAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized' }));

		Group.findOne.mockImplementation(() => null);
	});

	test('should return 401 if not authorized', async () => {
		verifyAuth.mockImplementation(() => ({ authorized: false, cause: 'Unauthorized' }));

		await getGroups(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 500 if there is database error', async () => {
		Group.find.mockImplementation(() => {
			throw new Error('Database error');
		});

		await getGroups(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return empty list if there are no groups', async () => {
		const spy = jest.spyOn(Group, 'find');
		spy.mockResolvedValue([]);
		jest.clearAllMocks();
		await getGroups(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: [],
			})
		);
	});

	test('should return list of all groups', async () => {
		const retrievedGroups = [
			{
				name: 'testGroup',
				members: [{ email: 'test1@example.com' }, { email: 'test2@example.com' }],
			},
		];

		Group.find.mockImplementation(() => retrievedGroups);

		await getGroups(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: retrievedGroups,
			})
		);
	});
});

describe('getGroup', () => {
	let mockReq;
	let mockRes;
	let retrievedGroup;

	beforeEach(() => {
		mockReq = {
			cookies: {},
			body: {},
			params: {
				name: 'test1',
			},
		};
		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'refreshed token',
			},
		};

		retrievedGroup = {
			name: 'test1',
			members: [{ email: 'test1@example.com' }, { email: 'test2@example.com' }],
		};

		verifyMultipleAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized' }));
		Group.findOne.mockImplementation(() => retrievedGroup);
	});

	test('should return 400 if a group does not exist', async () => {
		Group.findOne.mockImplementation(() => null);

		await getGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 401 if not authorized', async () => {
		verifyMultipleAuth.mockImplementation(() => ({ authorized: false, cause: 'Unauthorized' }));

		await getGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 500 if there is database error', async () => {
		Group.findOne.mockImplementation(() => {
			throw new Error('Database error');
		});

		await getGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return group data', async () => {
		await getGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: retrievedGroup,
			})
		);
	});
});

describe('addToGroup', () => {
	let mockReq;
	let mockRes;

	let validEmails;
	let alreadyInGroup;
	let membersNotFound;
	let groupEmail;

	beforeEach(() => {
		mockReq = {
			cookies: {},
			body: {
				emails: ['test3@example.com', 'test4@example.com'],
			},
			params: {
				name: 'test1',
			},
			path: '/groups/test1/add',
		};
		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'refreshed token',
			},
		};

		validEmails = ['test3@example.com', 'test4@example.com'];
		alreadyInGroup = [];
		membersNotFound = [];
		groupEmail = ['test1@example.com', 'test2@example.com'];

		verifyAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized' }));
		isEmail.mockImplementation(() => true);

		Group.findOne.mockImplementation(
			() =>
				new Promise((resolve) =>
					resolve({
						name: 'test1',
						members: [...groupEmail, ...validEmails].map((email) => ({ email })),
					})
				)
		);
		Group.updateOne.mockImplementation(
			() =>
				new Promise((resolve) =>
					resolve({
						name: 'test1',
						members: [...groupEmail, ...validEmails].map((email) => ({ email })),
					})
				)
		);

		checkGroupEmails.mockImplementation(() => ({
			validEmails: validEmails.map((email) => ({ email })),
			alreadyInGroup: alreadyInGroup.map((email) => ({ email })),
			membersNotFound: membersNotFound.map((email) => ({ email })),
		}));
	});

	test('should return 401 if not authorized', async () => {
		verifyAuth.mockImplementation(() => ({ authorized: false, cause: 'Unauthorized' }));

		await addToGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 401 if not authorized ad admin', async () => {
		verifyAuth.mockImplementation(() => ({ authorized: false, cause: 'Unauthorized' }));
		mockReq.path = '/groups/test1/insert';

		await addToGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if group name is not provided', async () => {
		mockReq.params.name = undefined;

		await addToGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if member emails are not provided', async () => {
		mockReq.body.emails = undefined;

		await addToGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if group does not exist', async () => {
		Group.findOne.mockImplementation(() => null);

		await addToGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if the path is wrong', async () => {
		mockReq.path = '/groups/test1';

		await addToGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if emails are not valid', async () => {
		isEmail.mockImplementation(() => false);

		await addToGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test("should return 400 if there aren't valid emails", async () => {
		checkGroupEmails.mockImplementation(() => ({
			validEmails: [],
			alreadyInGroup: validEmails.map((email) => ({ email })),
			membersNotFound: membersNotFound.map((email) => ({ email })),
		}));

		await addToGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 500 if there is database error', async () => {
		Group.findOne.mockImplementation(() => {
			throw new Error('Database error');
		});

		await addToGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return the group with the new members', async () => {
		await addToGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					group: expect.objectContaining({
						name: 'test1',
						members: [...groupEmail, ...validEmails].map((email) => ({ email })),
					}),
					alreadyInGroup: alreadyInGroup.map((email) => ({ email })),
					membersNotFound: membersNotFound.map((email) => ({ email })),
				}),
			})
		);
	});

	test('should return the group with the new members if admin', async () => {
		mockReq.path = '/groups/test1/insert';

		await addToGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					group: expect.objectContaining({
						name: 'test1',
						members: [...groupEmail, ...validEmails].map((email) => ({ email })),
					}),
					alreadyInGroup: alreadyInGroup.map((email) => ({ email })),
					membersNotFound: membersNotFound.map((email) => ({ email })),
				}),
			})
		);
	});
});

describe('removeFromGroup', () => {
	let mockReq;
	let mockRes;

	let validEmails;
	let notInGroup;
	let membersNotFound;
	let groupEmail;

	beforeEach(() => {
		mockReq = {
			cookies: {},
			body: {
				emails: ['test1@example.com', 'test3@example.com'],
			},
			params: {
				name: 'test1',
			},
			path: '/groups/test1/remove',
		};
		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'refreshed token',
			},
		};

		validEmails = ['test1@example.com'];
		notInGroup = [];
		membersNotFound = ['test3@example.com'];
		groupEmail = ['test1@example.com', 'test2@example.com'];

		verifyAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized' }));
		isEmail.mockImplementation(() => true);

		Group.findOne
			.mockImplementation(
				() =>
					new Promise((resolve) =>
						resolve({
							name: 'test1',
							members: groupEmail
								.filter((email) => !validEmails.includes(email))
								.map((email) => ({ email })),
						})
					)
			)
			.mockImplementationOnce(
				() =>
					new Promise((resolve) =>
						resolve({
							name: 'test1',
							members: groupEmail.map((email) => ({ email })),
						})
					)
			);

		Group.updateOne.mockImplementation(
			() =>
				new Promise((resolve) =>
					resolve({
						name: 'test1',
						members: groupEmail
							.filter((email) => !validEmails.includes(email))
							.map((email) => ({ email })),
					})
				)
		);

		checkGroupEmails.mockImplementation(() => ({
			validEmails: validEmails.map((email) => ({ email })),
			notInGroup: notInGroup.map((email) => ({ email })),
			membersNotFound: membersNotFound.map((email) => ({ email })),
		}));
	});

	test('should return 401 if not authorized', async () => {
		verifyAuth.mockImplementation(() => ({ authorized: false, cause: 'Unauthorized' }));

		await removeFromGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 401 if not authorized as admin', async () => {
		mockReq.path = '/groups/test1/pull';
		verifyAuth.mockImplementation(() => ({ authorized: false, cause: 'Unauthorized' }));

		await removeFromGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if emails are not provided', async () => {
		mockReq.body.emails = undefined;

		await removeFromGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if group does not exist', async () => {
		Group.findOne.mockReset();
		Group.findOne.mockImplementation(() => null);

		await removeFromGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if the path is not valid', async () => {
		mockReq.path = '/groups/test1/invalid';

		await removeFromGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if emails are not valid', async () => {
		isEmail.mockImplementation(() => false);

		await removeFromGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test("should return 400 if there aren't valid emails", async () => {
		checkGroupEmails.mockImplementation(() => ({
			validEmails: [...validEmails, ...membersNotFound].map((email) => {
				email;
			}),
			notInGroup: [],
			membersNotFound: [],
		}));

		await removeFromGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if the group will be empty', async () => {
		checkGroupEmails.mockImplementation(() => ({
			validEmails: [],
			notInGroup: validEmails.map((email) => ({ email })),
			membersNotFound: membersNotFound.map((email) => ({ email })),
		}));

		await removeFromGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 500 if there is database error', async () => {
		Group.findOne.mockReset();
		Group.findOne.mockImplementation(() => {
			throw new Error('Database error');
		});

		await removeFromGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);

		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return the group with the removed members', async () => {
		await removeFromGroup(mockReq, mockRes);

		//expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					group: expect.objectContaining({
						name: 'test1',
						members: groupEmail
							.filter((email) => !validEmails.includes(email))
							.map((email) => ({ email })),
					}),
					notInGroup: notInGroup.map((email) => ({ email })),
					membersNotFound: membersNotFound.map((email) => ({ email })),
				}),
			})
		);
	});

	test('should return the group with the removed members if admin', async () => {
		mockReq.path = '/groups/test1/pull';

		await removeFromGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					group: expect.objectContaining({
						name: 'test1',
						members: groupEmail
							.filter((email) => !validEmails.includes(email))
							.map((email) => ({ email })),
					}),
					notInGroup: notInGroup.map((email) => ({ email })),
					membersNotFound: membersNotFound.map((email) => ({ email })),
				}),
			})
		);
	});
});

describe('deleteUser', () => {
	let mockReq;
	let mockRes;

	beforeEach(() => {
		mockReq = {
			path: '/groups/test1',
			body: {
				email: 'test1@example.com',
			},
		};

		mockRes = {
			status: jest.fn(() => mockRes),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'refreshed token',
			},
		};

		verifyAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized' }));
		isEmail.mockImplementation(() => true);

		transactions.deleteMany.mockImplementation(
			() => new Promise((resolve) => resolve({ deletedCount: 10 }))
		);
		Group.findOne.mockImplementation(
			() =>
				new Promise((resolve) =>
					resolve({
						name: 'test1',
						members: ['test1@example.com'],
					})
				)
		);
		Group.deleteMany.mockImplementation(
			() => new Promise((resolve) => resolve({ deletedCount: 1 }))
		);
	});

	test('should return 401 if not authorized', async () => {
		verifyAuth.mockImplementation(() => ({ authorized: false, cause: 'Not authorized' }));

		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if email is undefined', async () => {
		mockReq.body.email = undefined;

		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if email is not valid', async () => {
		isEmail.mockImplementation(() => false);

		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if user does not exist', async () => {
		User.findOne.mockImplementation(() => new Promise((resolve) => resolve(null)));

		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if user is admin', async () => {
		User.findOne.mockImplementation(
			() =>
				new Promise((resolve) =>
					resolve({
						email: 'test1@exaple.com',
						role: 'Admin',
					})
				)
		);

		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 500 if there is database error', async () => {
		User.findOne.mockImplementation(() => {
			throw new Error('Database error');
		});

		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 200 if user is deleted', async () => {
		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					deletedTransactions: 10,
					deletedFromGroup: true,
				}),
				refreshedTokenMessage: expect.any(String),
			})
		);
	});

	test("should return 200 if user is deleted and there isn't the last in group", async () => {
		Group.findOne.mockImplementation(
			() =>
				new Promise((resolve) =>
					resolve({
						name: 'test1',
						members: ['test1@example.com', 'test2@example.com'],
					})
				)
		);

		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					deletedTransactions: 10,
					deletedFromGroup: false,
				}),
				refreshedTokenMessage: expect.any(String),
			})
		);
	});
});

describe('deleteGroup', () => {
	let mockReq;
	let mockRes;

	beforeEach(() => {
		mockReq = {
			path: '/groups/test1',
			body: {
				name: 'test1',
			},
		};

		mockRes = {
			status: jest.fn(() => mockRes),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'refreshed token',
			},
		};

		verifyAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized' }));

		Group.deleteMany.mockImplementation(
			() => new Promise((resolve) => resolve({ deletedCount: 1 }))
		);
	});

	test('should return 401 if not authorized', async () => {
		verifyAuth.mockImplementation(() => ({ authorized: false, cause: 'Unauthorized' }));

		await deleteGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if group name is not provided', async () => {
		mockReq.body.name = undefined;

		await deleteGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if group name is an empty string', async () => {
		mockReq.body.name = '';

		await deleteGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if group does not exist', async () => {
		Group.deleteMany.mockImplementation(
			() => new Promise((resolve) => resolve({ deletedCount: 0 }))
		);

		await deleteGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 500 if there is database error', async () => {
		Group.deleteMany.mockImplementation(() => {
			throw new Error('Database error');
		});

		await deleteGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return a message if group is deleted', async () => {
		await deleteGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					message: expect.any(String),
				}),
				refreshedTokenMessage: expect.any(String),
			})
		);
	});
});
