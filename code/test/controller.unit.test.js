import request from 'supertest';
import { app } from '../app';
import { categories, transactions } from '../models/model';
import { User, Group } from '../models/User';
import { verifyAuth, verifyMultipleAuth } from '../controllers/utils';
import {
	createCategory,
	updateCategory,
	deleteCategory,
	getCategories,
	createTransaction,
	getAllTransactions,
	getTransactionsByUser,
	getTransactionsByUserByCategory,
	getTransactionsByGroup,
	getTransactionsByGroupByCategory,
	deleteTransaction,
	deleteTransactions,
} from '../controllers/controller';

jest.mock('../models/model');
jest.mock('../controllers/utils');
jest.mock('../models/User');

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
	jest.clearAllMocks();
});

//OK
describe('createCategory', () => {
	test('should create new category', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		const mockCategory = {
			type: 'test',
			color: '#fcbe44',
		};

		categories.findOne.mockResolvedValue(null);
		categories.prototype.save.mockResolvedValue(mockCategory);

		mockReq.body = mockCategory;

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					type: expect.any(String),
					color: expect.any(String),
				}),
				refreshedTokenMessage: expect.any(String),
			})
		);
	});

	test('should return 401 if not authorized', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: false,
			cause: 'Unauthorized',
		}));

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 500 if there is database error', async () => {
		mockReq.body = {
			type: 'test',
			color: '#fcbe44',
		};
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.findOne.mockImplementation(() => {
			throw new Error('Database error');
		});

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if category already exists', async () => {
		mockReq.body = {
			type: 'test',
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.findOne.mockResolvedValue(mockReq.body);

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if category type is not provided', async () => {
		mockReq.body = {
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if category color is not provided', async () => {
		mockReq.body = {
			type: 'test',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if category type is empty', async () => {
		mockReq.body = {
			type: '',
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if category color is empty', async () => {
		mockReq.body = {
			type: 'test',
			color: '',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should throw error if category is not saved correctly', async () => {
		mockReq.body = {
			type: 'test',
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.findOne.mockResolvedValue(null);
		categories.prototype.save.mockImplementation(() => {
			throw new Error('Database error');
		});

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});
});

//OK
describe('updateCategory', () => {
	test('should return 401 if not authorized', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: false,
			cause: 'Unauthorized',
		}));

		await updateCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if category type is empty', async () => {
		mockReq.body = {
			type: '',
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		await updateCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if category color is empty', async () => {
		mockReq.body = {
			type: 'test',
			color: '',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		await updateCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if param category does not exist', async () => {
		mockReq.params = {
			type: 'test',
		};

		mockReq.body = {
			type: 'test1',
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.findOne.mockResolvedValue(null);

		await updateCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Category does not exist',
		});
	});
	test('should return 400 if body category already exists', async () => {
		mockReq.params = {
			type: 'test',
		};

		mockReq.body = {
			type: 'test1',
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.findOne
			.mockResolvedValue(null)
			.mockResolvedValueOnce(mockReq.params.type)
			.mockResolvedValueOnce(mockReq.body.type);

		categories.find.mockResolvedValue(mockReq.params.type);

		await updateCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Category already exists',
		});
	});

	test('should throw error if category is not updated correctly', async () => {
		mockReq.params = {
			type: 'test',
		};

		mockReq.body = {
			type: 'test1',
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.findOne
			.mockResolvedValue(null)
			.mockResolvedValueOnce(mockReq.params.type)
			.mockResolvedValueOnce(null);

		transactions.find.mockResolvedValue(mockReq.params.type);
		const spy = jest.spyOn(transactions, 'updateMany');
		spy.mockImplementation(() => {
			throw new Error('Database error');
		});

		await updateCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 200 if category is updated correctly', async () => {
		mockReq.params = {
			type: 'test',
		};

		mockReq.body = {
			type: 'test1',
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		const mockCategory = {
			type: 'testtype',
			color: '#ffffff',
		};

		const mockTransactions = [
			{
				type: 'testtype',
				amount: 100,
			},
			{
				type: 'testtype',
				amount: 200,
			},
		];

		categories.findOne
			.mockResolvedValue(null)
			.mockResolvedValueOnce(mockReq.params.type)
			.mockResolvedValueOnce(null);

		transactions.find.mockImplementationOnce(() => mockTransactions);
		const spy = jest.spyOn(transactions, 'updateMany');
		const spyCat = jest.spyOn(categories, 'updateOne');
		spy.mockResolvedValue(mockTransactions);
		spyCat.mockResolvedValue(mockCategory);

		await updateCategory(mockReq, mockRes);

		expect(transactions.find).toHaveBeenCalledWith({
			type: mockReq.params.type,
		});

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: {
				message: 'Category edited successfully',
				count: 2,
			},
			refreshedTokenMessage: 'refreshed token',
		});
	});
});

//OK
describe('deleteCategory', () => {
	test('should return 401 if user is not authorized', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: false,
			cause: 'Not authorized',
		}));

		await deleteCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not authorized' });
	});

	test('should return 400 if types is missing', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		await deleteCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing parameters' });
	});

	test('should return 400 if only one category remaining', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		mockReq.body.types = ['test'];

		categories.find.mockResolvedValue([{ type: 'test' }]);

		await deleteCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Only one category remaining!',
		});
	});

	test('should return 400 if category does not exist', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		mockReq.body.types = ['test'];

		categories.find.mockResolvedValue([{ type: 'test1' }, { type: 'test2' }]);
		categories.findOne.mockResolvedValue(null);

		await deleteCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Category does not exist',
		});
	});

	test('should delete category and update transactions', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		mockReq.body.types = ['test'];

		const mockCategory = {
			type: 'test',
			remove: jest.fn(),
		};

		const mockTransactions = [
			{
				type: 'test',
				amount: 100,
			},
			{
				type: 'test',
				amount: 200,
			},
		];

		categories.find.mockResolvedValue([{ type: 'test' }]);
		categories.findOne.mockResolvedValue(mockCategory);

		transactions.find.mockResolvedValue(mockTransactions);

		await deleteCategory(mockReq, mockRes);

		expect(transactions.updateMany).toHaveBeenCalledWith(
			{ type: 'test' },
			{ $set: { type: 'investment' } }
		);

		expect(mockCategory.remove).toHaveBeenCalled();

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: {
				message: 'Categories deleted',
				count: mockTransactions.length,
			},
			refreshedTokenMessage: mockRes.locals.refreshedTokenMessage,
		});
	});

	test('should return 500 if an error occurs', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		mockReq.body.types = ['test'];

		categories.find.mockRejectedValue(new Error('Database error'));

		await deleteCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
	});
});

//OK
describe('getCategories', () => {
	test('should return 401 if not authorised', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: false,
			cause: 'Unauthorized',
		}));

		await getCategories(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: expect.any(String),
		});
	});

	test('should return 500 if there is database error', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.find.mockImplementation(() => {
			throw new Error('Database error');
		});

		await getCategories(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: expect.any(String),
		});
	});

	test('should return empty list if there are no categories', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.find.mockImplementation(() => []);

		await getCategories(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: [],
			refreshedTokenMessage: 'refreshed token',
		});
	});

	test('should return list of categories', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		let mockCategories = [
			{
				type: 'investment',
				color: '#fcbe44',
			},
			{
				type: 'income',
				color: '#44fcbe',
			},
		];

		categories.find.mockImplementation(() => mockCategories);

		await getCategories(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.arrayContaining([
					expect.objectContaining({
						type: expect.any(String),
						color: expect.any(String),
					}),
				]),
				refreshedTokenMessage: expect.any(String),
			})
		);
	});
});

//OK
describe('createTransaction', () => {
	test('should return 401 if user is not authorized', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: false,
			cause: 'Not authorized',
		}));

		await createTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not authorized' });
	});

	test('should return 400 if category does not exist', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.findOne.mockResolvedValueOnce(null);

		await createTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Category does not exist',
		});
	});

	test('should return 400 if user does not exist', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		const mockCategory = {
			_id: '5f9d5c6b2c3b3e1d7c9b4b1a',
			type: 'test',
			color: '#fcbe44',
			__v: 0,
		};

		categories.findOne.mockResolvedValueOnce(mockCategory);
		User.findOne.mockResolvedValueOnce(null);

		await createTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'User does not exist' });
	});

	test('should return 500 if there is database error', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		const mockCategory = {
			_id: '5f9d5c6b2c3b3e1d7c9b4b1a',
			type: 'test',
			color: '#fcbe44',
			__v: 0,
		};

		const mockUser = {
			_id: '5f9d5c6b2c3b3e1d7c9b4b1a',
			username: 'testuser',
			password: 'testpassword',
			__v: 0,
		};

		categories.findOne.mockResolvedValueOnce(mockCategory);
		User.findOne.mockResolvedValueOnce(mockUser);

		transactions.create.mockImplementation(() => {
			throw new Error('Database error');
		});

		await createTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: expect.any(String),
		});
	});

	test('should create transaction and return data', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		const mockCategory = {
			_id: '5f9d5c6b2c3b3e1d7c9b4b1a',
			type: 'test',
			color: '#fcbe44',
			__v: 0,
		};

		const mockUser = {
			_id: '5f9d5c6b2c3b3e1d7c9b4b1a',
			username: 'testuser',
			password: 'testpassword',
			__v: 0,
		};

		categories.findOne.mockResolvedValueOnce(mockCategory);
		User.findOne.mockResolvedValueOnce(mockUser);

		const mockTransaction = {
			username: 'testuser',
			amount: 100,
			type: 'testtype',
			date: new Date(),
		};

		transactions.prototype.save.mockResolvedValueOnce(mockTransaction);

		await createTransaction(mockReq, mockRes);

		expect(transactions.prototype.save).toHaveBeenCalled();

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: {
				username: 'testuser',
				amount: 100,
				type: 'testtype',
				date: mockTransaction.date,
			},
			refreshedTokenMessage: 'refreshed token',
		});
	});
});

//OK
describe('getAllTransactions', () => {
	test('should return 401 if not authorised', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: false,
			cause: 'Unauthorized',
		}));

		await getAllTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: expect.any(String),
		});
	});

	test('should return 500 if there is database error', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		transactions.aggregate.mockImplementation(() => {
			throw new Error('Database error');
		});

		await getAllTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: expect.any(String),
		});
	});

	test('should return empty list if there are no transactions', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		const spy = jest.spyOn(transactions, 'aggregate');

		spy.mockResolvedValue([]);

		await getAllTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: [],
			refreshedTokenMessage: 'refreshed token',
		});
	});

	test('should return list of transactions', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		const mockResult = [
			{
				username: 'test',
				amount: 100,
				type: 'investment',
				date: '2021-01-01',
				joinedData: {
					color: '#fcbe44',
				},
			},
			{
				username: 'test',
				amount: 100,
				type: 'income',
				date: '2021-01-01',
				joinedData: {
					color: '#44fcbe',
				},
			},
		];

		transactions.aggregate.mockResolvedValue(mockResult);

		await getAllTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.arrayContaining([
					expect.objectContaining({
						username: expect.any(String),
						amount: expect.any(Number),
						type: expect.any(String),
						date: expect.any(String),
						color: expect.any(String),
					}),
				]),
				refreshedTokenMessage: expect.any(String),
			})
		);
	});
});

//OK
describe('getTransactionsByUser', () => {
	describe('Admin access', () => {
		beforeEach(() => {
			mockReq.url = '/transactions/users/test';
		});

		test('should return 401 if user is not authorized', async () => {
			mockReq.params.username = 'test';

			const mockUser = {
				_id: '5f9d5c6b2c3b3e1d7c9b4b1a',
				username: 'testuser',
				password: 'testpassword',
				__v: 0,
			};

			User.findOne.mockResolvedValue(mockUser);

			verifyAuth.mockImplementation(() => ({
				authorized: false,
				cause: 'Not authorized',
			}));

			await getTransactionsByUser(mockReq, mockRes);

			expect(mockRes.status).toHaveBeenCalledWith(401);
			expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not authorized' });
		});

		test('should return 400 if username is missing', async () => {
			mockReq.params = {};

			await getTransactionsByUser(mockReq, mockRes);

			expect(mockRes.status).toHaveBeenCalledWith(400);
			expect(mockRes.json).toHaveBeenCalledWith({
				error: 'Missing parameters',
			});
		});

		test('should return 400 if user does not exist', async () => {
			mockReq.params = { username: 'test' };
			User.findOne.mockResolvedValue(null);

			await getTransactionsByUser(mockReq, mockRes);

			expect(mockRes.status).toHaveBeenCalledWith(400);
			expect(mockRes.json).toHaveBeenCalledWith({
				error: 'User does not exist',
			});
		});

		test('should return transactions for user', async () => {
			verifyAuth.mockImplementation(() => ({
				authorized: true,
				cause: 'Authorized',
			}));
			mockReq.params.username = 'test';
			User.findOne.mockResolvedValue({ username: 'test' });
			transactions.aggregate.mockResolvedValue([
				{
					username: 'test',
					amount: 100,
					type: 'income',
					date: new Date(),
					joinedData: { color: 'green' },
				},
			]);

			await getTransactionsByUser(mockReq, mockRes);

			expect(transactions.aggregate).toHaveBeenCalledWith([
				{
					$lookup: {
						from: 'categories',
						localField: 'type',
						foreignField: 'type',
						as: 'joinedData',
					},
				},
				{
					$unwind: '$joinedData',
				},
				{
					$match: {
						username: 'test',
					},
				},
			]);

			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalledWith({
				data: [
					{
						username: 'test',
						amount: 100,
						type: 'income',
						date: expect.any(Date),
						color: 'green',
					},
				],
				refreshedTokenMessage: mockRes.locals.refreshedTokenMessage,
			});
		});

		test('should return empty list if user has no transactions', async () => {
			verifyAuth.mockImplementation(() => ({
				authorized: true,
				cause: 'Authorized',
			}));
			mockReq.params.username = 'test';
			User.findOne.mockResolvedValue({ username: 'test' });
			transactions.aggregate.mockResolvedValue([]);

			await getTransactionsByUser(mockReq, mockRes);

			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalledWith({
				data: [],
				refreshedTokenMessage: mockRes.locals.refreshedTokenMessage,
			});
		});
	});

	describe('User access', () => {
		beforeEach(() => {
			mockReq.url = '/transactions';
		});

		test('should return 401 if user is not authorized', async () => {
			mockReq.params.username = 'test';

			const mockUser = {
				_id: '5f9d5c6b2c3b3e1d7c9b4b1a',
				username: 'testuser',
				password: 'testpassword',
				__v: 0,
			};

			User.findOne.mockResolvedValue(mockUser);
			verifyAuth.mockImplementation(() => ({
				authorized: false,
				cause: 'Not authorized',
			}));

			await getTransactionsByUser(mockReq, mockRes);

			expect(mockRes.status).toHaveBeenCalledWith(401);
			expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not authorized' });
		});

		test('should return transactions for user with filters', async () => {
			mockReq.params.username = 'test';

			const mockUser = {
				_id: '5f9d5c6b2c3b3e1d7c9b4b1a',
				username: 'testuser',
				password: 'testpassword',
				__v: 0,
			};

			User.findOne.mockResolvedValue(mockUser);

			verifyAuth.mockImplementation(() => ({
				authorized: true,
				cause: 'Authorized',
			}));

			mockReq.query = {
				from: '2022-01-01',
				upTo: '2022-01-31',
				min: 100,
				max: 500,
			};

			transactions.find.mockResolvedValue([
				{
					username: 'test',
					amount: 100,
					type: 'income',
					date: new Date(),
				},
			]);

			categories.find.mockResolvedValue([{ type: 'income', color: 'green' }]);

			await getTransactionsByUser(mockReq, mockRes);

			expect(categories.find).toHaveBeenCalled();

			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalledWith({
				data: expect.any(Array),
				refreshedTokenMessage: mockRes.locals.refreshedTokenMessage,
			});
		});

		test('should return transactions for user without filters', async () => {
			mockReq.params.username = 'test';
			transactions.aggregate.mockResolvedValue([
				{
					username: 'test',
					amount: 100,
					type: 'income',
					date: new Date(),
					joinedData: { color: 'green' },
				},
			]);

			await getTransactionsByUser(mockReq, mockRes);

			expect(transactions.aggregate).toHaveBeenCalledWith([
				{
					$lookup: {
						from: 'categories',
						localField: 'type',
						foreignField: 'type',
						as: 'joinedData',
					},
				},
				{
					$unwind: '$joinedData',
				},
				{
					$match: {
						username: 'test',
					},
				},
			]);

			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalledWith({
				data: [
					{
						username: 'test',
						amount: 100,
						type: 'income',
						date: expect.any(Date),
						color: 'green',
					},
				],
				refreshedTokenMessage: mockRes.locals.refreshedTokenMessage,
			});
		});

		test('should return 500 if an error occurs', async () => {
			mockReq.params.username = 'test';

			User.findOne.mockImplementation(() => {
				throw new Error('Database error');
			});

			verifyAuth.mockImplementation(() => ({
				authorized: true,
				cause: 'Authorized',
			}));

			await getTransactionsByUser(mockReq, mockRes);

			expect(mockRes.status).toHaveBeenCalledWith(500);
			expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
		});

		test('should return empty list if user has no transactions', async () => {
			verifyAuth.mockImplementation(() => ({
				authorized: true,
				cause: 'Authorized',
			}));
			mockReq.params.username = 'test';
			User.findOne.mockResolvedValue({ username: 'test' });
			transactions.aggregate.mockResolvedValue([]);

			await getTransactionsByUser(mockReq, mockRes);

			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalledWith({
				data: [],
				refreshedTokenMessage: mockRes.locals.refreshedTokenMessage,
			});
		});
	});
});

describe('getTransactionsByUserByCategory', () => {
	test('should return 401 if user is not authorized', async () => {
		mockReq.params.username = 'test';
		mockReq.params.category = 'income';
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: false,
			cause: 'Not authorized',
		}));

		await getTransactionsByUserByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not authorized' });
	});

	test('should return 400 if username is missing', async () => {
		mockReq.params = { category: 'income' };
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));
		await getTransactionsByUserByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'missing parameters',
		});
	});

	test('should return 400 if type is missing', async () => {
		mockReq.params = { username: 'test' };

		await getTransactionsByUserByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'missing parameters',
		});
	});

	test('should return 400 if user does not exist', async () => {
		mockReq.params = { username: 'test', category: 'income' };
		await User.findOne.mockResolvedValue(null);
		await categories.findOne.mockResolvedValue({
			type: 'income',
			color: 'green',
		});

		await getTransactionsByUserByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'User does not exist',
		});
	});

	test('should return 400 if type does not exist', async () => {
		mockReq.params = { username: 'test', category: 'income' };
		User.findOne.mockResolvedValue({ username: 'test' });
		categories.findOne.mockResolvedValue(null);

		await getTransactionsByUserByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Category does not exist',
		});
	});

	test('should return transactions for user', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));
		mockReq.params = { username: 'test', category: 'income' };
		User.findOne.mockResolvedValue({ username: 'test' });
		categories.findOne.mockResolvedValue({ type: 'income', color: 'green' });
		transactions.aggregate.mockResolvedValue([
			{
				username: 'test',
				amount: 100,
				type: 'income',
				date: new Date(),
				joinedData: { color: 'green' },
			},
		]);

		await getTransactionsByUserByCategory(mockReq, mockRes);

		expect(transactions.aggregate).toHaveBeenCalledWith([
			{
				$lookup: {
					from: 'categories',
					localField: 'type',
					foreignField: 'type',
					as: 'joinedData',
				},
			},
			{
				$unwind: '$joinedData',
			},
			{
				$match: {
					'joinedData.type': 'income',
					username: 'test',
				},
			},
		]);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: [
				{
					username: 'test',
					amount: 100,
					type: 'income',
					date: expect.any(Date),
					color: 'green',
				},
			],
			refreshedTokenMessage: mockRes.locals.refreshedTokenMessage,
		});
	});

	test('should return 500 if an error occurs', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));
		mockReq.params = { username: 'test', category: 'income' };
		User.findOne.mockImplementation(() => {
			throw new Error('Database error');
		});
		categories.findOne.mockResolvedValue({ type: 'income', color: 'green' });

		await getTransactionsByUserByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
	});

	test('should return empty list if user has no transactions', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));
		mockReq.params = { username: 'test', category: 'income' };
		User.findOne.mockResolvedValue({ username: 'test' });
		categories.findOne.mockResolvedValue({ type: 'income', color: 'green' });
		transactions.aggregate.mockResolvedValue([]);

		await getTransactionsByUserByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: [],
			refreshedTokenMessage: mockRes.locals.refreshedTokenMessage,
		});
	});
});

describe('getTransactionsByGroup', () => {
	
	test('should return 401 if user is not authorized', async () => {
		mockReq.params.name = 'testGroup';
		Group.findOne.mockResolvedValue( {name: "testGroup", memberEmails: ["test1@example.com", "test2@example.com"]});

		await getTransactionsByGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not authorized' });
	});


	test('should return 400 if group name is missing', async () => {
		mockReq.params = {};

	

		await getTransactionsByGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'missing parameters',
		});
	});


	test('should return 400 if Group does not exist', async () => {
		mockReq.params = { name: 'test'};
		Group.findOne.mockResolvedValue({ name: 'test' });
		categories.findOne.mockResolvedValue(null);


		await getTransactionsByGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Group not found',
		});
	});

	test('should return transactions for user', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));
		mockReq.params = { username: 'test', category: 'income' };
		User.findOne.mockResolvedValue({ username: 'test' });
		categories.findOne.mockResolvedValue({type: 'income', color: 'green' });
		transactions.aggregate.mockResolvedValue([
			{
				username: 'test',
				amount: 100,
				type: 'income',
				date: new Date(),
				joinedData: { color: 'green' },
			},
		]);

		await getTransactionsByGroup(mockReq, mockRes);

		expect(transactions.aggregate).toHaveBeenCalledWith([
			{
				$lookup: {
					from: 'categories',
					localField: 'type',
					foreignField: 'type',
					as: 'joinedData',
				},
			},
			{
				$unwind: '$joinedData',
			},
			{
				$match: {
					'joinedData.type': 'income',
					username: 'test',
				},
			},
		]);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: [
				{
					username: 'test',
					amount: 100,
					type: 'income',
					date: expect.any(Date),
					color: 'green',
				},
			],
			refreshedTokenMessage: mockRes.locals.refreshedTokenMessage,
		});

	});	
	
	test('should return 500 if an error occurs', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));
		mockReq.params = { username: 'test', category: 'income' };
		User.findOne.mockImplementation(() => {
			throw new Error('Database error');
		});			
		categories.findOne.mockResolvedValue({type: 'income', color: 'green' });

		

		

		await getTransactionsByGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
	});

	test('should return empty list if user has no transactions', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));
		mockReq.params = { username: 'test', category: 'income' };
		User.findOne.mockResolvedValue({ username: 'test' });			
		categories.findOne.mockResolvedValue({type: 'income', color: 'green' });
		transactions.aggregate.mockResolvedValue([]);

		await getTransactionsByGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: [],
			refreshedTokenMessage: mockRes.locals.refreshedTokenMessage,
		});
	});

});

describe('getTransactionsByGroupByCategory', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

//OK
describe('deleteTransaction', () => {
	test('should return 401 if user is not authorized', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: false,
			cause: 'Not authorized',
		}));

		await deleteTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not authorized' });
	});

	test('should return 400 if id is missing', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		await deleteTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing parameters' });
	});

	test('should return 400 if user does not exist', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		mockReq.params.username = 'test';
		mockReq.body._id = 'test';

		User.findOne.mockResolvedValue(null);

		await deleteTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'User does not exist' });
	});

	test('should return 400 if transaction does not exist', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		mockReq.params.username = 'test';
		mockReq.body._id = 'test';

		User.findOne.mockResolvedValue({});
		transactions.findOne.mockResolvedValue(null);

		await deleteTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Transaction not found.',
		});
	});

	test('should delete transaction', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		mockReq.params.username = 'test';
		mockReq.body._id = 'test';

		const mockTransaction = {
			_id: 'test',
		};

		User.findOne.mockResolvedValue({});
		transactions.findOne.mockResolvedValue(mockTransaction);
		transactions.deleteOne.mockResolvedValue({});

		await deleteTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: { message: 'Transaction deleted' },
			refreshedTokenMessage: mockRes.locals.refreshedTokenMessage,
		});
	});

	test('should return 500 if an error occurs', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		mockReq.params.username = 'test';
		mockReq.body._id = 'test';

		User.findOne.mockImplementation(() => {
			throw new Error('Database error');
		});

		await deleteTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
	});
});

//OK
describe('deleteTransactions', () => {
	test('should return 401 if user is not authorized', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: false,
			cause: 'Not authorized',
		}));

		await deleteTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not authorized' });
	});

	test('should return 400 if id list is missing', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		await deleteTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing parameters' });
	});

	test('should return 400 if id list is empty', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		mockReq.body._ids = [];

		await deleteTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing parameters' });
	});

	test('should return 400 if any id is empty', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		mockReq.body._ids = ['test', ''];

		await deleteTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Empty parameter' });
	});

	test('should return 400 if any id is not found', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		mockReq.body._ids = ['test1', 'test2'];

		transactions.find.mockResolvedValue([{ _id: 'test1' }]);

		await deleteTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Transaction not found',
		});
	});

	test('should return 400 if an error occurs', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		mockReq.body._ids = ['test1', 'test2'];

		transactions.find.mockRejectedValue(new Error('Database error'));

		await deleteTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Transactions not found',
		});
	});

	test('should delete transactions', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		mockReq.body._ids = ['test1', 'test2'];

		transactions.find.mockResolvedValue([{ _id: 'test1' }, { _id: 'test2' }]);
		transactions.deleteMany.mockResolvedValue({});

		await deleteTransactions(mockReq, mockRes);

		expect(transactions.deleteMany).toHaveBeenCalledWith({
			_id: { $in: ['test1', 'test2'] },
		});

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: { message: 'Transactions deleted successfully' },
			refreshedTokenMessage: mockRes.locals.refreshedTokenMessage,
		});
	});
});
